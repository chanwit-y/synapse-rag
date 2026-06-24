import type { TreeNode, TreeViewGroup } from "@/components/common/FileTree";
import type { Collection, Item } from "@/server/db/repository";
import { toIdString } from "../utils";

/**
 * Row shape needed to build the tree — note `content` is intentionally absent.
 * Document text is fetched on demand when a file is opened, not shipped with
 * the tree.
 */
type TreeItemRow = Pick<
  Item,
  "id" | "name" | "type" | "folderId" | "createdAt" | "updatedAt" | "isFavorite"
>;

export function buildItemTree(
  items: TreeItemRow[],
  collectionId: number,
  parentFolderId: number | null = null,
): TreeNode[] {
  const collectionIdStr = toIdString(collectionId);

  return items
    .filter((item) => item.folderId === parentFolderId)
    .map((item) => {
      const node: TreeNode = {
        id: toIdString(item.id),
        collectionId: collectionIdStr,
        name: item.name,
        type: item.type,
        createdAt: item.createdAt.getTime(),
        updatedAt: item.updatedAt.getTime(),
        isFavorite: item.isFavorite,
      };

      if (item.type === "folder") {
        node.children = buildItemTree(items, collectionId, item.id);
      }

      return node;
    });
}

export function toTreeViewGroup(
  collection: Collection,
  items: TreeItemRow[],
): TreeViewGroup {
  return {
    id: toIdString(collection.id),
    name: collection.name,
    directories: buildItemTree(items, collection.id),
  };
}
