import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import type {
  ChatModelOptions,
  EmbeddingsOptions,
  LlmProviderStrategy,
} from "../types";

export const openAiProvider: LlmProviderStrategy = {
  provider: "openai",
  apiKeyEnvVar: "OPENAI_API_KEY",
  supportsEmbeddings: true,

  createChatModel(apiKey: string, options?: ChatModelOptions) {
    return new ChatOpenAI({
      apiKey,
      model: options?.model,
      temperature: options?.temperature,
    });
  },

  createEmbeddings(apiKey: string, options?: EmbeddingsOptions) {
    return new OpenAIEmbeddings({
      apiKey,
      model: options?.model,
      dimensions: options?.dimensions,
    });
  },
};
