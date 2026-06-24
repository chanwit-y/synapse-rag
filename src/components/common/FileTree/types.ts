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
  /** Whether the user has starred this item (files, canvases, and folders). */
  isFavorite?: boolean;
  children?: TreeNode[];
}

export interface TreeViewGroup {
  id: string;
  name: string;
  directories: TreeNode[];
}

/**
 * Editor a newly-created file should open in. Both store Markdown in `content`;
 * the value only selects the editing surface and is encoded as the file's
 * extension (`.md` for the markdown editor, `.rt` for the Tiptap rich-text one).
 */
export type FileType = "md" | "rt";

/** Filename extension that marks a Tiptap (rich-text) file. */
export const RICH_TEXT_EXTENSION = "rt";

/** True when a file name should open in the Tiptap rich-text editor. */
export function isRichTextFileName(name: string): boolean {
  return /\.rt$/i.test(name);
}

/** Default extension for a given editor type. */
export function fileTypeExtension(fileType: FileType): string {
  return fileType === "rt" ? RICH_TEXT_EXTENSION : "md";
}
