import { createHash } from "node:crypto";
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
        const items = await itemRepository.findByCollectionId(collection.id);
        return toTreeViewGroup(collection, items);
      }),
    );
  }

  async createCollection(name: string): Promise<TreeViewGroup> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ServiceError("Collection name is required", "VALIDATION");
    }

    const collection = await collectionRepository.create({ name: trimmed });
    return toTreeViewGroup(assertFound(collection, "Failed to create collection"), []);
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
          await itemRepository.update(parsedId, {
            name: node.name,
            folderId,
            type: node.type,
            content: node.type === "file" ? (node.content ?? null) : null,
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

  private async translate(source: string, modelId: string): Promise<string> {
    const llm = await getChatModelFromDb(modelId);
    const result = await llm.invoke(translationPrompt(source));
    return stripWrappingFence(messageContentToString(result.content));
  }
}

export const documentService = new DocumentService();
