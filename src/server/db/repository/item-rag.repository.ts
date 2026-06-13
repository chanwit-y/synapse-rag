import { and, asc, eq } from "drizzle-orm";
import {
  itemRags,
  type ItemRag,
  type NewItemRag,
} from "../schema/item-rags";
import { type Database, resolveDb } from "./base";

export class ItemRagRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findByItemId(itemId: number) {
    return this.database.query.itemRags.findMany({
      where: eq(itemRags.itemId, itemId),
      with: { rag: true },
      orderBy: asc(itemRags.linkedAt),
    });
  }

  findByRagId(ragId: number) {
    return this.database.query.itemRags.findMany({
      where: eq(itemRags.ragId, ragId),
      with: { item: true },
      orderBy: asc(itemRags.linkedAt),
    });
  }

  link(data: NewItemRag) {
    return this.database
      .insert(itemRags)
      .values(data)
      .onConflictDoNothing()
      .returning()
      .then((rows) => rows[0]);
  }

  unlink(itemId: number, ragId: number) {
    return this.database
      .delete(itemRags)
      .where(and(eq(itemRags.itemId, itemId), eq(itemRags.ragId, ragId)))
      .returning()
      .then((rows) => rows[0]);
  }

  unlinkAllByItemId(itemId: number) {
    return this.database
      .delete(itemRags)
      .where(eq(itemRags.itemId, itemId))
      .returning();
  }

  unlinkAllByRagId(ragId: number) {
    return this.database
      .delete(itemRags)
      .where(eq(itemRags.ragId, ragId))
      .returning();
  }
}

export const itemRagRepository = new ItemRagRepository();

export type { ItemRag, NewItemRag };
