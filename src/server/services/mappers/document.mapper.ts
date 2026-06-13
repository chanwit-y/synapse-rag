import type { TreeNode, TreeViewGroup } from "@/components/common/FileTree";
import type { Collection, Item } from "@/server/db/repository";
import { toIdString } from "../utils";

export function buildItemTree(
  items: Item[],
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
        content: item.content,
        createdAt: item.createdAt.getTime(),
        updatedAt: item.updatedAt.getTime(),
      };

      if (item.type === "folder") {
        node.children = buildItemTree(items, collectionId, item.id);
      }

      return node;
    });
}

export function toTreeViewGroup(
  collection: Collection,
  items: Item[],
): TreeViewGroup {
  return {
    id: toIdString(collection.id),
    name: collection.name,
    directories: buildItemTree(items, collection.id),
  };
}
