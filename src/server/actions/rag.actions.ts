"use server";

import type {
  ChunkRecord,
  DocumentOption,
  RagFormValues,
  RagRecord,
} from "@/components/container/rag/types";
import { chunkingService, ragService } from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function listRagsAction(): Promise<ActionResult<RagRecord[]>> {
  try {
    return actionSuccess(await ragService.list());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listRagDocumentsAction(): Promise<
  ActionResult<DocumentOption[]>
> {
  try {
    return actionSuccess(await ragService.listDocuments());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createRagAction(
  values: RagFormValues,
  chunks: ChunkRecord[],
): Promise<ActionResult<RagRecord>> {
  try {
    return actionSuccess(await ragService.create(values, chunks.length));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateRagAction(
  id: string,
  values: RagFormValues,
  chunks: ChunkRecord[],
): Promise<ActionResult<RagRecord>> {
  try {
    return actionSuccess(await ragService.update(id, values, chunks.length));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteRagAction(id: string): Promise<ActionResult<void>> {
  try {
    await ragService.remove(id);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}

/**
 * Server-side chunk preview for the RAG modal. Loads the selected documents and
 * runs the chosen strategy (incl. token sizing, custom separators, per-format
 * `auto`, and embedding-based `semantic`), returning the resulting chunks.
 */
export async function previewRagChunksAction(
  documentIds: string[],
  values: Pick<
    RagFormValues,
    | "chunkStrategy"
    | "sizingUnit"
    | "chunkSize"
    | "chunkOverlap"
    | "customSeparators"
    | "semanticThreshold"
    | "embeddingModel"
  >,
  lang: "en" | "th",
): Promise<ActionResult<ChunkRecord[]>> {
  try {
    return actionSuccess(
      await chunkingService.preview(documentIds, {
        strategy: values.chunkStrategy,
        sizingUnit: values.sizingUnit,
        chunkSize: values.chunkSize,
        chunkOverlap: values.chunkOverlap,
        customSeparators: values.customSeparators,
        semanticThreshold: values.semanticThreshold,
        embeddingModel: values.embeddingModel,
        lang,
      }),
    );
  } catch (error) {
    return actionFailure(error);
  }
}
