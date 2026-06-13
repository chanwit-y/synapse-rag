import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const collections = sqliteTable("collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
