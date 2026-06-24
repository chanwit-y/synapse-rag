import type {
  ApiKeyFormValues,
  ApiKeyRecord,
} from "@/components/container/api-key/types";
import { apiKeyRepository, type NewApiKey } from "@/server/db/repository";
import { toApiKeyRecord } from "./mappers";
import { assertFound, maskKey, parseId, ServiceError } from "./utils";

/** Masked label shown for a Foundry key running in Entra ID token mode. */
const FOUNDRY_TOKEN_MASK = "Entra ID token";

function foundryAwareMask(apiKey: string, isFoundry: boolean): string {
  if (isFoundry && !apiKey) return FOUNDRY_TOKEN_MASK;
  return maskKey(apiKey);
}

/**
 * Normalize a Microsoft Foundry endpoint. If the user pastes only the resource
 * host (no path), append the OpenAI-compatible inference path `/openai/v1`.
 * Existing paths (e.g. `/openai/v1`, or a legacy `/openai/deployments/...`) are
 * left untouched. Returns null for blank input.
 */
function normalizeFoundryEndpoint(raw?: string): string | null {
  const trimmed = raw?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.pathname === "" || url.pathname === "/") {
      url.pathname = "/openai/v1";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Not a parseable URL — leave as-is; downstream usage will surface the error.
  }
  return trimmed;
}

/**
 * Sanitize a Foundry `api-version`. A real value is a date or `preview`; a value
 * containing `/` means the user pasted a URL path into the wrong field, so we
 * drop it rather than send a broken query param.
 */
function sanitizeApiVersion(raw?: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.includes("/")) return null;
  return trimmed;
}

export class ApiKeyService {
  async list(): Promise<ApiKeyRecord[]> {
    const rows = await apiKeyRepository.findAll();
    return rows.map(toApiKeyRecord);
  }

  async create(values: ApiKeyFormValues): Promise<ApiKeyRecord> {
    const isFoundry = values.provider === "microsoft-foundry";
    const apiKey = values.apiKey.trim();
    const endpoint = isFoundry ? normalizeFoundryEndpoint(values.endpoint) : null;

    if (isFoundry) {
      // Foundry requires an endpoint; the key is optional (blank ⇒ Entra ID token).
      if (!endpoint) {
        throw new ServiceError(
          "Endpoint is required for Microsoft Foundry.",
          "VALIDATION",
        );
      }
    } else if (!apiKey) {
      throw new ServiceError("API key is required", "VALIDATION");
    }

    const row = await apiKeyRepository.create({
      name: values.name.trim(),
      provider: values.provider,
      keyValue: apiKey,
      keyMasked: foundryAwareMask(apiKey, isFoundry),
      endpoint,
      apiVersion: isFoundry ? sanitizeApiVersion(values.apiVersion) : null,
      status: values.active ? "active" : "inactive",
    });

    return toApiKeyRecord(assertFound(row, "Failed to create API key"));
  }

  async update(id: string, values: ApiKeyFormValues): Promise<ApiKeyRecord> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid API key id", "VALIDATION");
    }

    const isFoundry = values.provider === "microsoft-foundry";

    const patch: Partial<Omit<NewApiKey, "id">> = {
      name: values.name.trim(),
      provider: values.provider,
      status: values.active ? "active" : "inactive",
    };

    // Endpoint only applies to Foundry; clear it for other providers.
    if (isFoundry) {
      const endpoint = normalizeFoundryEndpoint(values.endpoint);
      if (!endpoint) {
        throw new ServiceError(
          "Endpoint is required for Microsoft Foundry.",
          "VALIDATION",
        );
      }
      patch.endpoint = endpoint;
      patch.apiVersion = sanitizeApiVersion(values.apiVersion);
    } else {
      patch.endpoint = null;
      patch.apiVersion = null;
    }

    const apiKey = values.apiKey.trim();
    if (apiKey) {
      patch.keyValue = apiKey;
      patch.keyMasked = foundryAwareMask(apiKey, isFoundry);
    } else if (isFoundry) {
      // Switching a Foundry key to token mode: blank out the stored key.
      patch.keyValue = "";
      patch.keyMasked = foundryAwareMask("", true);
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
