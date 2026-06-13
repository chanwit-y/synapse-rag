export type AiModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "azure-openai"
  | "other";

export type AiModelType = "chat" | "embedding" | "completion";

export type AiModelStatus = "active" | "inactive";

export type AiModelRecord = {
  id: string;
  apiKeyId: string | null;
  apiKeyName: string | null;
  name: string;
  provider: AiModelProvider;
  modelId: string;
  type: AiModelType;
  contextWindow: number;
  temperature: number | null;
  isDefault: boolean;
  status: AiModelStatus;
  updatedAt: string;
};

export type AiModelFormValues = {
  apiKeyId: string | null;
  name: string;
  provider: AiModelProvider;
  modelId: string;
  type: AiModelType;
  contextWindow: number;
  temperature: number | null;
  isDefault: boolean;
  active: boolean;
};

export type ApiKeyOption = {
  id: string;
  name: string;
  provider: AiModelProvider;
};
