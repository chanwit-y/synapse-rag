import type { Tag } from "@/server/db/repository";
import { toIdString } from "../utils";

/**
 * Client-facing tag shape. `color` is the stored chip color key (or null for
 * legacy tags, where the client derives a color from `name`).
 */
export type TagRecord = {
  id: string;
  name: string;
  color: string | null;
};

export function toTagRecord(tag: Pick<Tag, "id" | "name" | "color">): TagRecord {
  return {
    id: toIdString(tag.id),
    name: tag.name,
    color: tag.color,
  };
}
