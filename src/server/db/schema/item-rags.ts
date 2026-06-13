import { integer, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core";
import { items } from "./items";
import { rags } from "./rags";

export const itemRags = sqliteTable(
  "item_rags",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    ragId: integer("rag_id")
      .notNull()
      .references(() => rags.id, { onDelete: "cascade" }),
    linkedAt: integer("linked_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.ragId] })],
);

export type ItemRag = typeof itemRags.$inferSelect;
export type NewItemRag = typeof itemRags.$inferInsert;
