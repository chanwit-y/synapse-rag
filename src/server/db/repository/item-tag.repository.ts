import { and, asc, eq, sql } from "drizzle-orm";
import {
  itemTags,
  type ItemTag,
  type NewItemTag,
} from "../schema/item-tags";
import { type Database, resolveDb } from "./base";

export class ItemTagRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findByItemId(itemId: number) {
    return this.database.query.itemTags.findMany({
      where: eq(itemTags.itemId, itemId),
      with: { tag: true },
      orderBy: asc(itemTags.linkedAt),
    });
  }

  /** Every item→tag link across the workspace, with the joined tag rows. */
  findAllWithTags() {
    return this.database.query.itemTags.findMany({
      with: { tag: true },
      orderBy: asc(itemTags.linkedAt),
    });
  }

  /** Number of items currently referencing a tag (used to GC orphans). */
  async countByTagId(tagId: number): Promise<number> {
    const rows = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(itemTags)
      .where(eq(itemTags.tagId, tagId));
    return Number(rows[0]?.count ?? 0);
  }

  link(data: NewItemTag) {
    return this.database
      .insert(itemTags)
      .values(data)
      .onConflictDoNothing()
      .returning()
      .then((rows) => rows[0]);
  }

  unlink(itemId: number, tagId: number) {
    return this.database
      .delete(itemTags)
      .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)))
      .returning()
      .then((rows) => rows[0]);
  }

  unlinkAllByItemId(itemId: number) {
    return this.database
      .delete(itemTags)
      .where(eq(itemTags.itemId, itemId))
      .returning();
  }
}

export const itemTagRepository = new ItemTagRepository();

export type { ItemTag, NewItemTag };
