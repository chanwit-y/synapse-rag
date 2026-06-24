import { ServiceError } from "../utils";
import { anthropicProvider } from "./providers/anthropic.provider";
import { googleProvider } from "./providers/google.provider";
import { microsoftFoundryProvider } from "./providers/microsoft-foundry.provider";
import { openAiProvider } from "./providers/openai.provider";
import type { LlmProvider, LlmProviderStrategy } from "./types";

/** Registry mapping a provider key to its strategy. Add a provider in one place. */
const PROVIDERS: Record<LlmProvider, LlmProviderStrategy> = {
  openai: openAiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  "microsoft-foundry": microsoftFoundryProvider,
};

export function isSupportedProvider(provider: string): provider is LlmProvider {
  return provider in PROVIDERS;
}

/** Resolve the strategy for a provider, or throw a typed error for unsupported ones. */
export function getProviderStrategy(provider: string): LlmProviderStrategy {
  if (!isSupportedProvider(provider)) {
    throw new ServiceError(
      `Unsupported LLM provider: ${provider}. Supported providers: ${Object.keys(
        PROVIDERS,
      ).join(", ")}.`,
      "VALIDATION",
    );
  }
  return PROVIDERS[provider];
}
