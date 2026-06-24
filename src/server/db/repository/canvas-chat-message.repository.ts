import { and, asc, eq, notInArray } from "drizzle-orm";
import {
  canvasChatMessages,
  type CanvasChatMessage,
  type NewCanvasChatMessage,
} from "../schema/canvas-chat-messages";
import { type Database, resolveDb } from "./base";

export class CanvasChatMessageRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  /** Every message for a canvas item, in conversation order (insertion order). */
  findByItemId(itemId: number) {
    return this.database.query.canvasChatMessages.findMany({
      where: eq(canvasChatMessages.itemId, itemId),
      orderBy: asc(canvasChatMessages.id),
    });
  }

  /** Append a message. Idempotent on `(itemId, nodeId, messageId)`, so a seed
   *  re-written on remount (or a retried write) never duplicates. */
  upsert(data: NewCanvasChatMessage) {
    return this.database
      .insert(canvasChatMessages)
      .values(data)
      .onConflictDoNothing({
        target: [
          canvasChatMessages.itemId,
          canvasChatMessages.nodeId,
          canvasChatMessages.messageId,
        ],
      })
      .returning()
      .then((rows) => rows[0]);
  }

  /** Drop messages for chat nodes no longer present in the saved graph. With an
   *  empty keep-list every message for the item is removed (all chats deleted). */
  pruneByItemKeepingNodes(itemId: number, keepNodeIds: string[]) {
    const owner = eq(canvasChatMessages.itemId, itemId);
    return this.database
      .delete(canvasChatMessages)
      .where(
        keepNodeIds.length
          ? and(owner, notInArray(canvasChatMessages.nodeId, keepNodeIds))
          : owner,
      )
      .returning();
  }
}

export const canvasChatMessageRepository = new CanvasChatMessageRepository();

export type { CanvasChatMessage, NewCanvasChatMessage };
