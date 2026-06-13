import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import type { ApiKeyProvider } from "@/server/db/schema/enums";

/** Provider keys that this connector knows how to build LangChain clients for. */
export type LlmProvider = Extract<ApiKeyProvider, "openai" | "anthropic" | "google">;

export type ChatModelOptions = {
  /** Provider-specific model id, e.g. `gpt-4o-mini`, `claude-opus-4-8`, `gemini-1.5-pro`. */
  model?: string;
  temperature?: number;
};

export type EmbeddingsOptions = {
  model?: string;
  /** Output dimensionality. Honoured only by providers that support it (OpenAI). */
  dimensions?: number;
};

/**
 * Strategy interface — one implementation per LLM provider. Each strategy knows
 * how to turn an API key + options into a LangChain chat model or embeddings
 * client. Providers without an embeddings API set {@link supportsEmbeddings} to
 * `false` and throw from {@link createEmbeddings}.
 */
export interface LlmProviderStrategy {
  readonly provider: LlmProvider;
  /** Environment variable holding the fallback API key when none is linked in the DB. */
  readonly apiKeyEnvVar: string;
  readonly supportsEmbeddings: boolean;

  createChatModel(apiKey: string, options?: ChatModelOptions): BaseChatModel;
  createEmbeddings(apiKey: string, options?: EmbeddingsOptions): Embeddings;
}
