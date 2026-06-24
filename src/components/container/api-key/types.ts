export type ApiKeyProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "azure-openai"
  | "microsoft-foundry"
  | "azure-devops"
  | "other";

export type ApiKeyStatus = "active" | "inactive";

export type ApiKeyRecord = {
  id: string;
  name: string;
  provider: ApiKeyProvider;
  keyMasked: string;
  /** OpenAI-compatible base URL (Microsoft Foundry); null otherwise. */
  endpoint: string | null;
  /** Azure `api-version` (Microsoft Foundry); null otherwise. */
  apiVersion: string | null;
  status: ApiKeyStatus;
  updatedAt: string;
};

export type ApiKeyFormValues = {
  name: string;
  provider: ApiKeyProvider;
  apiKey: string;
  /** Endpoint URL, required for Microsoft Foundry. */
  endpoint?: string;
  /** Azure `api-version`, optional for Microsoft Foundry (defaults server-side). */
  apiVersion?: string;
  active: boolean;
};

