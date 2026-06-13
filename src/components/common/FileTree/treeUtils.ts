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

export function getSiblingContainerList(
  directories: TreeNode[],
  pathSegments: string[],
  selectedType: "folder" | "file" | null,
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
