import type { ApiKeyProvider, ApiKeyRecord } from "./types";

export const PROVIDER_OPTIONS: { value: ApiKeyProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "azure-openai", label: "Azure OpenAI" },
  { value: "azure-devops", label: "Azure DevOps" },
  { value: "other", label: "Other" },
];

export const INITIAL_API_KEYS: ApiKeyRecord[] = [
  {
    id: "key-1",
    name: "Primary OpenAI",
    provider: "openai",
    keyMasked: "sk-•••••••••••••••••••••2d9A",
    status: "active",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "key-2",
    name: "Anthropic (staging)",
    provider: "anthropic",
    keyMasked: "sk-ant-•••••••••••••••••••••9XqK",
    status: "inactive",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

