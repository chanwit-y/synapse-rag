"use server";

import type { RagChunk } from "@/server/db/repository";
import { ragChunkService, type RagChunkUpsert } from "@/server/services/rag-chunk.service";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function listRagChunksAction(
  ragId: string,
): Promise<ActionResult<RagChunk[]>> {
  try {
    return actionSuccess(await ragChunkService.listByRagId(ragId));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function upsertRagChunksAction(
  ragId: string,
  chunks: RagChunkUpsert[],
): Promise<ActionResult<RagChunk[]>> {
  try {
    return actionSuccess(await ragChunkService.upsertMany(ragId, chunks));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function embedAndUpsertRagChunksAction(
  ragId: string,
  chunks: RagChunkUpsert[],
  embeddingModel: string,
): Promise<ActionResult<RagChunk[]>> {
  try {
    return actionSuccess(
      await ragChunkService.embedAndUpsertMany(ragId, chunks, embeddingModel),
    );
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteRagChunksByRagIdAction(
  ragId: string,
): Promise<ActionResult<{ deleted: number }>> {
  try {
    const deleted = await ragChunkService.deleteByRagId(ragId);
    return actionSuccess({ deleted });
  } catch (error) {
    return actionFailure(error);
  }
}

