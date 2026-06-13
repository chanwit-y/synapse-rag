/** An Azure DevOps project. */
export interface AzureProject {
  id: string;
  name: string;
}

/** An Azure DevOps team within a project. */
export interface AzureTeam {
  id: string;
  name: string;
}

/** A node in the Azure DevOps backlog tree (Epic / Feature / User Story). */
export interface AzureWorkItemNode {
  id: number;
  title: string;
  state: string | null;
  /** `System.WorkItemType`, e.g. "Epic", "Feature", "User Story". */
  type: string;
  /** True when the item has Hierarchy-Forward child links (can be expanded). */
  hasChildren: boolean;
}

export interface ImportUserStoriesResult {
  /** Number of stories imported as new files. */
  imported: number;
  /** Stories skipped because a file with the same id prefix already exists. */
  skipped: number;
  /** File names created, for display. */
  createdNames: string[];
}
