"use server";

import {
  canvasChatService,
  type CanvasChatMessageRecord,
} from "@/server/services";
import type { CanvasChatMessageSource } from "@/server/db/schema/canvas-chat-messages";
import type { ChatRole } from "@/server/db/schema/enums";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

/** Hydrate a canvas's chat nodes: every persisted message, in conversation order. */
export async function listCanvasChatMessagesAction(
  itemId: string,
): Promise<ActionResult<CanvasChatMessageRecord[]>> {
  try {
    return actionSuccess(await canvasChatService.listMessages(itemId));
  } catch (error) {
    return actionFailure(error);
  }
}

/** Append one chat-node message, live (per turn). Idempotent on its message id. */
export async function appendCanvasChatMessageAction(params: {
  itemId: string;
  nodeId: string;
  message: {
    id: string;
    role: ChatRole;
    text: string;
    source?: CanvasChatMessageSource;
  };
}): Promise<ActionResult<void>> {
  try {
    await canvasChatService.appendMessage(params);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}

/** Garbage-collect transcripts of chat nodes dropped from the saved graph. */
export async function pruneCanvasChatMessagesAction(params: {
  itemId: string;
  keepNodeIds: string[];
}): Promise<ActionResult<void>> {
  try {
    await canvasChatService.pruneMessages(params);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}
