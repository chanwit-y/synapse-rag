import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TreeNode, TreeViewGroup } from "@/components/common/FileTree";
import {
  canvasChatMessageRepository,
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

/** Where canvas-node images are written, and the public URL they resolve to.
 *  Unlike document images these use a unique filename per upload (not content
 *  -addressed) so a canvas can safely delete its own image without affecting any
 *  other reference. */
const CANVAS_IMAGE_DIR = path.join(process.cwd(), "public", "canvas-images");
const CANVAS_IMAGE_URL_BASE = "/canvas-images";

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

/**
 * A non-clashing name for a duplicated item: `"<base> (copy)<ext>"`, falling
 * back to `"(copy 2)"`, `"(copy 3)"`, … against the sibling names already
 * `taken`. Files/canvases keep their extension; folders dedupe on the whole
 * name (folders aren't currently duplicated, but the helper stays general).
 */
function nextCopyName(
  name: string,
  type: "file" | "folder" | "canvas",
  taken: Set<string>,
): string {
  const dot = type !== "folder" ? name.lastIndexOf(".") : -1;
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";

  let candidate = `${base} (copy)${ext}`;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base} (copy ${n})${ext}`;
    n += 1;
  }
  return candidate;
}

/**
 * A name that doesn't clash with any in `taken`, appending ` (2)`, ` (3)`, …
 * before the extension. Mirrors the client-side `dedupeName` so a cross-
 * collection move resolves clashes the same way an in-collection drag does.
 */
function dedupeName(
  name: string,
  type: "file" | "folder" | "canvas",
  taken: Set<string>,
): string {
  if (!taken.has(name)) return name;

  const dot = type !== "folder" ? name.lastIndexOf(".") : -1;
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";

  let n = 2;
  let candidate = `${base} (${n})${ext}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  return candidate;
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

  /**
   * Create an empty canvas document (`type: "canvas"`) under a collection,
   * optionally inside a folder. Its `content` holds the serialized react-flow
   * graph; a fresh canvas starts as an empty `{ nodes, edges }`.
   */
  async createCanvas(params: {
    collectionId: string;
    folderId: string | null;
    name: string;
  }): Promise<{ id: string }> {
    const collectionId = parseId(params.collectionId);
    if (collectionId == null) {
      throw new ServiceError("Invalid collection id", "VALIDATION");
    }

    let folderId: number | null = null;
    if (params.folderId != null) {
      folderId = parseId(params.folderId);
      if (folderId == null) {
        throw new ServiceError("Invalid folder id", "VALIDATION");
      }
    }

    const trimmed = params.name.trim() || "untitled.canvas";
    const name = trimmed.includes(".") ? trimmed : `${trimmed}.canvas`;

    const created = await itemRepository.create({
      collectionId,
      folderId,
      type: "canvas",
      name,
      content: JSON.stringify({ nodes: [], edges: [] }),
    });
    const row = assertFound(created, "Failed to create canvas");
    return { id: toIdString(row.id) };
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

  /**
   * Duplicate a file or canvas within its own folder. The copy carries over the
   * English content, the cached Thai translation (+ its staleness hash) and the
   * full version history (snapshots are re-pointed verbatim, preserving their
   * timestamps and language). For a canvas it also copies the per-node chat
   * transcripts — the graph JSON is cloned unchanged, so node ids still match.
   * RAG links are intentionally NOT copied (the duplicate is unindexed). Returns
   * the new file's lightweight tree node so the sidebar can place it.
   */
  async duplicateItem(itemId: string): Promise<TreeNode> {
    const numericId = parseId(itemId);
    if (numericId == null) {
      throw new ServiceError("Invalid item id", "VALIDATION");
    }

    const source = assertFound(
      await itemRepository.findById(numericId),
      "Item not found",
    );
    if (source.type === "folder") {
      throw new ServiceError("Folders cannot be duplicated", "VALIDATION");
    }

    // Resolve a `(copy)` name that doesn't clash with siblings in the same
    // folder (root level when folderId is null).
    const siblings =
      source.folderId == null
        ? (await itemRepository.findByCollectionId(source.collectionId)).filter(
            (item) => item.folderId == null,
          )
        : await itemRepository.findByFolderId(source.folderId);
    const name = nextCopyName(
      source.name,
      source.type,
      new Set(siblings.map((item) => item.name)),
    );

    const created = assertFound(
      await itemRepository.create({
        collectionId: source.collectionId,
        folderId: source.folderId,
        type: source.type,
        name,
        content: source.content,
        contentTh: source.contentTh,
        contentThHash: source.contentThHash,
      }),
      "Failed to duplicate item",
    );

    // Copy the version history verbatim (timestamps + language preserved).
    const history = await historyRepository.findByItemId(numericId);
    for (const snapshot of history) {
      await historyRepository.create({
        itemId: created.id,
        content: snapshot.content,
        lang: snapshot.lang,
        createdAt: snapshot.createdAt,
      });
    }

    // Canvas chat transcripts are keyed by (itemId, nodeId); the clone keeps the
    // same node ids, so re-point each message to the new item.
    if (source.type === "canvas") {
      const messages = await canvasChatMessageRepository.findByItemId(numericId);
      for (const message of messages) {
        await canvasChatMessageRepository.upsert({
          itemId: created.id,
          nodeId: message.nodeId,
          messageId: message.messageId,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        });
      }
    }

    return {
      id: toIdString(created.id),
      collectionId: toIdString(created.collectionId),
      name: created.name,
      type: created.type,
      createdAt: created.createdAt.getTime(),
      updatedAt: created.updatedAt.getTime(),
    };
  }

  /**
   * Move a file, canvas, or folder into another collection (and optionally a
   * folder within it). The item id is preserved, so its histories, RAG links,
   * canvas chat messages, and `?item=` deep-links all survive. A folder moves
   * recursively: every descendant's `collectionId` is reassigned to the
   * destination while the internal `folderId` structure is left intact. The
   * moved top-level node is renamed (` (2)`) if its name clashes at the
   * destination; descendants keep their names. `destFolderId` null = the
   * destination collection's root.
   *
   * Updates run sequentially (no surrounding transaction, matching the rest of
   * this service); a mid-move failure could leave a partially-reassigned
   * subtree, an accepted trade-off on local SQLite.
   */
  async moveItem(
    itemId: string,
    destCollectionId: string,
    destFolderId: string | null,
  ): Promise<void> {
    const numericId = parseId(itemId);
    if (numericId == null) {
      throw new ServiceError("Invalid item id", "VALIDATION");
    }
    const destCollection = parseId(destCollectionId);
    if (destCollection == null) {
      throw new ServiceError("Invalid collection id", "VALIDATION");
    }
    let destFolder: number | null = null;
    if (destFolderId != null) {
      destFolder = parseId(destFolderId);
      if (destFolder == null) {
        throw new ServiceError("Invalid folder id", "VALIDATION");
      }
    }

    const source = assertFound(
      await itemRepository.findById(numericId),
      "Item not found",
    );

    // The moved subtree: the node itself plus, for a folder, all descendants.
    const subtreeIds = await this.collectSubtreeIds(numericId, source.type);

    // A folder can't move into itself or one of its own descendants.
    if (destFolder != null && subtreeIds.has(destFolder)) {
      throw new ServiceError(
        "Cannot move a folder into itself",
        "VALIDATION",
      );
    }

    // The destination folder, when given, must be a folder in the dest collection.
    if (destFolder != null) {
      const folder = assertFound(
        await itemRepository.findById(destFolder),
        "Destination folder not found",
      );
      if (folder.type !== "folder" || folder.collectionId !== destCollection) {
        throw new ServiceError("Invalid destination folder", "VALIDATION");
      }
    }

    // Resolve a non-clashing name among destination siblings (excluding self).
    const siblings =
      destFolder == null
        ? (await itemRepository.findByCollectionId(destCollection)).filter(
            (item) => item.folderId == null,
          )
        : await itemRepository.findByFolderId(destFolder);
    const taken = new Set(
      siblings.filter((s) => s.id !== numericId).map((s) => s.name),
    );
    const name = dedupeName(source.name, source.type, taken);

    // Move the node itself (collection + parent folder + resolved name).
    await itemRepository.update(numericId, {
      collectionId: destCollection,
      folderId: destFolder,
      name,
    });

    // For a folder, reassign every descendant to the destination collection.
    // Their `folderId` links stay valid since the subtree moves together.
    if (source.type === "folder") {
      for (const id of subtreeIds) {
        if (id === numericId) continue;
        await itemRepository.update(id, { collectionId: destCollection });
      }
    }
  }

  /** The id of `rootId` plus every descendant (folders recurse; leaves don't). */
  private async collectSubtreeIds(
    rootId: number,
    type: "file" | "folder" | "canvas",
  ): Promise<Set<number>> {
    const ids = new Set<number>([rootId]);
    if (type !== "folder") return ids;

    const queue: number[] = [rootId];
    while (queue.length) {
      const current = queue.shift()!;
      const children = await itemRepository.findByFolderId(current);
      for (const child of children) {
        if (ids.has(child.id)) continue;
        ids.add(child.id);
        if (child.type === "folder") queue.push(child.id);
      }
    }
    return ids;
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

  /**
   * Persist a canvas-node image under `public/canvas-images/` with a unique
   * filename and return its public URL (e.g. `/canvas-images/<uuid>.png`). A
   * fresh name per upload keeps each canvas image independent, so removing one
   * can never break another node that happens to share the same picture.
   */
  async uploadCanvasImage(file: File): Promise<{ path: string }> {
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
    const fileName = `${randomUUID()}.${ext}`;

    await mkdir(CANVAS_IMAGE_DIR, { recursive: true });
    await writeFile(path.join(CANVAS_IMAGE_DIR, fileName), bytes);

    return { path: `${CANVAS_IMAGE_URL_BASE}/${fileName}` };
  }

  /**
   * Delete a previously-uploaded canvas image by its public path. Only paths
   * under `/canvas-images/` are accepted (guards against traversal / deleting
   * unrelated files); a missing file is treated as already-deleted.
   */
  async deleteCanvasImage(publicPath: string): Promise<void> {
    const prefix = `${CANVAS_IMAGE_URL_BASE}/`;
    if (!publicPath.startsWith(prefix)) {
      throw new ServiceError("Not a canvas image path", "VALIDATION");
    }
    const fileName = path.basename(publicPath);
    // basename strips any directory parts, so the join can't escape the dir.
    if (!fileName || fileName === "." || fileName === "..") {
      throw new ServiceError("Invalid canvas image path", "VALIDATION");
    }
    try {
      await unlink(path.join(CANVAS_IMAGE_DIR, fileName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private async translate(source: string, modelId: string): Promise<string> {
    const llm = await getChatModelFromDb(modelId);
    const result = await llm.invoke(translationPrompt(source));
    return stripWrappingFence(messageContentToString(result.content));
  }
}

export const documentService = new DocumentService();
