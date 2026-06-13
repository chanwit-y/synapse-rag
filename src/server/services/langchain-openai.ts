/**
 * @deprecated Use the provider-agnostic connector in `./llm` instead
 * (`getChatModelFromDb` / `getEmbeddingsFromDb`, which support OpenAI,
 * Anthropic, and Google). These thin wrappers remain for backward
 * compatibility and delegate to the new module.
 */
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import {
  getChatModel,
  getChatModelFromDb,
  getEmbeddings,
  getEmbeddingsFromDb,
  type ChatModelOptions,
  type EmbeddingsOptions,
} from "./llm";

export type OpenAIChatOptions = ChatModelOptions;
export type OpenAIEmbeddingsOptions = EmbeddingsOptions;

type ModelIdLike = number | string;

/** @deprecated Use `getChatModel("openai", options)`. */
export function getOpenAIChatModel(options?: OpenAIChatOptions): BaseChatModel {
  return getChatModel("openai", options);
}

/** @deprecated Use `getEmbeddings("openai", options)`. */
export function getOpenAIEmbeddings(options?: OpenAIEmbeddingsOptions): Embeddings {
  return getEmbeddings("openai", options);
}

/** @deprecated Use `getChatModelFromDb(modelId, options)`. */
export function getOpenAIChatModelFromDb(
  modelId: ModelIdLike,
  options?: OpenAIChatOptions,
): Promise<BaseChatModel> {
  return getChatModelFromDb(modelId, options);
}

/** @deprecated Use `getEmbeddingsFromDb(modelId, options)`. */
export function getOpenAIEmbeddingsFromDb(
  modelId: ModelIdLike,
  options?: OpenAIEmbeddingsOptions,
): Promise<Embeddings> {
  return getEmbeddingsFromDb(modelId, options);
}
