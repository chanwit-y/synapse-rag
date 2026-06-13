export type ApiKeyProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "azure-openai"
  | "azure-devops"
  | "other";

export type ApiKeyStatus = "active" | "inactive";

export type ApiKeyRecord = {
  id: string;
  name: string;
  provider: ApiKeyProvider;
  keyMasked: string;
  status: ApiKeyStatus;
  updatedAt: string;
};

export type ApiKeyFormValues = {
  name: string;
  provider: ApiKeyProvider;
  apiKey: string;
  active: boolean;
};

