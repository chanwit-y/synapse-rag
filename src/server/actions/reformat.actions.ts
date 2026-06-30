"use server";

import { reformatService } from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

/**
 * Re-format the supplied document Markdown with the chosen chat model and return
 * the cleaned Markdown. The client sends the current editor content (so unsaved
 * edits are respected) and previews the result in a diff before persisting.
 */
export async function reformatDocumentAction(
  content: string,
  modelId: string,
): Promise<ActionResult<string>> {
  try {
    return actionSuccess(await reformatService.reformat(content, modelId));
  } catch (error) {
    return actionFailure(error);
  }
}
