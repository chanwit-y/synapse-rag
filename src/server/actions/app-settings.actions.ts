"use server";

import type { BackgroundModelSetting } from "@/components/container/background-model/types";
import { appSettingService } from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function getBackgroundModelSettingAction(): Promise<
  ActionResult<BackgroundModelSetting>
> {
  try {
    return actionSuccess(await appSettingService.getBackgroundModelSetting());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function setBackgroundModelAction(
  modelId: string | null,
): Promise<ActionResult<BackgroundModelSetting>> {
  try {
    return actionSuccess(await appSettingService.setBackgroundChatModel(modelId));
  } catch (error) {
    return actionFailure(error);
  }
}
