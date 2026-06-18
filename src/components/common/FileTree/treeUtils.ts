import type { TreeNode } from "./types";

export function parseDirectories(raw: unknown): TreeNode[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as TreeNode[];

  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw) as unknown;
      if (Array.isArray(once)) return once as TreeNode[];
      if (typeof once === "string") {
        try {
          const twice = JSON.parse(once) as unknown;
          return Array.isArray(twice) ? (twice as TreeNode[]) : [];
        } catch {
          return [];
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  return [];
}

export function assignCollectionId(
  nodes: TreeNode[],
  collectionId: string,
): TreeNode[] {
  return nodes.map((node) => {
    const next: TreeNode = {
      ...node,
      collectionId: node.collectionId || collectionId,
    };
    if (next.type === "folder" && next.children?.length) {
      next.children = assignCollectionId(next.children, collectionId);
    }
    return next;
  });
}

export function countFiles(nodes: TreeNode[]): number {
  return nodes.reduce((total, node) => {
    if (node.type === "file") return total + 1;
    if (node.type === "folder" && node.children?.length) {
      return total + countFiles(node.children);
    }
    return total;
  }, 0);
}

export function collectFileIds(nodes: TreeNode[], acc: Set<string>) {
  nodes.forEach((node) => {
    if (node.type === "file") acc.add(node.id);
    if (node.type === "folder" && node.children?.length) {
      collectFileIds(node.children, acc);
    }
  });
}

export function applyIconsToNodes(
  nodes: TreeNode[],
  iconsById: Record<string, string | null>,
): TreeNode[] {
  return nodes.map((node) => {
    const next: TreeNode = {
      ...node,
      icon:
        node.type === "file"
          ? (iconsById[node.id] ?? node.icon ?? null)
          : (node.icon ?? null),
    };
    if (next.type === "folder" && next.children?.length) {
      next.children = applyIconsToNodes(next.children, iconsById);
    }
    return next;
  });
}

export function findNodeByPath(
  nodes: TreeNode[],
  segments: string[],
): TreeNode | null {
  if (segments.length === 0) return null;
  const [head, ...rest] = segments;
  const current = nodes.find((n) => n.name === head) ?? null;
  if (!current) return null;
  if (rest.length === 0) return current;
  if (current.type !== "folder") return null;
  return findNodeByPath(current.children ?? [], rest);
}

export function findNodeById(
  nodes: TreeNode[],
  id: string,
  prefix: string[] = [],
): { node: TreeNode; path: string } | null {
  for (const node of nodes) {
    const currentPath = [...prefix, node.name];
    if (node.id === id) return { node, path: currentPath.join("/") };
    if (node.type === "folder" && node.children?.length) {
      const found = findNodeById(node.children, id, currentPath);
      if (found) return found;
    }
  }
  return null;
}

/** A flat view of one file node: its id, name, collection-relative path, and owning collection. */
export interface FlatFileNode {
  id: string;
  name: string;
  /** Collection-relative path, node names joined by "/" (matches the breadcrumb format). */
  path: string;
  collectionId: string;
}

/** Collect every file (not folder) under `nodes` with its collection-relative path. */
export function flattenFileNodes(
  nodes: TreeNode[],
  prefix: string[] = [],
  out: FlatFileNode[] = [],
): FlatFileNode[] {
  for (const node of nodes) {
    const currentPath = [...prefix, node.name];
    if (node.type === "file") {
      out.push({
        id: node.id,
        name: node.name,
        path: currentPath.join("/"),
        collectionId: node.collectionId,
      });
    } else if (node.children?.length) {
      flattenFileNodes(node.children, currentPath, out);
    }
  }
  return out;
}

export function removeNodeByIdInPlace(
  nodes: TreeNode[],
  nodeId: string,
): boolean {
  const index = nodes.findIndex((item) => item.id === nodeId);
  if (index !== -1) {
    nodes.splice(index, 1);
    return true;
  }

  for (const node of nodes) {
    if (node.type === "folder" && node.children?.length) {
      const removed = removeNodeByIdInPlace(node.children, nodeId);
      if (removed) return true;
    }
  }

  return false;
}

/** Collect the id of a node and all of its descendants. */
export function collectNodeAndDescendantIds(
  node: TreeNode,
  acc: Set<string> = new Set(),
): Set<string> {
  acc.add(node.id);
  if (node.type === "folder" && node.children?.length) {
    for (const child of node.children) collectNodeAndDescendantIds(child, acc);
  }
  return acc;
}

/**
 * Return a name that does not clash with any sibling in `siblings`, appending
 * ` (2)`, ` (3)`, … before the file extension when needed. Folders dedupe on
 * the whole name.
 */
export function dedupeName(
  name: string,
  type: TreeNode["type"],
  siblings: TreeNode[],
): string {
  const taken = new Set(siblings.map((s) => s.name));
  if (!taken.has(name)) return name;

  // Files and canvases carry an extension to preserve; folders dedupe on the
  // whole name.
  const dot = type !== "folder" ? name.lastIndexOf(".") : -1;
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";

  let n = 2;
  let candidate = `${base} (${n})${ext}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  return candidate;
}

/**
 * Move the node `draggedId` into the folder `targetFolderId` (or the root when
 * `null`), returning a NEW directories array. Returns `null` when the move is a
 * no-op or invalid: dropping a node onto itself, into one of its own
 * descendants, or into the folder it already lives in. Auto-renames on a
 * name clash in the destination.
 */
export function moveNodeInTree(
  directories: TreeNode[],
  draggedId: string,
  targetFolderId: string | null,
): TreeNode[] | null {
  if (draggedId === targetFolderId) return null;

  const found = findNodeById(directories, draggedId);
  if (!found) return null;
  const draggedNode = found.node;

  // Can't drop a folder into itself or any of its descendants.
  if (draggedNode.type === "folder") {
    const subtree = collectNodeAndDescendantIds(draggedNode);
    if (targetFolderId != null && subtree.has(targetFolderId)) return null;
  }

  const next: TreeNode[] = JSON.parse(JSON.stringify(directories));

  // Resolve the destination container (and confirm the target is a folder).
  let destination: TreeNode[];
  if (targetFolderId == null) {
    destination = next;
  } else {
    const target = findNodeById(next, targetFolderId);
    if (!target || target.node.type !== "folder") return null;
    target.node.children = target.node.children ?? [];
    destination = target.node.children;
  }

  // No-op when it already lives directly in the destination.
  if (destination.some((n) => n.id === draggedId)) return null;

  const moving = findNodeById(next, draggedId);
  if (!moving) return null;
  const movingNode = moving.node;

  removeNodeByIdInPlace(next, draggedId);
  movingNode.name = dedupeName(movingNode.name, movingNode.type, destination);
  destination.push(movingNode);

  return next;
}

export function getSiblingContainerList(
  directories: TreeNode[],
  pathSegments: string[],
  selectedType: TreeNode["type"] | null,
): TreeNode[] {
  if (pathSegments.length === 0 || selectedType == null) {
    return directories;
  }

  if (selectedType === "folder") {
    if (pathSegments.length === 1) return directories;
    const parentPath = pathSegments.slice(0, -1);
    const parent = findNodeByPath(directories, parentPath);
    if (!parent || parent.type !== "folder") return directories;
    parent.children = parent.children ?? [];
    return parent.children;
  }

  if (pathSegments.length === 1) return directories;
  const parentPath = pathSegments.slice(0, -1);
  const parent = findNodeByPath(directories, parentPath);
  if (!parent || parent.type !== "folder") return directories;
  parent.children = parent.children ?? [];
  return parent.children;
}
