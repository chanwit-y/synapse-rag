import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Global (workspace-wide) labels applied to files/canvases. Not collection
 * scoped — a tag like `urgent` is created once and reusable everywhere. Names
 * are unique case-insensitively (enforced in the service plus the index below).
 * Chip colors are derived from the name on the client, so there is no color
 * column. Orphan tags (zero references) are GC'd when their last link is removed.
 */
export const tags = sqliteTable(
  "tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("tags_name_unique").on(table.name)],
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
