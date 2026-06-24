import { canvasChatMessageRepository } from "@/server/db/repository";
import type { CanvasChatMessageSource } from "@/server/db/schema/canvas-chat-messages";
import type { ChatRole } from "@/server/db/schema/enums";
import {
  toCanvasChatMessageRecord,
  type CanvasChatMessageRecord,
} from "./mappers";
import { parseId, ServiceError } from "./utils";

/**
 * Persistence for canvas chat-node transcripts. Messages are written live (one
 * per turn) and read back to hydrate chat nodes when a canvas is opened — the
 * canvas graph JSON itself carries no messages (it's stripped on save).
 */
export class CanvasChatService {
  /** All persisted messages for a canvas item, in conversation order. */
  async listMessages(itemId: string): Promise<CanvasChatMessageRecord[]> {
    const id = parseId(itemId);
    if (id == null) throw new ServiceError("Invalid item id", "VALIDATION");
    const rows = await canvasChatMessageRepository.findByItemId(id);
    return rows.map(toCanvasChatMessageRecord);
  }

  /** Append one message to a chat node's transcript (idempotent). */
  async appendMessage(params: {
    itemId: string;
    nodeId: string;
    message: {
      id: string;
      role: ChatRole;
      text: string;
      source?: CanvasChatMessageSource;
    };
  }): Promise<void> {
    const id = parseId(params.itemId);
    if (id == null) throw new ServiceError("Invalid item id", "VALIDATION");
    const nodeId = params.nodeId.trim();
    const messageId = params.message.id.trim();
    if (!nodeId || !messageId) {
      throw new ServiceError("Invalid chat message", "VALIDATION");
    }
    await canvasChatMessageRepository.upsert({
      itemId: id,
      nodeId,
      messageId,
      role: params.message.role,
      content: params.message.text,
      source: params.message.source ?? null,
    });
  }

  /** Drop transcripts of chat nodes deleted from the saved graph (GC on save). */
  async pruneMessages(params: {
    itemId: string;
    keepNodeIds: string[];
  }): Promise<void> {
    const id = parseId(params.itemId);
    if (id == null) throw new ServiceError("Invalid item id", "VALIDATION");
    await canvasChatMessageRepository.pruneByItemKeepingNodes(
      id,
      params.keepNodeIds,
    );
  }
}

export const canvasChatService = new CanvasChatService();
