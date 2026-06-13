import { ChatAnthropic } from "@langchain/anthropic";
import { ServiceError } from "../../utils";
import type { ChatModelOptions, LlmProviderStrategy } from "../types";

export const anthropicProvider: LlmProviderStrategy = {
  provider: "anthropic",
  apiKeyEnvVar: "ANTHROPIC_API_KEY",
  // Anthropic does not expose an embeddings API.
  supportsEmbeddings: false,

  createChatModel(apiKey: string, options?: ChatModelOptions) {
    return new ChatAnthropic({
      apiKey,
      model: options?.model,
      temperature: options?.temperature,
    });
  },

  createEmbeddings(): never {
    throw new ServiceError(
      "Anthropic does not provide an embeddings API. Use an OpenAI or Google model for embeddings.",
      "VALIDATION",
    );
  },
};
