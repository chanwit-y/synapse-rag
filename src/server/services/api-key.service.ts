import type {
  ApiKeyFormValues,
  ApiKeyRecord,
} from "@/components/container/api-key/types";
import { apiKeyRepository, type NewApiKey } from "@/server/db/repository";
import { toApiKeyRecord } from "./mappers";
import { assertFound, maskKey, parseId, ServiceError } from "./utils";

export class ApiKeyService {
  async list(): Promise<ApiKeyRecord[]> {
    const rows = await apiKeyRepository.findAll();
    return rows.map(toApiKeyRecord);
  }

  async create(values: ApiKeyFormValues): Promise<ApiKeyRecord> {
    const apiKey = values.apiKey.trim();
    if (!apiKey) {
      throw new ServiceError("API key is required", "VALIDATION");
    }

    const row = await apiKeyRepository.create({
      name: values.name.trim(),
      provider: values.provider,
      keyValue: apiKey,
      keyMasked: maskKey(apiKey),
      status: values.active ? "active" : "inactive",
    });

    return toApiKeyRecord(assertFound(row, "Failed to create API key"));
  }

  async update(id: string, values: ApiKeyFormValues): Promise<ApiKeyRecord> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid API key id", "VALIDATION");
    }

    const patch: Partial<Omit<NewApiKey, "id">> = {
      name: values.name.trim(),
      provider: values.provider,
      status: values.active ? "active" : "inactive",
    };

    const apiKey = values.apiKey.trim();
    if (apiKey) {
      patch.keyValue = apiKey;
      patch.keyMasked = maskKey(apiKey);
    }

    const row = await apiKeyRepository.update(numericId, patch);
    return toApiKeyRecord(assertFound(row, "API key not found"));
  }

  async remove(id: string): Promise<void> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid API key id", "VALIDATION");
    }

    const row = await apiKeyRepository.delete(numericId);
    assertFound(row, "API key not found");
  }
}

export const apiKeyService = new ApiKeyService();
