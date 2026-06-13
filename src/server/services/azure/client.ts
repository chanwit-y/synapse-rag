import { apiKeyRepository } from "@/server/db/repository";
import { ServiceError } from "../utils";

const API_WIT = "7.1";
const API_CORE = "7.0";

export interface AzureAuth {
  pat: string;
  org: string;
}

/**
 * Resolve Azure auth: the org comes from env (`AZURE_ORG`, not a secret), the
 * PAT from the single active `azure-devops` API key in the database (managed in
 * Settings → API Keys). If several are active, the most-recently-updated wins.
 */
export async function resolveAzureAuth(): Promise<AzureAuth> {
  const org = process.env.AZURE_ORG?.trim();
  if (!org) {
    throw new ServiceError(
      "Azure DevOps is not configured. Set AZURE_ORG.",
      "DEPENDENCY",
    );
  }

  const [key] = await apiKeyRepository.findActiveByProvider("azure-devops");
  const pat = key?.keyValue?.trim();
  if (!pat) {
    throw new ServiceError(
      "No active Azure DevOps API key. Add one in Settings → API Keys.",
      "DEPENDENCY",
    );
  }

  return { pat, org };
}

/** Optional env defaults: a preferred project/team to pre-select. */
export function getAzureDefaults(): { project?: string; team?: string } {
  return {
    project: process.env.AZURE_PROJECT?.trim() || undefined,
    team: process.env.AZURE_TEAM?.trim() || undefined,
  };
}

function authHeader(pat: string): string {
  // Azure DevOps Basic auth uses an empty username and the PAT as password.
  return `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
}

async function azureFetch<T>(
  auth: AzureAuth,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: authHeader(auth.pat),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ServiceError(
      `Azure DevOps request failed (${res.status}): ${body.slice(0, 300)}`,
      res.status === 401 || res.status === 403 ? "DEPENDENCY" : "VALIDATION",
    );
  }
  return (await res.json()) as T;
}

/** True for Azure-hosted attachment URLs we may fetch with the PAT. */
export function isAzureAttachmentUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "dev.azure.com" ||
      host === "visualstudio.com" ||
      host.endsWith(".visualstudio.com")
    );
  } catch {
    return false;
  }
}

export interface AzureAttachment {
  contentType: string;
  bytes: Buffer;
}

/**
 * Download an Azure attachment (e.g. an inline image) using the PAT. Returns
 * null on error, non-image content, or when it exceeds `maxBytes`, so the
 * caller can fall back to leaving the original URL.
 */
export async function fetchAttachment(
  auth: AzureAuth,
  url: string,
  maxBytes = 10 * 1024 * 1024,
): Promise<AzureAttachment | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: authHeader(auth.pat) },
    });
    if (!res.ok) return null;

    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    if (!contentType.startsWith("image/")) return null;

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) return null;

    return { contentType, bytes };
  } catch {
    return null;
  }
}

const HIERARCHY_FORWARD = "System.LinkTypes.Hierarchy-Forward";

interface WorkItemBatchItem {
  id: number;
  fields?: Record<string, unknown>;
  relations?: Array<{ rel: string; url: string }>;
}

function childIdsOf(item: WorkItemBatchItem): number[] {
  return (item.relations ?? [])
    .filter((r) => r.rel === HIERARCHY_FORWARD)
    .map((r) => Number(r.url.split("/").pop()))
    .filter((n) => Number.isInteger(n));
}

/** GET all projects in the organization. */
export async function fetchProjects(
  auth: AzureAuth,
): Promise<Array<{ id: string; name: string }>> {
  const url = `https://dev.azure.com/${auth.org}/_apis/projects?api-version=${API_CORE}`;
  const data = await azureFetch<{
    value?: Array<{ id: string; name: string }>;
  }>(auth, url);
  return (data.value ?? []).map((p) => ({ id: p.id, name: p.name }));
}

/** GET teams for a project. */
export async function fetchTeams(
  auth: AzureAuth,
  project: string,
): Promise<Array<{ id: string; name: string }>> {
  const url = `https://dev.azure.com/${auth.org}/_apis/projects/${encodeURIComponent(
    project,
  )}/teams?api-version=${API_WIT}`;
  const data = await azureFetch<{
    value?: Array<{ id: string; name: string }>;
  }>(auth, url);
  return (data.value ?? []).map((t) => ({ id: t.id, name: t.name }));
}

/** GET ids of the root rows on a team's Epics backlog. */
export async function fetchEpicBacklogIds(
  auth: AzureAuth,
  project: string,
  team: string,
): Promise<number[]> {
  const url = `https://dev.azure.com/${auth.org}/${encodeURIComponent(
    project,
  )}/${encodeURIComponent(
    team,
  )}/_apis/work/backlogs/Microsoft.EpicCategory/workItems?api-version=${API_WIT}`;

  const data = await azureFetch<{ workItems?: Array<{ target: { id: number } }> }>(
    auth,
    url,
  );
  return (data.workItems ?? []).map((w) => w.target.id);
}

/**
 * POST workitemsbatch for the given ids. Returns title/state/type plus the
 * child ids parsed from Hierarchy-Forward relations (when `expandRelations`).
 */
export async function fetchWorkItemsBatch(
  auth: AzureAuth,
  project: string,
  ids: number[],
  options?: { fields?: string[]; expandRelations?: boolean },
): Promise<Array<{ item: WorkItemBatchItem; childIds: number[] }>> {
  if (ids.length === 0) return [];

  const expandRelations = options?.expandRelations ?? false;
  // Azure rejects `fields` + `$expand` together (ConflictingParametersException).
  // When expanding relations we omit `fields` — `$expand` returns all fields anyway.
  const fields = expandRelations
    ? undefined
    : options?.fields ?? [
        "System.Id",
        "System.Title",
        "System.State",
        "System.WorkItemType",
      ];

  const url = `https://dev.azure.com/${auth.org}/${encodeURIComponent(
    project,
  )}/_apis/wit/workitemsbatch?api-version=${API_WIT}`;

  const results: Array<{ item: WorkItemBatchItem; childIds: number[] }> = [];

  // workitemsbatch accepts at most 200 ids per request.
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const data = await azureFetch<{ value?: WorkItemBatchItem[] }>(auth, url, {
      method: "POST",
      body: JSON.stringify({
        ids: chunk,
        ...(expandRelations ? { $expand: "relations" } : { fields }),
      }),
    });
    for (const item of data.value ?? []) {
      results.push({ item, childIds: childIdsOf(item) });
    }
  }
  return results;
}
