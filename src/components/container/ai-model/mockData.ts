import type { AiModelProvider } from "./types";

export const PROVIDER_OPTIONS: { value: AiModelProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "azure-openai", label: "Azure OpenAI" },
  { value: "microsoft-foundry", label: "Microsoft Foundry" },
  { value: "other", label: "Other" },
];

export const MODEL_TYPE_OPTIONS = [
  { value: "chat", label: "Chat" },
  { value: "embedding", label: "Embedding" },
  { value: "completion", label: "Completion" },
] as const;

export const MODEL_ID_OPTIONS: Record<
  AiModelProvider,
  { value: string; label: string; type?: "chat" | "embedding" | "completion" }[]
> = {
  openai: [
    { value: "gpt-4o", label: "gpt-4o", type: "chat" },
    { value: "gpt-4o-mini", label: "gpt-4o-mini", type: "chat" },
    { value: "gpt-4-turbo", label: "gpt-4-turbo", type: "chat" },
    { value: "text-embedding-3-small", label: "text-embedding-3-small", type: "embedding" },
    { value: "text-embedding-3-large", label: "text-embedding-3-large", type: "embedding" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "claude-sonnet-4-20250514", type: "chat" },
    { value: "claude-3-5-haiku-20241022", label: "claude-3-5-haiku-20241022", type: "chat" },
  ],
  google: [
    { value: "gemini-2.0-flash", label: "gemini-2.0-flash", type: "chat" },
    { value: "gemini-1.5-pro", label: "gemini-1.5-pro", type: "chat" },
    { value: "text-embedding-004", label: "text-embedding-004", type: "embedding" },
  ],
  "azure-openai": [
    { value: "gpt-4o", label: "gpt-4o (deployment)", type: "chat" },
    { value: "text-embedding-3-small", label: "text-embedding-3-small", type: "embedding" },
  ],
  // Foundry models are deployment names — entered free-form (no presets).
  "microsoft-foundry": [],
  other: [],
};
