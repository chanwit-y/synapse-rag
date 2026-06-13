import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { ragChunks, type NewRagChunk, type RagChunk } from "../schema/rag-chunks";
import { type Database, resolveDb } from "./base";

export class RagChunkRepository {
  constructor(private readonly database: Database = resolveDb()) {}

  findById(id: number) {
    return this.database.query.ragChunks.findFirst({
      where: eq(ragChunks.id, id),
    });
  }

  findByRagId(ragId: number) {
    return this.database.query.ragChunks.findMany({
      where: eq(ragChunks.ragId, ragId),
      orderBy: asc(ragChunks.chunkIndex),
    });
  }

  upsertMany(
    ragId: number,
    chunks: Array<Omit<NewRagChunk, "id" | "ragId">>,
  ): Promise<RagChunk[]> {
    if (chunks.length === 0) return Promise.resolve([]);

    return this.database
      .insert(ragChunks)
      .values(chunks.map((c) => ({ ...c, ragId })))
      .onConflictDoUpdate({
        target: [ragChunks.ragId, ragChunks.chunkIndex],
        set: {
          content: sql`excluded.content`,
          metadata: sql`excluded.metadata`,
          tokenCount: sql`excluded.token_count`,
          embedding: sql`excluded.embedding`,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  deleteByRagId(ragId: number) {
    return this.database.delete(ragChunks).where(eq(ragChunks.ragId, ragId)).returning();
  }

  deleteByIds(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.database.delete(ragChunks).where(inArray(ragChunks.id, ids)).returning();
  }

  findSimilarByRagIds(
    ragIds: number[],
    embedding: number[],
    limit: number,
  ): Promise<RagChunk[]> {
    if (ragIds.length === 0 || limit <= 0) return Promise.resolve([]);
    if (embedding.length === 0) return Promise.resolve([]);

    const queryVector = new Uint8Array(new Float32Array(embedding).buffer);

    return this.database
      .select()
      .from(ragChunks)
      .where(
        and(
          inArray(ragChunks.ragId, ragIds),
          isNotNull(ragChunks.embedding),
        ),
      )
      .orderBy(sql`vec_distance_l2(${ragChunks.embedding}, ${queryVector})`)
      .limit(limit);
  }
}

export const ragChunkRepository = new RagChunkRepository();

export type { RagChunk, NewRagChunk };

