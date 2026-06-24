import type { BackgroundModelSetting } from "@/components/container/background-model/types";
import { appSettingRepository, modelRepository } from "@/server/db/repository";
import { parseId, ServiceError } from "./utils";

/** Setting key for the chat model used by background utility tasks. */
const BACKGROUND_CHAT_MODEL_KEY = "background_chat_model";

/**
 * Reads/writes singleton app settings. Today it backs the "background model"
 * choice — the chat model used by query expansion, context summarization, and
 * wiki grounding. When unset, those services fall back to the caller's model.
 */
export class AppSettingService {
  /** The configured background chat model id (as a string), or null when unset. */
  async getBackgroundChatModelId(): Promise<string | null> {
    const row = await appSettingRepository.findByKey(BACKGROUND_CHAT_MODEL_KEY);
    return row?.modelId != null ? String(row.modelId) : null;
  }

  async getBackgroundModelSetting(): Promise<BackgroundModelSetting> {
    return { modelId: await this.getBackgroundChatModelId() };
  }

  /** Set (or clear, with null/"") the background chat model. */
  async setBackgroundChatModel(
    modelId: string | null,
  ): Promise<BackgroundModelSetting> {
    let numericId: number | null = null;

    if (modelId != null && modelId !== "") {
      numericId = parseId(modelId);
      if (numericId == null) {
        throw new ServiceError("Invalid model id", "VALIDATION");
      }
      const model = await modelRepository.findById(numericId);
      if (!model) {
        throw new ServiceError("Model not found", "NOT_FOUND");
      }
      if (model.type !== "chat") {
        throw new ServiceError(
          "Background model must be a chat model",
          "VALIDATION",
        );
      }
    }

    await appSettingRepository.setModelId(BACKGROUND_CHAT_MODEL_KEY, numericId);
    return { modelId: numericId != null ? String(numericId) : null };
  }
}

export const appSettingService = new AppSettingService();
