import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import TurndownService from "turndown";
import {
  collectionRepository,
  historyRepository,
  itemRepository,
} from "@/server/db/repository";
import { assertFound, parseId, ServiceError } from "../utils";
import {
  fetchAttachment,
  fetchEpicBacklogIds,
  fetchProjects,
  fetchTeams,
  fetchWorkItemsBatch,
  getAzureDefaults,
  isAzureAttachmentUrl,
  resolveAzureAuth,
  type AzureAuth,
} from "./client";
import type {
  AzureProject,
  AzureTeam,
  AzureWorkItemNode,
  ImportUserStoriesResult,
} from "./types";

interface BatchItem {
  id: number;
  fields?: Record<string, unknown>;
}

function field(item: BatchItem, key: string): string | null {
  const value = item.fields?.[key];
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function toNode(item: BatchItem, hasChildren: boolean): AzureWorkItemNode {
  return {
    id: item.id,
    title: field(item, "System.Title") ?? `#${item.id}`,
    state: field(item, "System.State"),
    type: field(item, "System.WorkItemType") ?? "",
    hasChildren,
  };
}

/** Order batch results to match the requested id order (batch responses are unordered). */
function orderByIds<T extends { item: { id: number } }>(
  results: T[],
  ids: number[],
): T[] {
  const byId = new Map(results.map((r) => [r.item.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is T => r != null);
}

function sanitizeFileName(title: string): string {
  return title
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function requireProject(project: string): string {
  const trimmed = project?.trim();
  if (!trimmed) {
    throw new ServiceError("A project is required", "VALIDATION");
  }
  return trimmed;
}

function requireTeam(team: string): string {
  const trimmed = team?.trim();
  if (!trimmed) {
    throw new ServiceError("A team is required", "VALIDATION");
  }
  return trimmed;
}

/** Matches the `src` of an <img> tag, capturing (prefix)(quote)(url). */
const IMG_SRC_RE = /(<img\b[^>]*?\bsrc=)(["'])(.*?)\2/gi;

/** Where imported images are written and the public path they're served from. */
const IMAGE_DIR = path.join(process.cwd(), "public", "azure-imports");
const IMAGE_URL_BASE = "/azure-imports";

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/x-icon": "ico",
};

/**
 * Stable, collision-free filename for an attachment: the Azure attachment guid
 * (last path segment) when available, else a hash of the URL, plus an extension
 * derived from the content type. Same image URL → same file (dedupes re-imports).
 */
function attachmentFileName(url: string, contentType: string): string {
  let base = "";
  try {
    base = (new URL(url).pathname.split("/").filter(Boolean).pop() ?? "").replace(
      /[^a-zA-Z0-9-]/g,
      "",
    );
  } catch {
    base = "";
  }
  if (!base) base = createHash("sha1").update(url).digest("hex");
  const ext = EXT_BY_CONTENT_TYPE[contentType.toLowerCase()] ?? "png";
  return `${base}.${ext}`;
}

/** Decode the handful of HTML entities Azure puts in attribute URLs (e.g. &amp;). */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export class AzureService {
  private turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  /** All projects in the org, with the env default (if any) listed first. */
  async listProjects(): Promise<AzureProject[]> {
    const auth = await resolveAzureAuth();
    const projects = await fetchProjects(auth);
    projects.sort((a, b) => a.name.localeCompare(b.name));

    const { project: defaultProject } = getAzureDefaults();
    if (defaultProject) {
      const idx = projects.findIndex((p) => p.name === defaultProject);
      if (idx > 0) projects.unshift(projects.splice(idx, 1)[0]);
    }
    return projects;
  }

  /** Teams in a project, with the env default (AZURE_TEAM, if any) listed first. */
  async listTeams(project: string): Promise<AzureTeam[]> {
    const auth = await resolveAzureAuth();
    const proj = requireProject(project);

    const teams = await fetchTeams(auth, proj);
    teams.sort((a, b) => a.name.localeCompare(b.name));

    const { team: defaultTeam } = getAzureDefaults();
    if (defaultTeam) {
      const idx = teams.findIndex((t) => t.name === defaultTeam);
      if (idx > 0) teams.unshift(teams.splice(idx, 1)[0]);
    }
    return teams;
  }

  /** Root rows of the Epics backlog for a project's team. */
  async listEpics(project: string, team: string): Promise<AzureWorkItemNode[]> {
    const auth = await resolveAzureAuth();
    const proj = requireProject(project);
    const tm = requireTeam(team);

    const ids = await fetchEpicBacklogIds(auth, proj, tm);
    const results = await fetchWorkItemsBatch(auth, proj, ids, {
      expandRelations: true,
    });
    return orderByIds(results, ids).map((r) =>
      toNode(r.item, r.childIds.length > 0),
    );
  }

  /** Children (Hierarchy-Forward) of a work item — Features under an Epic, Stories under a Feature. */
  async listChildren(
    project: string,
    parentId: number,
  ): Promise<AzureWorkItemNode[]> {
    const auth = await resolveAzureAuth();
    const proj = requireProject(project);

    const [parent] = await fetchWorkItemsBatch(auth, proj, [parentId], {
      expandRelations: true,
    });
    const childIds = parent?.childIds ?? [];
    if (childIds.length === 0) return [];

    const results = await fetchWorkItemsBatch(auth, proj, childIds, {
      expandRelations: true,
    });
    return orderByIds(results, childIds).map((r) =>
      toNode(r.item, r.childIds.length > 0),
    );
  }

  /**
   * Download an Azure attachment with the PAT, write it under
   * `public/azure-imports/`, and return its public URL (e.g. `/azure-imports/<guid>.png`).
   * Returns null when the fetch fails so the caller keeps the original URL.
   */
  private async storeAzureImage(
    auth: AzureAuth,
    url: string,
  ): Promise<string | null> {
    const attachment = await fetchAttachment(auth, url);
    if (!attachment) return null;

    const fileName = attachmentFileName(url, attachment.contentType);
    await mkdir(IMAGE_DIR, { recursive: true });
    // Overwriting is fine: the filename is content-addressed by attachment id.
    await writeFile(path.join(IMAGE_DIR, fileName), attachment.bytes);
    return `${IMAGE_URL_BASE}/${fileName}`;
  }

  /**
   * Replace Azure-hosted <img> sources in a description with local public URLs,
   * downloading each image (with the PAT) to `public/azure-imports/` so it
   * renders in the editor without auth. Non-Azure or un-fetchable images keep
   * their original URL.
   */
  private async inlineAzureImages(
    auth: AzureAuth,
    html: string,
  ): Promise<string> {
    if (!html.includes("<img")) return html;

    const urls = new Set<string>();
    for (const m of html.matchAll(IMG_SRC_RE)) {
      const url = decodeHtmlEntities(m[3]);
      if (isAzureAttachmentUrl(url)) urls.add(url);
    }
    if (urls.size === 0) return html;

    const publicUrlByUrl = new Map<string, string>();
    await Promise.all(
      [...urls].map(async (url) => {
        const publicUrl = await this.storeAzureImage(auth, url);
        if (publicUrl) publicUrlByUrl.set(url, publicUrl);
      }),
    );
    if (publicUrlByUrl.size === 0) return html;

    return html.replace(IMG_SRC_RE, (full, pre, quote, src) => {
      const publicUrl = publicUrlByUrl.get(decodeHtmlEntities(src));
      return publicUrl ? `${pre}${quote}${publicUrl}${quote}` : full;
    });
  }

  /**
   * Import the given user-story work items into a collection as Markdown files.
   * Converts `System.Description` HTML to Markdown (downloading Azure images to
   * `public/azure-imports/` and linking them) and skips stories already
   * imported (a file prefixed `US-<id> ` already exists in the collection).
   */
  async importUserStories(
    collectionId: string,
    project: string,
    workItemIds: number[],
  ): Promise<ImportUserStoriesResult> {
    const numericCollectionId = parseId(collectionId);
    if (numericCollectionId == null) {
      throw new ServiceError("Invalid collection id", "VALIDATION");
    }
    const proj = requireProject(project);

    const collection = await collectionRepository.findById(numericCollectionId);
    assertFound(collection, "Collection not found");

    const ids = [...new Set(workItemIds)].filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) {
      return { imported: 0, skipped: 0, createdNames: [] };
    }

    const auth = await resolveAzureAuth();
    const results = await fetchWorkItemsBatch(auth, proj, ids, {
      fields: ["System.Id", "System.Title", "System.Description"],
    });
    const ordered = orderByIds(results, ids).map((r) => r.item);

    const existing = await itemRepository.findByCollectionId(numericCollectionId);

    const createdNames: string[] = [];
    let skipped = 0;

    for (const item of ordered) {
      const prefix = `US-${item.id} `;
      if (existing.some((e) => e.name.startsWith(prefix))) {
        skipped += 1;
        continue;
      }

      const title = field(item, "System.Title") ?? `#${item.id}`;
      const descriptionHtml = field(item, "System.Description") ?? "";
      const html = descriptionHtml
        ? await this.inlineAzureImages(auth, descriptionHtml)
        : "";
      const bodyMd = html ? this.turndown.turndown(html) : "";
      const content = `# ${title}\n\n${bodyMd}`.trimEnd() + "\n";
      const name = `${prefix}${sanitizeFileName(title)}.md`;

      const created = await itemRepository.create({
        collectionId: numericCollectionId,
        folderId: null,
        type: "file",
        name,
        content,
      });
      const row = assertFound(created, "Failed to create file");
      await historyRepository.create({ itemId: row.id, content });
      createdNames.push(name);
    }

    return { imported: createdNames.length, skipped, createdNames };
  }
}

export const azureService = new AzureService();
