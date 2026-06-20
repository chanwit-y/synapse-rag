import type { Tag } from "@/server/db/repository";
import { toIdString } from "../utils";

/** Client-facing tag shape. Chip color is derived from `name` on the client. */
export type TagRecord = {
  id: string;
  name: string;
};

export function toTagRecord(tag: Pick<Tag, "id" | "name">): TagRecord {
  return {
    id: toIdString(tag.id),
    name: tag.name,
  };
}
