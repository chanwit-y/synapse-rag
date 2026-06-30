import type { ApiKeyRecord } from "@/components/container/api-key/types";
import type { ApiKey } from "@/server/db/repository";
import { toIdString, toIsoString } from "../utils";

export function toApiKeyRecord(row: ApiKey): ApiKeyRecord {
  return {
    id: toIdString(row.id),
    name: row.name,
    provider: row.provider,
    keyMasked: row.keyMasked,
    endpoint: row.endpoint ?? null,
    apiVersion: row.apiVersion ?? null,
    tenantId: row.tenantId ?? null,
    clientId: row.clientId ?? null,
    sitePath: row.sitePath ?? null,
    folderPath: row.folderPath ?? null,
    status: row.status,
    updatedAt: toIsoString(row.updatedAt),
  };
}
