export interface TreeNode {
  id: string;
  collectionId: string;
  name: string;
  type: "folder" | "file" | "canvas";
  icon?: string | null;
  extension?: string | null;
  content?: string | null;
  createdAt?: number;
  updatedAt?: number;
  children?: TreeNode[];
}

export interface TreeViewGroup {
  id: string;
  name: string;
  directories: TreeNode[];
}

export type FileType = "md" | "file";
