"use server";

import type {
  AiInstructionFormValues,
  AiInstructionRecord,
} from "@/components/container/ai-instruction/types";
import { aiInstructionService } from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function listAiInstructionsAction(): Promise<
  ActionResult<AiInstructionRecord[]>
> {
  try {
    return actionSuccess(await aiInstructionService.list());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listActiveAiInstructionsAction(): Promise<
  ActionResult<AiInstructionRecord[]>
> {
  try {
    return actionSuccess(await aiInstructionService.listActive());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createAiInstructionAction(
  values: AiInstructionFormValues,
): Promise<ActionResult<AiInstructionRecord>> {
  try {
    return actionSuccess(await aiInstructionService.create(values));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateAiInstructionAction(
  id: string,
  values: AiInstructionFormValues,
): Promise<ActionResult<AiInstructionRecord>> {
  try {
    return actionSuccess(await aiInstructionService.update(id, values));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteAiInstructionAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await aiInstructionService.remove(id);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}
