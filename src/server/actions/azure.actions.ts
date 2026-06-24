"use server";

import { azureService } from "@/server/services";
import type {
  AzureProject,
  AzureTeam,
  AzureWorkItemNode,
  ImportUserStoriesResult,
} from "@/server/services";
import type { FileType } from "@/components/common/FileTree/types";
import { actionFailure, actionSuccess, type ActionResult } from "./types";

export async function listAzureProjectsAction(): Promise<
  ActionResult<AzureProject[]>
> {
  try {
    return actionSuccess(await azureService.listProjects());
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listAzureTeamsAction(
  project: string,
): Promise<ActionResult<AzureTeam[]>> {
  try {
    return actionSuccess(await azureService.listTeams(project));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listAzureEpicsAction(
  project: string,
  team: string,
): Promise<ActionResult<AzureWorkItemNode[]>> {
  try {
    return actionSuccess(await azureService.listEpics(project, team));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function listAzureChildrenAction(
  project: string,
  parentId: number,
): Promise<ActionResult<AzureWorkItemNode[]>> {
  try {
    return actionSuccess(await azureService.listChildren(project, parentId));
  } catch (error) {
    return actionFailure(error);
  }
}

export async function importAzureUserStoriesAction(
  collectionId: string,
  project: string,
  workItemIds: number[],
  fileType: FileType,
  folderId?: string | null,
): Promise<ActionResult<ImportUserStoriesResult>> {
  try {
    return actionSuccess(
      await azureService.importUserStories(
        collectionId,
        project,
        workItemIds,
        fileType,
        folderId,
      ),
    );
  } catch (error) {
    return actionFailure(error);
  }
}
