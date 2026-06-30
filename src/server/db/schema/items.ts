import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { collections } from "./collections";
import { itemTypeValues, sourceFormatValues } from "./enums";

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  collectionId: integer("collection_id")
    .notNull()
    .references(() => collections.id, { onDelete: "cascade" }),
  folderId: integer("folder_id").references((): AnySQLiteColumn => items.id, {
    onDelete: "cascade",
  }),
  type: text("type", { enum: itemTypeValues }).notNull(),
  name: text("name").notNull(),
  /**
   * Document body. For `type: "file"` this is Markdown; for `type: "canvas"`
   * it is a JSON string of the react-flow graph (`{ nodes, edges }`); NULL for
   * folders.
   */
  content: text("content"),
  /** Cached Thai translation of `content` (user-editable). */
  contentTh: text("content_th"),
  /** SHA-256 of the English `content` captured when `contentTh` was generated; used to detect staleness. */
  contentThHash: text("content_th_hash"),
  /**
   * Original file format this document was extracted from on import (e.g. a
   * SharePoint pull). Drives the `auto` chunk strategy. NULL for manually
   * authored documents, which are treated as Markdown.
   */
  sourceFormat: text("source_format", { enum: sourceFormatValues }),
  /**
   * Whether the user has starred this item. Workspace-global (single-user app).
   * Applies to any item type — files, canvases, and folders can be favorited.
   */
  isFavorite: integer("is_favorite", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
