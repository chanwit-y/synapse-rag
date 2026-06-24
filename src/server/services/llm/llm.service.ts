import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import { ServiceError } from "../utils";
import { resolveApiKeyForModelId } from "./key-resolver";
import { getProviderStrategy } from "./registry";
import type {
  ChatModelOptions,
  EmbeddingsOptions,
  LlmProvider,
} from "./types";

type ModelIdLike = number | string;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ServiceError(`Missing required env var: ${name}`, "DEPENDENCY");
  }
  return value;
}

/** Build a chat model for a provider using its API key from the environment. */
export function getChatModel(
  provider: LlmProvider,
  options?: ChatModelOptions,
): BaseChatModel {
  const strategy = getProviderStrategy(provider);
  return strategy.createChatModel(requireEnv(strategy.apiKeyEnvVar), options);
}

/** Build an embeddings client for a provider using its API key from the environment. */
export function getEmbeddings(
  provider: LlmProvider,
  options?: EmbeddingsOptions,
): Embeddings {
  const strategy = getProviderStrategy(provider);
  if (!strategy.supportsEmbeddings) {
    return strategy.createEmbeddings(""); // throws a descriptive ServiceError
  }
  return strategy.createEmbeddings(requireEnv(strategy.apiKeyEnvVar), options);
}

/**
 * Build a chat model from a stored model row, resolving the provider and its
 * linked API key from the database. Returns a LangChain {@link BaseChatModel}
 * regardless of provider, so callers use a uniform `.invoke()` interface.
 */
export async function getChatModelFromDb(
  modelId: ModelIdLike,
  options?: ChatModelOptions,
): Promise<BaseChatModel> {
  const { apiKey, provider, model, endpoint, apiVersion } =
    await resolveApiKeyForModelId(modelId);
  return getProviderStrategy(provider).createChatModel(apiKey, {
    model,
    ...options,
    baseURL: endpoint ?? options?.baseURL,
    apiVersion: apiVersion ?? options?.apiVersion,
  });
}

/** Build an embeddings client from a stored model row (resolves provider + key from the DB). */
export async function getEmbeddingsFromDb(
  modelId: ModelIdLike,
  options?: EmbeddingsOptions,
): Promise<Embeddings> {
  const { apiKey, provider, model, endpoint, apiVersion } =
    await resolveApiKeyForModelId(modelId);
  const strategy = getProviderStrategy(provider);
  if (!strategy.supportsEmbeddings) {
    throw new ServiceError(
      `Provider ${provider} does not support embeddings.`,
      "VALIDATION",
    );
  }
  return strategy.createEmbeddings(apiKey, {
    model,
    ...options,
    baseURL: endpoint ?? options?.baseURL,
    apiVersion: apiVersion ?? options?.apiVersion,
  });
}
