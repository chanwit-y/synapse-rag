import type { CanvasChatMessage } from "@/server/db/repository";
import type { ChatRole } from "@/server/db/schema/enums";

/**
 * Client-facing view of a persisted canvas chat message. Mirrors the canvas
 * `ChatMessage` shape (`id`/`role`/`text`) plus the owning `nodeId`, so the
 * document view can group rows back onto their chat nodes on hydrate.
 */
export type CanvasChatMessageRecord = {
  nodeId: string;
  id: string;
  role: ChatRole;
  text: string;
};

export function toCanvasChatMessageRecord(
  row: CanvasChatMessage,
): CanvasChatMessageRecord {
  return {
    nodeId: row.nodeId,
    id: row.messageId,
    role: row.role,
    text: row.content,
  };
}
