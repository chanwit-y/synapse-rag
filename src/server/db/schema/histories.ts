import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { contentLangValues } from "./enums";
import { items } from "./items";

export const histories = sqliteTable("histories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  content: text("content"),
  /** Which language this snapshot captured ("en" = the document, "th" = its translation). */
  lang: text("lang", { enum: contentLangValues }).notNull().default("en"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type History = typeof histories.$inferSelect;
export type NewHistory = typeof histories.$inferInsert;
