import type {
  AiModelFormValues,
  AiModelRecord,
  AiModelType,
} from "@/components/container/ai-model/types";
import { apiKeyRepository, modelRepository } from "@/server/db/repository";
import { isModelProvider } from "@/server/db/schema/enums";
import { toAiModelRecord } from "./mappers";
import { assertFound, parseId, ServiceError } from "./utils";

export class AiModelService {
  async list(): Promise<AiModelRecord[]> {
    const rows = await modelRepository.findAll();
    return rows.map(toAiModelRecord);
  }

  async listByType(type: AiModelType): Promise<AiModelRecord[]> {
    const rows = await modelRepository.findByType(type);
    return rows.map(toAiModelRecord);
  }

  async create(values: AiModelFormValues): Promise<AiModelRecord> {
    const apiKeyId = values.apiKeyId ? parseId(values.apiKeyId) : null;

    const provider = await this.resolveProvider(values, apiKeyId);

    if (values.isDefault) {
      await this.clearDefaultForType(values.type);
    }

    const row = await modelRepository.create({
      apiKeyId,
      name: values.name.trim(),
      provider,
      modelId: values.modelId.trim(),
      type: values.type,
      contextWindow: values.contextWindow,
      temperature: values.temperature,
      isDefault: values.isDefault,
      status: values.active ? "active" : "inactive",
    });

    return toAiModelRecord(assertFound(row, "Failed to create model"));
  }

  async update(id: string, values: AiModelFormValues): Promise<AiModelRecord> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid model id", "VALIDATION");
    }

    const apiKeyId = values.apiKeyId ? parseId(values.apiKeyId) : null;

    const provider = await this.resolveProvider(values, apiKeyId);

    if (values.isDefault) {
      await this.clearDefaultForType(values.type, numericId);
    }

    const row = await modelRepository.update(numericId, {
      apiKeyId,
      name: values.name.trim(),
      provider,
      modelId: values.modelId.trim(),
      type: values.type,
      contextWindow: values.contextWindow,
      temperature: values.temperature,
      isDefault: values.isDefault,
      status: values.active ? "active" : "inactive",
    });

    return toAiModelRecord(assertFound(row, "Model not found"));
  }

  async remove(id: string): Promise<void> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid model id", "VALIDATION");
    }

    const row = await modelRepository.delete(numericId);
    assertFound(row, "Model not found");
  }

  private async resolveProvider(
    values: AiModelFormValues,
    apiKeyId: number | null,
  ): Promise<AiModelFormValues["provider"]> {
    if (apiKeyId == null) return values.provider;

    const apiKey = await apiKeyRepository.findById(apiKeyId);
    if (!apiKey) throw new ServiceError("API key not found", "NOT_FOUND");
    if (!isModelProvider(apiKey.provider)) {
      throw new ServiceError(
        `API key provider "${apiKey.provider}" cannot back an AI model`,
        "VALIDATION",
      );
    }
    return apiKey.provider;
  }

  private async clearDefaultForType(
    type: AiModelFormValues["type"],
    exceptId?: number,
  ): Promise<void> {
    const models = await modelRepository.findAll();

    await Promise.all(
      models
        .filter(
          (model) =>
            model.type === type &&
            model.isDefault &&
            model.id !== exceptId,
        )
        .map((model) =>
          modelRepository.update(model.id, { isDefault: false }),
        ),
    );
  }
}

export const aiModelService = new AiModelService();
