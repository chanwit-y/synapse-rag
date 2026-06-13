import { modelRepository } from "@/server/db/repository";
import { assertFound, parseId, ServiceError } from "../utils";
import { getProviderStrategy } from "./registry";
import type { LlmProvider } from "./types";

type ModelIdLike = number | string;

export type ResolvedModelKey = {
  apiKey: string;
  provider: LlmProvider;
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

  const keyValue = apiKey.keyValue?.trim();
  if (!keyValue) {
    throw new ServiceError("API key is missing a value", "DEPENDENCY");
  }

  return { apiKey: keyValue, provider: strategy.provider };
}
