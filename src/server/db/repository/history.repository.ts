import { and, asc, eq } from "drizzle-orm";
import type { ContentLang } from "../schema/enums";
import {
  histories,
  type History,
  type NewHistory,
} from "../schema/histories";
import { type Database, resolveDb } from "./base";

export class HistoryRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findById(id: number) {
    return this.database.query.histories.findFirst({
      where: eq(histories.id, id),
    });
  }

  findByItemId(itemId: number, lang?: ContentLang) {
    return this.database.query.histories.findMany({
      where: lang
        ? and(eq(histories.itemId, itemId), eq(histories.lang, lang))
        : eq(histories.itemId, itemId),
      orderBy: asc(histories.createdAt),
    });
  }

  create(data: NewHistory) {
    return this.database
      .insert(histories)
      .values(data)
      .returning()
      .then((rows) => rows[0]);
  }

  delete(id: number) {
    return this.database
      .delete(histories)
      .where(eq(histories.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  deleteByItemId(itemId: number) {
    return this.database
      .delete(histories)
      .where(eq(histories.itemId, itemId))
      .returning();
  }
}

export const historyRepository = new HistoryRepository();

export type { History, NewHistory };
