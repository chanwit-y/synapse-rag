"use server";

import type {
  ChunkRecord,
  DocumentOption,
  RagFormValues,
  RagRecord,
} from "@/components/container/rag/types";
import { ragService } from "@/server/services";
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
