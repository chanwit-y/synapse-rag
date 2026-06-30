import {
  apiKeyRepository,
  collectionRepository,
  historyRepository,
  itemRepository,
} from "@/server/db/repository";
import { assertFound, parseId, ServiceError } from "../utils";
import {
  downloadFile,
  listFolderFiles,
  normalizeSitePath,
  resolveSharePointAuth,
} from "./client";
import { isSupportedFile, parseFileToMarkdown } from "./parsers";
import type {
  SharePointFileEntry,
  SharePointImportParams,
  SharePointImportResult,
  SharePointSkip,
} from "./types";

/** Per-file size cap (mirrors the Azure attachment cap). */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Max files imported in a single run. */
const MAX_FILES = 100;

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Strip the extension and append `.md` (imported content is Markdown). */
function toDocumentName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return `${sanitizeFileName(base) || "document"}.md`;
}

/** The leaf segment of a folder server-relative URL, for the default collection name. */
function folderLeafName(folderServerRelativeUrl: string): string {
  const parts = folderServerRelativeUrl.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "SharePoint Import";
}

export class SharePointService {
  /**
   * Default site + folder configured on the active SharePoint connection, used
   * to pre-fill the import modal. Both may be empty strings if unset.
   */
  async getDefaults(): Promise<{ site: string; folder: string }> {
    const [key] = await apiKeyRepository.findActiveByProvider("sharepoint");
    return {
      site: key?.sitePath?.trim() ?? "",
      folder: key?.folderPath?.trim() ?? "",
    };
  }

  /** List the files directly in a folder so the user can choose what to import. */
  async listFiles(
    site: string,
    folderServerRelativeUrl: string,
  ): Promise<SharePointFileEntry[]> {
    const auth = await resolveSharePointAuth();
    const sitePath = normalizeSitePath(site);
    const folder = folderServerRelativeUrl.trim();
    if (!folder) {
      throw new ServiceError("A folder path is required.", "VALIDATION");
    }

    const files = await listFolderFiles(auth, sitePath, folder);
    return files
      .map((f) => ({ ...f, supported: isSupportedFile(f.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Download the selected files, extract them to Markdown, and upsert them as
   * documents (matched by name) into the target collection. Unsupported, too
   * large, empty, or failed files are skipped and reported; the import never
   * fails wholesale.
   */
  async importFiles(
    params: SharePointImportParams,
  ): Promise<SharePointImportResult> {
    const auth = await resolveSharePointAuth();
    const sitePath = normalizeSitePath(params.site);
    const folder = params.folderServerRelativeUrl.trim();
    if (!folder) {
      throw new ServiceError("A folder path is required.", "VALIDATION");
    }
    if (params.selectedUrls.length === 0) {
      throw new ServiceError("Select at least one file to import.", "VALIDATION");
    }

    const { collectionId, collectionName } = await this.resolveCollection(
      params,
      folder,
    );
    const targetFolderId = await this.resolveFolder(params.folderId, collectionId);

    // Re-list the folder server-side so names/sizes are authoritative, then keep
    // only the user's selection (and cap the count).
    const selectedSet = new Set(params.selectedUrls);
    const files = (await listFolderFiles(auth, sitePath, folder))
      .filter((f) => selectedSet.has(f.serverRelativeUrl))
      .slice(0, MAX_FILES);

    const existing = await itemRepository.findByCollectionId(collectionId);
    const existingByName = new Map(existing.map((e) => [e.name, e]));

    const skipped: SharePointSkip[] = [];
    let imported = 0;
    let updated = 0;

    for (const file of files) {
      if (!isSupportedFile(file.name)) {
        skipped.push({ name: file.name, reason: "Unsupported file type" });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        skipped.push({ name: file.name, reason: "Exceeds 10MB limit" });
        continue;
      }

      try {
        const buffer = await downloadFile(auth, sitePath, file.serverRelativeUrl);
        const parsed = await parseFileToMarkdown(file.name, buffer);
        if (!parsed || !parsed.markdown.trim()) {
          skipped.push({ name: file.name, reason: "No extractable text" });
          continue;
        }

        const title = file.name.replace(/\.[^.]+$/, "");
        const content = `# ${title}\n\n${parsed.markdown}`.trimEnd() + "\n";
        const docName = toDocumentName(file.name);

        const match = existingByName.get(docName);
        if (match && match.type === "file") {
          const row = await itemRepository.update(match.id, {
            content,
            sourceFormat: parsed.sourceFormat,
          });
          assertFound(row, "Failed to update document");
          await historyRepository.create({ itemId: match.id, content });
          updated += 1;
        } else {
          const created = await itemRepository.create({
            collectionId,
            folderId: targetFolderId,
            type: "file",
            name: docName,
            content,
            sourceFormat: parsed.sourceFormat,
          });
          const row = assertFound(created, "Failed to create document");
          await historyRepository.create({ itemId: row.id, content });
          existingByName.set(docName, row);
          imported += 1;
        }
      } catch (error) {
        skipped.push({
          name: file.name,
          reason: error instanceof Error ? error.message : "Download/parse failed",
        });
      }
    }

    return {
      collectionId: String(collectionId),
      collectionName,
      imported,
      updated,
      skipped,
    };
  }

  /** Resolve (or create) the destination collection. */
  private async resolveCollection(
    params: SharePointImportParams,
    folder: string,
  ): Promise<{ collectionId: number; collectionName: string }> {
    if (params.collectionId) {
      const numericId = parseId(params.collectionId);
      if (numericId == null) {
        throw new ServiceError("Invalid collection id", "VALIDATION");
      }
      const collection = await collectionRepository.findById(numericId);
      assertFound(collection, "Collection not found");
      return { collectionId: numericId, collectionName: collection!.name };
    }

    const name = (params.newCollectionName?.trim() || folderLeafName(folder)).slice(
      0,
      120,
    );
    const created = await collectionRepository.create({ name });
    const row = assertFound(created, "Failed to create collection");
    return { collectionId: row.id, collectionName: row.name };
  }

  /** Validate an optional target sub-folder belongs to the collection. */
  private async resolveFolder(
    folderId: string | null | undefined,
    collectionId: number,
  ): Promise<number | null> {
    if (folderId == null) return null;
    const numericFolderId = parseId(folderId);
    if (numericFolderId == null) return null;
    const folder = await itemRepository.findById(numericFolderId);
    if (folder && folder.collectionId === collectionId && folder.type === "folder") {
      return numericFolderId;
    }
    return null;
  }
}

export const sharePointService = new SharePointService();
