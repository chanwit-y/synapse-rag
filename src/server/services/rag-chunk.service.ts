import {
  modelRepository,
  ragChunkRepository,
  ragRepository,
  type NewRagChunk,
  type RagChunk,
} from "@/server/db/repository";
import { getEmbeddingsFromDb } from "./llm";
import { assertFound, parseId, ServiceError } from "./utils";

export type RagChunkUpsert = Omit<NewRagChunk, "id" | "ragId">;

const EMBED_BATCH_SIZE = 100;

export class RagChunkService {
  async listByRagId(ragId: string): Promise<RagChunk[]> {
    const numericId = parseId(ragId);
    if (numericId == null) {
      throw new ServiceError("Invalid RAG id", "VALIDATION");
    }

    const rag = await ragRepository.findById(numericId);
    assertFound(rag, "RAG config not found");

    return ragChunkRepository.findByRagId(numericId);
  }

  async upsertMany(ragId: string, chunks: RagChunkUpsert[]): Promise<RagChunk[]> {
    const numericId = parseId(ragId);
    if (numericId == null) {
      throw new ServiceError("Invalid RAG id", "VALIDATION");
    }

    const rag = await ragRepository.findById(numericId);
    assertFound(rag, "RAG config not found");

    if (chunks.length === 0) return [];

    return ragChunkRepository.upsertMany(numericId, this.validateChunks(chunks));
  }

  async embedAndUpsertMany(
    ragId: string,
    chunks: RagChunkUpsert[],
    embeddingModel: string,
  ): Promise<RagChunk[]> {
    const numericId = parseId(ragId);
    if (numericId == null) {
      throw new ServiceError("Invalid RAG id", "VALIDATION");
    }

    const rag = await ragRepository.findById(numericId);
    assertFound(rag, "RAG config not found");

    if (chunks.length === 0) return [];

    const prepared = this.validateChunks(chunks);

    await ragRepository.update(numericId, { status: "processing" });

    try {
      const model = await this.resolveEmbeddingModel(embeddingModel);
      const embeddings = await getEmbeddingsFromDb(model.id, {
        model: model.modelId,
      });

      const texts = prepared.map((c) => c.content);
      const vectors: number[][] = [];

      for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
        const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
        const batchVectors = await embeddings.embedDocuments(batch);
        vectors.push(...batchVectors);
      }

      const withEmbeddings = prepared.map((chunk, i) => ({
        ...chunk,
        embedding: vectors[i],
      }));

      const result = await ragChunkRepository.upsertMany(numericId, withEmbeddings);

      await ragRepository.update(numericId, {
        status: "ready",
        chunkCount: result.length,
      });

      return result;
    } catch (error) {
      await ragRepository.update(numericId, { status: "failed" });
      throw error;
    }
  }

  async deleteByRagId(ragId: string): Promise<number> {
    const numericId = parseId(ragId);
    if (numericId == null) {
      throw new ServiceError("Invalid RAG id", "VALIDATION");
    }

    const rag = await ragRepository.findById(numericId);
    assertFound(rag, "RAG config not found");

    const deleted = await ragChunkRepository.deleteByRagId(numericId);
    return deleted.length;
  }

  private validateChunks(chunks: RagChunkUpsert[]) {
    return chunks.map((chunk) => {
      if (!Number.isInteger(chunk.chunkIndex) || chunk.chunkIndex < 0) {
        throw new ServiceError("Invalid chunkIndex", "VALIDATION");
      }
      if (!chunk.content?.trim()) {
        throw new ServiceError("Chunk content is required", "VALIDATION");
      }
      return { ...chunk, content: chunk.content };
    });
  }

  private async resolveEmbeddingModel(
    requestedModelId: string,
  ): Promise<{ id: number; modelId: string }> {
    const active = await modelRepository.findActive();

    const match = active.find(
      (m) => m.type === "embedding" && m.modelId === requestedModelId,
    );
    if (match) return { id: match.id, modelId: match.modelId };

    const fallback = active.find((m) => m.type === "embedding");
    if (fallback) return { id: fallback.id, modelId: fallback.modelId };

    throw new ServiceError(
      "No embedding model found. Add an embedding model with an API key first.",
      "DEPENDENCY",
    );
  }
}

export const ragChunkService = new RagChunkService();

