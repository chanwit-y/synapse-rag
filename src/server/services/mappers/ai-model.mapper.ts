import type { AiModelRecord } from "@/components/container/ai-model/types";
import type { ApiKey, Model } from "@/server/db/repository";
import { toIdString, toIsoString } from "../utils";

type ModelWithApiKey = Model & { apiKey?: ApiKey | null };

export function toAiModelRecord(row: ModelWithApiKey): AiModelRecord {
  return {
    id: toIdString(row.id),
    apiKeyId: row.apiKeyId != null ? toIdString(row.apiKeyId) : null,
    apiKeyName: row.apiKey?.name ?? null,
    name: row.name,
    provider: row.provider,
    modelId: row.modelId,
    type: row.type,
    contextWindow: row.contextWindow ?? 0,
    temperature: row.temperature,
    isDefault: row.isDefault,
    status: row.status,
    updatedAt: toIsoString(row.updatedAt),
  };
}
