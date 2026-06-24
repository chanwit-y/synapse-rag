import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ServiceError } from "../../utils";
import type {
  ChatModelOptions,
  EmbeddingsOptions,
  LlmProviderStrategy,
} from "../types";

/**
 * Microsoft Foundry (Azure AI Foundry) talks over an OpenAI-compatible
 * `/openai/v1` endpoint, so we reuse the standard LangChain OpenAI clients with
 * a `configuration.baseURL` override. The `apiKey` is either a static Foundry
 * key or an Entra ID bearer token minted upstream in the key-resolver. The
 * `model` is the Foundry **deployment name**.
 *
 * The base URL is per-key and only available via the DB path
 * (`getChatModelFromDb`), so the env-based `getChatModel(provider)` path is not
 * supported — `createChatModel`/`createEmbeddings` throw without a `baseURL`.
 */

/**
 * Build the OpenAI client `configuration` for Foundry. The `/openai/v1` GA
 * surface does NOT require an `api-version` — sending a dated one there returns
 * `400 API version not supported`. So we only attach `api-version` when a key
 * explicitly configures it (e.g. for a legacy `.../openai/deployments` endpoint
 * or a preview feature); otherwise we omit it entirely.
 */
function buildConfiguration(baseURL?: string, apiVersion?: string) {
  const version = apiVersion?.trim();
  return {
    baseURL: requireBaseURL(baseURL),
    ...(version ? { defaultQuery: { "api-version": version } } : {}),
  };
}
function requireBaseURL(baseURL?: string): string {
  const trimmed = baseURL?.trim();
  if (!trimmed) {
    throw new ServiceError(
      "Microsoft Foundry requires an endpoint. Configure it on the API key in Settings → API Key.",
      "VALIDATION",
    );
  }
  return trimmed;
}

export const microsoftFoundryProvider: LlmProviderStrategy = {
  provider: "microsoft-foundry",
  apiKeyEnvVar: "AZURE_FOUNDRY_API_KEY",
  supportsEmbeddings: true,

  createChatModel(apiKey: string, options?: ChatModelOptions) {
    return new ChatOpenAI({
      apiKey,
      model: options?.model,
      temperature: options?.temperature,
      configuration: buildConfiguration(options?.baseURL, options?.apiVersion),
    });
  },

  createEmbeddings(apiKey: string, options?: EmbeddingsOptions) {
    return new OpenAIEmbeddings({
      apiKey,
      model: options?.model,
      dimensions: options?.dimensions,
      configuration: buildConfiguration(options?.baseURL, options?.apiVersion),
    });
  },
};
