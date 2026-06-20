"use server";

import { tagService, type TagRecord } from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function listAllTagsAction(): Promise<ActionResult<TagRecord[]>> {
  try {
    return actionSuccess(await tagService.listAllTags());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listAllItemTagsAction(): Promise<
  ActionResult<Record<string, TagRecord[]>>
> {
  try {
    return actionSuccess(await tagService.listAllItemTags());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listItemTagsAction(
  itemId: string,
): Promise<ActionResult<TagRecord[]>> {
  try {
    return actionSuccess(await tagService.listTagsForItem(itemId));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function addItemTagAction(
  itemId: string,
  name: string,
): Promise<ActionResult<TagRecord>> {
  try {
    return actionSuccess(await tagService.addTagToItem(itemId, name));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function removeItemTagAction(
  itemId: string,
  tagId: string,
): Promise<ActionResult<void>> {
  try {
    await tagService.removeTagFromItem(itemId, tagId);
    return actionSuccess(undefined);
  } catch (error) {
    return actionFailure(error);
  }
}
