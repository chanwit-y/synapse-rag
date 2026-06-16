import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TreeNode, TreeViewGroup } from "@/components/common/FileTree";
import {
  collectionRepository,
  historyRepository,
  itemRepository,
} from "@/server/db/repository";
import type { ContentLang } from "@/server/db/schema/enums";
import { getChatModelFromDb } from "./llm";
import { toTreeViewGroup } from "./mappers";
import { assertFound, parseId, ServiceError, toIdString } from "./utils";

/** Where editor-uploaded images are written, and the public URL they resolve to. */
const UPLOAD_IMAGE_DIR = path.join(process.cwd(), "public", "document-images");
const UPLOAD_IMAGE_URL_BASE = "/document-images";
const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024;

const EXT_BY_IMAGE_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/x-icon": "ico",
  "image/avif": "avif",
};

/** Flatten a LangChain message `content` (string or content-part array) to plain text. */
function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : part && typeof part === "object" && "text" in part
            ? String((part as { text: unknown }).text)
            : "",
      )
      .join("");
  }
  return content == null ? "" : String(content);
}

/** Strip a stray ```/```markdown fence the model may wrap the whole answer in. */
function stripWrappingFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/;
  const match = trimmed.match(fence);
  return match ? match[1] : text;
}

function translationPrompt(source: string): string {
  return [
    "You are a professional translator. Translate the following Markdown document into Thai.",
    "",
    "Rules:",
    "- Translate only natural-language prose.",
    "- Do NOT translate or alter: code blocks and inline code, URLs and link targets, image paths, HTML tags, math expressions ($...$, $$...$$), and Markdown syntax/structure.",
    "- Preserve all Markdown formatting, headings, lists, tables, and whitespace exactly.",
    "- Keep proper nouns and product names as-is unless they have a common Thai form.",
    "- Return ONLY the translated Markdown, with no explanation and no code fence wrapping the whole output.",
    "",
    "Document:",
    source,
  ].join("\n");
}

export class DocumentService {
  async listCollections(): Promise<TreeViewGroup[]> {
    const collections = await collectionRepository.findAll();

    return Promise.all(
      collections.map(async (collection) => {
        // Tree only needs structure — content is fetched lazily on open.
        const items = await itemRepository.findTreeByCollectionId(collection.id);
        return toTreeViewGroup(collection, items);
      }),
    );
  }

  /** Fetch a single file's English content (loaded on demand by the editor). */
  async getItemContent(itemId: string): Promise<string> {
    const numericId = parseId(itemId);
    if (numericId == null) {
      throw new ServiceError("Invalid item id", "VALIDATION");
    }
    const item = await itemRepository.findById(numericId);
    return assertFound(item, "Item not found").content ?? "";
  }

