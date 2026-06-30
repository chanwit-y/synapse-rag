"use server";

import { sharePointService } from "@/server/services";
import type {
  SharePointFileEntry,
  SharePointImportParams,
  SharePointImportResult,
} from "@/server/services";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function getSharePointDefaultsAction(): Promise<
  ActionResult<{ site: string; folder: string }>
> {
  try {
    return actionSuccess(await sharePointService.getDefaults());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listSharePointFilesAction(
  site: string,
  folderServerRelativeUrl: string,
): Promise<ActionResult<SharePointFileEntry[]>> {
  try {
    return actionSuccess(
      await sharePointService.listFiles(site, folderServerRelativeUrl),
    );
  } catch (error) {
    return actionFailure(error);
  }
}

export async function importSharePointFilesAction(
  params: SharePointImportParams,
): Promise<ActionResult<SharePointImportResult>> {
  try {
    return actionSuccess(await sharePointService.importFiles(params));
  } catch (error) {
    return actionFailure(error);
  }
}
