import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { chatRoleValues } from "./enums";
import { items } from "./items";

/** Grounding source attached to an AI chat message (e.g. a Wikipedia article). */
export type CanvasChatMessageSource = {
  title: string;
  url: string;
  lang: string;
};

/**
 * Live transcript of an "Ask AI" / chat node on a canvas document.
 *
 * The canvas graph (`items.content` JSON) holds node *structure* only — chat
 * messages are persisted here, one row per message, as they happen (not just on
 * Save), so a conversation survives even if the user never saves the canvas.
 *
 * Keyed by `(itemId, nodeId)`: a canvas item can hold many chat nodes, each with
 * its own message list. `messageId` is the client-generated message id, kept so
 * highlight anchors (`Highlight.messageId`) keep resolving and so writes are
 * idempotent on `(itemId, nodeId, messageId)`. Insertion order (`id`) is the
 * conversation order — messages are appended live, one at a time.
 */
export const canvasChatMessages = sqliteTable(
  "canvas_chat_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    nodeId: text("node_id").notNull(),
    messageId: text("message_id").notNull(),
    role: text("role", { enum: chatRoleValues }).notNull(),
    content: text("content").notNull(),
    /** Optional grounding source for an AI message (e.g. the Wikipedia article a
     *  historical answer was grounded with). JSON: `{title,url,lang}`. Null for
     *  user messages and ungrounded replies. */
    source: text("source", { mode: "json" }).$type<CanvasChatMessageSource>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    unique().on(table.itemId, table.nodeId, table.messageId),
    index("canvas_chat_messages_item_id_idx").on(table.itemId),
  ],
);

export type CanvasChatMessage = typeof canvasChatMessages.$inferSelect;
export type NewCanvasChatMessage = typeof canvasChatMessages.$inferInsert;
