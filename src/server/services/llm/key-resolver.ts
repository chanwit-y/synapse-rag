import { modelRepository } from "@/server/db/repository";
import { assertFound, parseId, ServiceError } from "../utils";
import { getFoundryToken } from "./azure-credential";
import { getProviderStrategy } from "./registry";
import type { LlmProvider } from "./types";

type ModelIdLike = number | string;

export type ResolvedModelKey = {
  apiKey: string;
  provider: LlmProvider;
  /** The model's configured provider-side id (OpenAI model name / Foundry deployment name). */
  model: string;
  /** OpenAI-compatible base URL, present for providers that need one (Foundry). */
  endpoint?: string;
  /** Azure `api-version` query param, present for providers that need one (Foundry). */
  apiVersion?: string;
};

function toNumericId(modelId: ModelIdLike): number {
  const numericId = typeof modelId === "number" ? modelId : parseId(String(modelId));
  if (numericId == null) {
    throw new ServiceError("Invalid model id", "VALIDATION");
  }
  return numericId;
}

/**
 * Look up a model, validate it has an active API key whose provider matches the
 * model's provider, and return the resolved key + provider. Provider-agnostic —
 * the old OpenAI-only check generalised across every supported provider.
 */
export async function resolveApiKeyForModelId(
  modelId: ModelIdLike,
): Promise<ResolvedModelKey> {
  const model = await modelRepository.findWithRags(toNumericId(modelId));
  const found = assertFound(model, "Model not found");

  // Throws for unsupported providers before we touch the API key.
  const strategy = getProviderStrategy(found.provider);

  const apiKey = found.apiKey;
  if (!apiKey) {
    throw new ServiceError(
      "No API key linked to this model. Select an API key for the model first.",
      "DEPENDENCY",
    );
  }
  if (apiKey.status !== "active") {
    throw new ServiceError("API key is inactive", "DEPENDENCY");
  }
  if (apiKey.provider !== found.provider) {
    throw new ServiceError(
      `API key provider (${apiKey.provider}) does not match model provider (${found.provider}).`,
      "VALIDATION",
    );
  }

  // Microsoft Foundry needs an endpoint and supports two auth modes: a static
  // key, or — when no key value is stored — an Entra ID token minted on demand.
  if (strategy.provider === "microsoft-foundry") {
    const endpoint = apiKey.endpoint?.trim();
    if (!endpoint) {
      throw new ServiceError(
        "Microsoft Foundry API key is missing an endpoint.",
        "DEPENDENCY",
      );
    }
    const staticKey = apiKey.keyValue?.trim();
    const resolvedKey = staticKey || (await getFoundryToken());
    return {
      apiKey: resolvedKey,
      provider: strategy.provider,
      model: found.modelId,
      endpoint,
      apiVersion: apiKey.apiVersion?.trim() || undefined,
    };
  }

  const keyValue = apiKey.keyValue?.trim();
  if (!keyValue) {
    throw new ServiceError("API key is missing a value", "DEPENDENCY");
  }

  return { apiKey: keyValue, provider: strategy.provider, model: found.modelId };
}
