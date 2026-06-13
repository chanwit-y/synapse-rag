import type {
  DocumentOption,
  RagFormValues,
  RagRecord,
} from "@/components/container/rag/types";
import {
  itemRagRepository,
  itemRepository,
  modelRepository,
  ragRepository,
} from "@/server/db/repository";
import { toDocumentOption, toRagRecord } from "./mappers";
import { assertFound, parseId, ServiceError } from "./utils";

export class RagService {
  async list(): Promise<RagRecord[]> {
    const rows = await ragRepository.findAll();

    return Promise.all(
      rows.map(async (row) => {
        const withItems = await ragRepository.findWithItems(row.id);
        return toRagRecord(assertFound(withItems, "RAG config not found"));
      }),
    );
  }

  async listDocuments(): Promise<DocumentOption[]> {
    const items = await this.findAllFileItems();
    return items.map((item) => toDocumentOption(item));
  }

  async create(values: RagFormValues, chunkCount: number): Promise<RagRecord> {
    const modelId = await this.resolveModelId(values.embeddingModel);
    const documentIds = values.documentIds
      .map(parseId)
      .filter((id): id is number => id != null);

    const row = await ragRepository.create({
      name: values.name.trim(),
      modelId,
      method: values.method,
      chunkSize: values.chunkSize,
      chunkOverlap: values.chunkOverlap,
      embeddingModel: values.embeddingModel || null,
      includeMetadata: values.includeMetadata,
      chunkCount,
      status: "ready",
    });

    const created = assertFound(row, "Failed to create RAG config");
    await this.syncDocumentLinks(created.id, documentIds);

    const withItems = await ragRepository.findWithItems(created.id);
    return toRagRecord(assertFound(withItems, "RAG config not found"));
  }

  async update(
    id: string,
    values: RagFormValues,
    chunkCount: number,
  ): Promise<RagRecord> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid RAG id", "VALIDATION");
    }

    const modelId = await this.resolveModelId(values.embeddingModel);
    const documentIds = values.documentIds
      .map(parseId)
      .filter((docId): docId is number => docId != null);

    const row = await ragRepository.update(numericId, {
      name: values.name.trim(),
      modelId,
      method: values.method,
      chunkSize: values.chunkSize,
      chunkOverlap: values.chunkOverlap,
      embeddingModel: values.embeddingModel || null,
      includeMetadata: values.includeMetadata,
      chunkCount,
      status: "ready",
    });

    assertFound(row, "RAG config not found");
    await itemRagRepository.unlinkAllByRagId(numericId);
    await this.syncDocumentLinks(numericId, documentIds);

    const withItems = await ragRepository.findWithItems(numericId);
    return toRagRecord(assertFound(withItems, "RAG config not found"));
  }

  async remove(id: string): Promise<void> {
    const numericId = parseId(id);
    if (numericId == null) {
      throw new ServiceError("Invalid RAG id", "VALIDATION");
    }

    await itemRagRepository.unlinkAllByRagId(numericId);
    const row = await ragRepository.delete(numericId);
    assertFound(row, "RAG config not found");
  }

  private async syncDocumentLinks(
    ragId: number,
    documentIds: number[],
  ): Promise<void> {
    await Promise.all(
      documentIds.map((itemId) => itemRagRepository.link({ itemId, ragId })),
    );
  }

  private async resolveModelId(embeddingModel?: string): Promise<number> {
    const models = await modelRepository.findActive();

    if (embeddingModel) {
      const match = models.find(
        (model) =>
          model.type === "embedding" && model.modelId === embeddingModel,
      );
      if (match) return match.id;
    }

    const embedding = models.find((model) => model.type === "embedding");
    if (embedding) return embedding.id;

    const fallback = models[0];
    if (fallback) return fallback.id;

    throw new ServiceError(
      "No AI model available. Add an embedding or chat model first.",
      "DEPENDENCY",
    );
  }

  private async findAllFileItems() {
    const { db } = await import("@/server/db");
    const { items } = await import("@/server/db/schema/items");
    const { asc, eq } = await import("drizzle-orm");

    return db.query.items.findMany({
      where: eq(items.type, "file"),
      with: { collection: true },
      orderBy: asc(items.name),
    });
  }
}

export const ragService = new RagService();
