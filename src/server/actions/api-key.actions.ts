"use server";

import type {
  ApiKeyFormValues,
  ApiKeyRecord,
} from "@/components/container/api-key/types";
import { apiKeyService } from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function listApiKeysAction(): Promise<ActionResult<ApiKeyRecord[]>> {
  try {
    return actionSuccess(await apiKeyService.list());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createApiKeyAction(
  values: ApiKeyFormValues,
): Promise<ActionResult<ApiKeyRecord>> {
  try {
    return actionSuccess(await apiKeyService.create(values));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateApiKeyAction(
  id: string,
  values: ApiKeyFormValues,
): Promise<ActionResult<ApiKeyRecord>> {
  try {
    return actionSuccess(await apiKeyService.update(id, values));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteApiKeyAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await apiKeyService.remove(id);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}
