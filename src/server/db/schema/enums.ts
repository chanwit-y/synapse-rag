export const itemTypeValues = ["file", "folder", "canvas"] as const;
export type ItemType = (typeof itemTypeValues)[number];

/** Languages a document's content / history snapshot can be in. */
export const contentLangValues = ["en", "th"] as const;
export type ContentLang = (typeof contentLangValues)[number];

/** Author of a canvas chat message (mirrors the client `ChatMessage.role`). */
export const chatRoleValues = ["user", "ai"] as const;
export type ChatRole = (typeof chatRoleValues)[number];

export const apiKeyProviderValues = [
  "openai",
  "anthropic",
  "google",
  "azure-openai",
  "azure-devops",
  "other",
] as const;
export type ApiKeyProvider = (typeof apiKeyProviderValues)[number];

/**
 * Providers an AI model can use — the api-key providers minus integrations that
 * never back a model (e.g. "azure-devops"). The `models` table uses this set.
 */
export const modelProviderValues = [
  "openai",
  "anthropic",
  "google",
  "azure-openai",
  "other",
] as const;
export type ModelProvider = (typeof modelProviderValues)[number];

export function isModelProvider(value: ApiKeyProvider): value is ModelProvider {
  return (modelProviderValues as readonly string[]).includes(value);
}

export const activeStatusValues = ["active", "inactive"] as const;
export type ActiveStatus = (typeof activeStatusValues)[number];

/** Status for an AI instruction template (same shape as activeStatusValues). */
export const aiInstructionStatusValues = ["active", "inactive"] as const;
export type AiInstructionStatus = (typeof aiInstructionStatusValues)[number];

export const modelTypeValues = ["chat", "embedding", "completion"] as const;
export type ModelType = (typeof modelTypeValues)[number];

export const ragMethodValues = ["semantic", "keyword", "hybrid"] as const;
export type RagMethod = (typeof ragMethodValues)[number];

export const ragChunkStrategyValues = [
  "fixed",
  "recursive",
  "markdown",
  "sentence",
] as const;
export type RagChunkStrategy = (typeof ragChunkStrategyValues)[number];

export const ragStatusValues = ["ready", "processing", "failed"] as const;
export type RagStatus = (typeof ragStatusValues)[number];