  async createCollection(name: string): Promise<TreeViewGroup> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ServiceError("Collection name is required", "VALIDATION");
    }

    const collection = await collectionRepository.create({ name: trimmed });
    return toTreeViewGroup(assertFound(collection, "Failed to create collection"), []);
  }

  async renameCollection(
    collectionId: string,
    name: string,
  ): Promise<{ id: string; name: string }> {
    const numericId = parseId(collectionId);
    if (numericId == null) {
      throw new ServiceError("Invalid collection id", "VALIDATION");
    }
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ServiceError("Collection name is required", "VALIDATION");
    }

    const updated = await collectionRepository.update(numericId, { name: trimmed });
    const row = assertFound(updated, "Collection not found");
    return { id: toIdString(row.id), name: row.name };
  }

  /** Rename a single file or folder. Name normalization/dedup happens client-side. */
  async renameItem(
    itemId: string,
    name: string,
  ): Promise<{ id: string; name: string }> {
    const numericId = parseId(itemId);
    if (numericId == null) {
      throw new ServiceError("Invalid item id", "VALIDATION");
    }
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ServiceError("Name is required", "VALIDATION");
    }

    const updated = await itemRepository.update(numericId, { name: trimmed });
    const row = assertFound(updated, "Item not found");
    return { id: toIdString(row.id), name: row.name };
  }

  async syncDirectories(
    collectionId: string,
    directories: TreeNode[],
  ): Promise<void> {
    const numericCollectionId = parseId(collectionId);
    if (numericCollectionId == null) {
      throw new ServiceError("Invalid collection id", "VALIDATION");
    }

    const existing = await itemRepository.findByCollectionId(numericCollectionId);
    const existingIds = new Set(existing.map((item) => item.id));
    const seenIds = new Set<number>();

    const walk = async (
      nodes: TreeNode[],
      folderId: number | null,
    ): Promise<void> => {
      for (const node of nodes) {
        const parsedId = parseId(node.id);

        if (parsedId != null && existingIds.has(parsedId)) {
          // Structure-only update — content is owned by saveDocumentContent and
          // must not be clobbered here (the tree no longer carries content).
          await itemRepository.update(parsedId, {
            name: node.name,
            folderId,
            type: node.type,
          });
          seenIds.add(parsedId);

          if (node.type === "folder" && node.children?.length) {
            await walk(node.children, parsedId);
          }
          continue;
        }

        const created = await itemRepository.create({
          collectionId: numericCollectionId,
          folderId,
          type: node.type,
          name: node.name,
          content: node.type === "file" ? (node.content ?? null) : null,
        });
        const newItem = assertFound(created, "Failed to create item");
        seenIds.add(newItem.id);

        if (node.type === "folder" && node.children?.length) {
          await walk(node.children, newItem.id);
        }
      }
    };

    await walk(directories, null);

    const toDelete = [...existingIds].filter((id) => !seenIds.has(id));
    await Promise.all(toDelete.map((id) => itemRepository.delete(id)));
  }

  async deleteItem(itemId: string): Promise<void> {
    const numericId = parseId(itemId);
    if (numericId == null) {
      throw new ServiceError("Invalid item id", "VALIDATION");
    }

    const row = await itemRepository.delete(numericId);
    assertFound(row, "Item not found");
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const numericId = parseId(collectionId);
    if (numericId == null) {
      throw new ServiceError("Invalid collection id", "VALIDATION");
    }

    // FK cascade removes the collection's items (and their histories / rag links).
    const row = await collectionRepository.delete(numericId);
    assertFound(row, "Collection not found");
  }

  async saveFileContent(params: {
    id: string | null;
    name: string;
    content: string;
    collectionId: string;
  }): Promise<{ id: string }> {
    const collectionId = parseId(params.collectionId);
    if (collectionId == null) {
      throw new ServiceError("Invalid collection id", "VALIDATION");
    }

    const itemId = params.id ? parseId(params.id) : null;

    if (itemId != null) {
      const existing = await itemRepository.findById(itemId);
      const existingRow = assertFound(existing, "File not found");

      const previousContent = existingRow.content ?? "";
      if (previousContent !== params.content) {
        await historyRepository.create({
          itemId: existingRow.id,
          content: previousContent,
        });
      }

      const updated = await itemRepository.update(itemId, {
        name: params.name.trim() || "untitled.md",
        content: params.content,
      });
      const row = assertFound(updated, "File not found");
      return { id: toIdString(row.id) };
    }

    const created = await itemRepository.create({
      collectionId,
      folderId: null,
      type: "file",
      name: params.name.trim() || "untitled.md",
      content: params.content,
    });
    const row = assertFound(created, "Failed to create file");
    await historyRepository.create({ itemId: row.id, content: params.content });
    return { id: toIdString(row.id) };
  }

  async listFileHistory(itemId: string, lang?: ContentLang) {
    const numericId = parseId(itemId);
    if (numericId == null) {
      throw new ServiceError("Invalid item id", "VALIDATION");
    }

    return historyRepository.findByItemId(numericId, lang);
  }

  /**
   * Return the Thai translation of a document, generating it on demand. The
   * cached `contentTh` is reused while it matches the current English content
   * (compared via `contentThHash`); when the English has changed since the last
   * translation it is re-translated — the previous Thai is snapshotted to
   * history first so manual edits remain recoverable.
   */
  async getTranslation(
    itemId: string,
    modelId: string,
  ): Promise<{ content: string; retranslated: boolean }> {
    const numericId = parseId(itemId);
    if (numericId == null) {
      throw new ServiceError("Invalid item id", "VALIDATION");
    }
    if (!modelId?.trim()) {
      throw new ServiceError("A translation model is required", "VALIDATION");
    }

    const item = assertFound(
      await itemRepository.findById(numericId),
      "File not found",
    );

    const source = item.content ?? "";
    const hash = createHash("sha256").update(source).digest("hex");

    // Cache hit: stored Thai still matches the current English.
    if (item.contentTh != null && item.contentThHash === hash) {
      return { content: item.contentTh, retranslated: false };
    }

    // Stale or missing: snapshot the previous Thai (if any) before overwriting.
    if (item.contentTh != null) {
      await historyRepository.create({
        itemId: numericId,
        content: item.contentTh,
        lang: "th",
      });
    }

    const translated = source ? await this.translate(source, modelId) : "";
    await itemRepository.update(numericId, {
      contentTh: translated,
      contentThHash: hash,
    });
    return { content: translated, retranslated: true };
  }

  /**
   * Save a user-edited Thai translation. Writes only `content_th` (the English
   * stays canonical, so the staleness hash is untouched) and snapshots the
   * previous Thai to history when it actually changed.
   */
  async saveTranslation(itemId: string, content: string): Promise<void> {
    const numericId = parseId(itemId);
    if (numericId == null) {
      throw new ServiceError("Invalid item id", "VALIDATION");
    }

    const item = assertFound(
      await itemRepository.findById(numericId),
      "File not found",
    );

    const previous = item.contentTh ?? "";
    if (previous !== content) {
      await historyRepository.create({
        itemId: numericId,
        content: previous,
        lang: "th",
      });
    }

    await itemRepository.update(numericId, { contentTh: content });
  }

  /**
   * Persist an editor-uploaded image under `public/document-images/` and return
   * its public URL (e.g. `/document-images/<sha1>.png`). The filename is content
   * -addressed, so re-uploading the same image reuses the same file.
   */
  async uploadImage(file: File): Promise<{ path: string }> {
    if (!file || file.size === 0) {
      throw new ServiceError("No image file provided", "VALIDATION");
    }
    if (!file.type.startsWith("image/")) {
      throw new ServiceError("Uploaded file is not an image", "VALIDATION");
    }
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      throw new ServiceError("Image is larger than 10MB", "VALIDATION");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = EXT_BY_IMAGE_TYPE[file.type.toLowerCase()] ?? "png";
    const fileName = `${createHash("sha1").update(bytes).digest("hex")}.${ext}`;

    await mkdir(UPLOAD_IMAGE_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_IMAGE_DIR, fileName), bytes);

    return { path: `${UPLOAD_IMAGE_URL_BASE}/${fileName}` };
  }

  private async translate(source: string, modelId: string): Promise<string> {
    const llm = await getChatModelFromDb(modelId);
    const result = await llm.invoke(translationPrompt(source));
    return stripWrappingFence(messageContentToString(result.content));
  }
}

export const documentService = new DocumentService();
