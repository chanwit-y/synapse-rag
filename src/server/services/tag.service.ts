import {
  itemRepository,
  itemTagRepository,
  tagRepository,
} from "@/server/db/repository";
import { toTagRecord, type TagRecord } from "./mappers";
import { assertFound, parseId, ServiceError } from "./utils";
import { randomTagColorKey } from "@/util/const/tagColor";

/** Tags can only be applied to leaf documents (files and canvases). */
const TAGGABLE_TYPES = new Set(["file", "canvas"]);

export class TagService {
  /** Every tag in the workspace, alphabetical — powers add-input suggestions. */
  async listAllTags(): Promise<TagRecord[]> {
    const all = await tagRepository.findAll();
    return all.map((tag) => toTagRecord(tag));
  }

  /**
   * Every item→tag association in the workspace, grouped by item id. Powers the
   * command-palette search, which shows each result's tags without a per-item
   * round-trip. The payload is just id/name pairs, so it stays cheap.
   */
  async listAllItemTags(): Promise<Record<string, TagRecord[]>> {
    const links = await itemTagRepository.findAllWithTags();
    const byItem: Record<string, TagRecord[]> = {};
    for (const link of links) {
      const key = String(link.itemId);
      (byItem[key] ??= []).push(toTagRecord(link.tag));
    }
    return byItem;
  }

  /** The tags currently applied to an item, ordered by when they were linked. */
  async listTagsForItem(itemId: string): Promise<TagRecord[]> {
    const numericId = parseId(itemId);
    if (numericId == null) {
      throw new ServiceError("Invalid item id", "VALIDATION");
    }
    const links = await itemTagRepository.findByItemId(numericId);
    return links.map((link) => toTagRecord(link.tag));
  }

  /**
   * Apply a tag to a file/canvas. The name is trimmed and matched case-
   * insensitively against the global tag list — an existing tag is reused,
   * otherwise a new one is created. Linking is idempotent. Returns the resolved
   * tag so the caller can render its chip (and learn the canonical casing).
   */
  async addTagToItem(itemId: string, rawName: string): Promise<TagRecord> {
    const numericId = parseId(itemId);
    if (numericId == null) {
      throw new ServiceError("Invalid item id", "VALIDATION");
    }
    const name = rawName.trim();
    if (!name) {
      throw new ServiceError("Tag name is required", "VALIDATION");
    }

    const item = assertFound(
      await itemRepository.findById(numericId),
      "Item not found",
    );
    if (!TAGGABLE_TYPES.has(item.type)) {
      throw new ServiceError("Only files and canvases can be tagged", "VALIDATION");
    }

    const tag =
      (await tagRepository.findByName(name)) ??
      assertFound(
        await tagRepository.create({ name, color: randomTagColorKey() }),
        "Failed to create tag",
      );

    await itemTagRepository.link({ itemId: numericId, tagId: tag.id });
    return toTagRecord(tag);
  }

  /**
   * Remove a tag from an item. If that was the tag's last reference, the now-
   * orphaned tag row is deleted so the global list stays clean.
   */
  async removeTagFromItem(itemId: string, tagId: string): Promise<void> {
    const numericItemId = parseId(itemId);
    const numericTagId = parseId(tagId);
    if (numericItemId == null || numericTagId == null) {
      throw new ServiceError("Invalid id", "VALIDATION");
    }

    await itemTagRepository.unlink(numericItemId, numericTagId);

    const refs = await itemTagRepository.countByTagId(numericTagId);
    if (refs === 0) {
      await tagRepository.delete(numericTagId);
    }
  }
}

export const tagService = new TagService();
