import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import type {
  ChatModelOptions,
  EmbeddingsOptions,
  LlmProviderStrategy,
} from "../types";

export const googleProvider: LlmProviderStrategy = {
  provider: "google",
  apiKeyEnvVar: "GOOGLE_API_KEY",
  supportsEmbeddings: true,

  createChatModel(apiKey: string, options?: ChatModelOptions) {
    return new ChatGoogleGenerativeAI({
      apiKey,
      model: options?.model ?? "gemini-1.5-flash",
      temperature: options?.temperature,
    });
  },

  createEmbeddings(apiKey: string, options?: EmbeddingsOptions) {
    // Gemini embeddings have no dimensions parameter.
    return new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: options?.model ?? "text-embedding-004",
    });
  },
};
