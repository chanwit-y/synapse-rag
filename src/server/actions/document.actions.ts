"use server";

import type { TreeNode, TreeViewGroup } from "@/components/common/FileTree";
import { documentService } from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";
import type { History } from "@/server/db/repository/history.repository";
import type { ContentLang } from "@/server/db/schema/enums";

export async function listCollectionsAction(): Promise<
  ActionResult<TreeViewGroup[]>
> {
  try {
    return actionSuccess(await documentService.listCollections());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createCollectionAction(
  name: string,
): Promise<ActionResult<TreeViewGroup>> {
  try {
    return actionSuccess(await documentService.createCollection(name));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteCollectionAction(
  collectionId: string,
): Promise<ActionResult<void>> {
  try {
    await documentService.deleteCollection(collectionId);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function renameCollectionAction(
  collectionId: string,
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    return actionSuccess(await documentService.renameCollection(collectionId, name));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function renameDocumentItemAction(
  itemId: string,
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    return actionSuccess(await documentService.renameItem(itemId, name));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function syncCollectionDirectoriesAction(
  collectionId: string,
  directories: TreeNode[],
): Promise<ActionResult<void>> {
  try {
    await documentService.syncDirectories(collectionId, directories);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteDocumentItemAction(
  itemId: string,
): Promise<ActionResult<void>> {
  try {
    await documentService.deleteItem(itemId);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function getDocumentItemContentAction(
  itemId: string,
): Promise<ActionResult<{ content: string }>> {
  try {
    return actionSuccess({ content: await documentService.getItemContent(itemId) });
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createCanvasAction(params: {
  collectionId: string;
  folderId: string | null;
  name: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    return actionSuccess(await documentService.createCanvas(params));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function saveDocumentContentAction(params: {
  id: string | null;
  name: string;
  content: string;
  collectionId: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    return actionSuccess(await documentService.saveFileContent(params));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function uploadDocumentImageAction(
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return actionFailure(new Error("No image file provided"));
    }
    return actionSuccess(await documentService.uploadImage(file));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function uploadCanvasImageAction(
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return actionFailure(new Error("No image file provided"));
    }
    return actionSuccess(await documentService.uploadCanvasImage(file));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteCanvasImageAction(
  path: string,
): Promise<ActionResult<void>> {
  try {
    await documentService.deleteCanvasImage(path);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listDocumentHistoryAction(
  itemId: string,
  lang?: ContentLang,
): Promise<ActionResult<History[]>> {
  try {
    return actionSuccess(await documentService.listFileHistory(itemId, lang));
  } catch (error) {
    return actionFailure(error);
  }
}

/**
 * Return the Thai translation of a document, generating (and caching) it on
 * demand. `retranslated` is false when a cached, up-to-date translation was
 * reused (no AI call).
 */
export async function ensureDocumentTranslationAction(
  itemId: string,
  modelId: string,
): Promise<ActionResult<{ content: string; retranslated: boolean }>> {
  try {
    return actionSuccess(await documentService.getTranslation(itemId, modelId));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function saveDocumentTranslationAction(
  itemId: string,
  content: string,
): Promise<ActionResult<void>> {
  try {
    await documentService.saveTranslation(itemId, content);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}
