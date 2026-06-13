"use server";

import type {
  AiModelFormValues,
  AiModelRecord,
} from "@/components/container/ai-model/types";
import { aiModelService } from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function listAiModelsAction(): Promise<
  ActionResult<AiModelRecord[]>
> {
  try {
    return actionSuccess(await aiModelService.list());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createAiModelAction(
  values: AiModelFormValues,
): Promise<ActionResult<AiModelRecord>> {
  try {
    return actionSuccess(await aiModelService.create(values));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateAiModelAction(
  id: string,
  values: AiModelFormValues,
): Promise<ActionResult<AiModelRecord>> {
  try {
    return actionSuccess(await aiModelService.update(id, values));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteAiModelAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await aiModelService.remove(id);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listEmbeddingModelsAction(): Promise<
  ActionResult<AiModelRecord[]>
> {
  try {
    return actionSuccess(await aiModelService.listByType("embedding"));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listChatModelsAction(): Promise<ActionResult<AiModelRecord[]>> {
  try {
    return actionSuccess(await aiModelService.listByType("chat"));
  } catch (error) {
    return actionFailure(error);
  }
}
