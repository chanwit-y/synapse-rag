import type { AiModelProvider } from "@/components/container/ai-model/types";

/** The configured background-model setting as seen by the client. */
export type BackgroundModelSetting = {
  /**
   * The chat model id used for background tasks (query expansion, context
   * summary, wiki grounding), or `null` when unset — in which case those tasks
   * fall back to the chat's own selected model.
   */
  modelId: string | null;
};

/** An active chat model offered in the background-model picker. */
export type BackgroundModelOption = {
  id: string;
  name: string;
  modelId: string;
  provider: AiModelProvider;
};
