"use client";

import { useEffect, useRef, useState } from "react";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Sigma from "sigma";
import type { CameraState } from "sigma/types";
import { Network } from "lucide-react";
import type { TreeNode, TreeViewGroup } from "@/components/common/FileTree";

type GraphTheme = "light" | "dark";

interface DocumentGraphViewProps {
  collections: TreeViewGroup[];
  theme: GraphTheme;
  /** Open a document by item id (graph → editor). Only fired for file nodes. */
  onOpenFile: (fileId: string) => void;
  /**
   * Item id of the file to live-preview (from the search palette): its ancestor
   * folders/collections auto-expand, the node + its ancestor path highlight, and
   * the camera pans to it. `null` clears the preview and restores the camera.
   */
  previewFileId?: string | null;
}

type NodeKind = "collection" | "folder" | "file";

interface FlatNode {
  key: string;
  /** Parent node key, or null for a collection (root) node. */
  parent: string | null;
  label: string;
  kind: NodeKind;
  /** For file nodes, the underlying item id to open. */
  fileId: string | null;
  /** True for collection/folder nodes that have at least one child. */
  collapsible: boolean;
}

const PALETTE: Record<
  GraphTheme,
  Record<NodeKind, string> & { edge: string; label: string; highlight: string }
> = {
  light: {
    collection: "#2563eb",
    folder: "#d97706",
    file: "#475569",
    edge: "#cbd5e1",
    label: "#1e293b",
    highlight: "#db2777",
  },
  dark: {
    collection: "#60a5fa",
    folder: "#fbbf24",
    file: "#94a3b8",
    edge: "#334155",
    label: "#e2e8f0",
    highlight: "#f472b6",
  },
};

const SIZE: Record<NodeKind, number> = { collection: 14, folder: 9, file: 6 };

/** Flatten the collection tree into nodes with parent links + child counts. */
function flattenTree(collections: TreeViewGroup[]): {
  nodes: FlatNode[];
  childCount: Map<string, number>;
} {
  const nodes: FlatNode[] = [];
  const childCount = new Map<string, number>();

  const walk = (node: TreeNode, parentKey: string) => {
    const key = `node:${node.id}`;
    childCount.set(parentKey, (childCount.get(parentKey) ?? 0) + 1);
    const children = node.children ?? [];
    nodes.push({
      key,
      parent: parentKey,
      label: node.name,
      kind: node.type === "folder" ? "folder" : "file",
      fileId: node.type !== "folder" ? node.id : null,
      collapsible: node.type === "folder" && children.length > 0,
    });
    for (const child of children) walk(child, key);
  };

  for (const group of collections) {
    const key = `collection:${group.id}`;
    nodes.push({
      key,
      parent: null,
      label: group.name,
      kind: "collection",
      fileId: null,
      collapsible: group.directories.length > 0,
    });
    for (const dir of group.directories) walk(dir, key);
  }

  return { nodes, childCount };
}

/**
 * Run ForceAtlas2 once over the *fully expanded* tree and return a stable map of
 * node key → position. These positions are the single source of truth: collapse,
 * expand, theme, and search-preview all reuse them, so nothing ever relayouts (no
 * reshuffle, cheap per keystroke).
 */
function computeFullLayout(collections: TreeViewGroup[]): Map<string, { x: number; y: number }> {
  const { nodes } = flattenTree(collections);
  const graph = new Graph();

  nodes.forEach((node, i) => {
    // Seed positions on a spiral so ForceAtlas2 has distinct starting points.
    const angle = i * 2.399963; // golden angle
    const radius = Math.sqrt(i + 1);
    graph.addNode(node.key, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      size: SIZE[node.kind],
    });
  });

  for (const node of nodes) {
    if (node.parent && graph.hasNode(node.parent) && graph.hasNode(node.key)) {
      graph.addEdge(node.parent, node.key);
    }
  }

  if (graph.order > 1) {
    forceAtlas2.assign(graph, {
      iterations: 300,
      settings: { ...forceAtlas2.inferSettings(graph), scalingRatio: 12, gravity: 1 },
    });
  }

  const positions = new Map<string, { x: number; y: number }>();
  graph.forEachNode((key, attr) => {
    positions.set(key, { x: attr.x as number, y: attr.y as number });
  });
  return positions;
}

/** Keys of a node and all its ancestors up to the root (the highlight path). */
function ancestorPathKeys(collections: TreeViewGroup[], targetKey: string | null): Set<string> {
  const path = new Set<string>();
  if (!targetKey) return path;
  const { nodes } = flattenTree(collections);
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  let cur: string | null = targetKey;
  while (cur && byKey.has(cur)) {
    path.add(cur);
    cur = byKey.get(cur)?.parent ?? null;
  }
  return path;
}

/**
 * Populate `graph` with the nodes visible under `collapsed`, placed at their
 * cached positions. Nodes/edges on `pathKeys` are highlighted; `targetKey` (the
 * previewed file) is enlarged most.
 */
function renderGraph(
  graph: Graph,
  collections: TreeViewGroup[],
  collapsed: Set<string>,
  theme: GraphTheme,
  positions: Map<string, { x: number; y: number }>,
  pathKeys: Set<string>,
  targetKey: string | null,
) {
  const { nodes, childCount } = flattenTree(collections);
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const colors = PALETTE[theme];

  // A node is visible only if none of its ancestors is collapsed.
  const isVisible = (node: FlatNode): boolean => {
    let parent = node.parent;
    while (parent) {
      if (collapsed.has(parent)) return false;
      parent = byKey.get(parent)?.parent ?? null;
    }
    return true;
  };

  const visible = nodes.filter(isVisible);

  graph.clear();

  visible.forEach((node) => {
    const hidden = collapsed.has(node.key);
    const count = childCount.get(node.key) ?? 0;
    const pos = positions.get(node.key) ?? { x: 0, y: 0 };
    const inPath = pathKeys.has(node.key);
    const isTarget = node.key === targetKey;
    graph.addNode(node.key, {
      label: hidden && count > 0 ? `${node.label} (${count})` : node.label,
      x: pos.x,
      y: pos.y,
      size: SIZE[node.kind] * (isTarget ? 1.9 : inPath ? 1.25 : 1),
      color: hidden ? colors.edge : inPath ? colors.highlight : colors[node.kind],
      highlighted: isTarget,
      kind: node.kind,
      fileId: node.fileId,
      collapsible: node.collapsible,
    });
  });

  for (const node of visible) {
    if (node.parent && graph.hasNode(node.parent) && graph.hasNode(node.key)) {
      const onPath = pathKeys.has(node.parent) && pathKeys.has(node.key);
      graph.addEdge(node.parent, node.key, {
        color: onPath ? colors.highlight : colors.edge,
        size: onPath ? 2.5 : 1,
      });
    }
  }
}

export default function DocumentGraphView({
  collections,
  theme,
  onOpenFile,
  previewFileId = null,
}: DocumentGraphViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  // Cached node positions (single source of truth) + the `collections` identity
  // they were computed from, so we only relayout when the data actually changes.
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const layoutSourceRef = useRef<TreeViewGroup[] | null>(null);
  // Whether the next render should fit the camera (first paint / data change).
  const needsFitRef = useRef(true);
  // Camera state captured when a preview begins, restored when it clears.
  const cameraSnapshotRef = useRef<CameraState | null>(null);
  // Collapsed collection/folder node keys. Empty = fully expanded.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  // The click handler is attached once, so it reads the latest `onOpenFile`
  // through a ref kept in sync via an effect (never written during render).
  const onOpenFileRef = useRef(onOpenFile);
  useEffect(() => {
    onOpenFileRef.current = onOpenFile;
  }, [onOpenFile]);

  // Create the Sigma instance once; wire node clicks; tear down on unmount.
  useEffect(() => {
    if (!containerRef.current) return;
    const graph = new Graph();
    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      labelDensity: 0.7,
      labelRenderedSizeThreshold: 4,
    });
    graphRef.current = graph;
    sigmaRef.current = sigma;

    sigma.on("clickNode", ({ node }) => {
      const fileId = graph.getNodeAttribute(node, "fileId") as string | null;
      const collapsible = graph.getNodeAttribute(node, "collapsible") as boolean;
      if (fileId) {
        onOpenFileRef.current(fileId);
      } else if (collapsible) {
        // `setCollapsed` is a stable React setter; toggle this node's key.
        setCollapsed((prev) => {
          const next = new Set(prev);
          if (next.has(node)) next.delete(node);
          else next.add(node);
          return next;
        });
      }
    });
    sigma.on("enterNode", () => {
      if (containerRef.current) containerRef.current.style.cursor = "pointer";
    });
    sigma.on("leaveNode", () => {
      if (containerRef.current) containerRef.current.style.cursor = "default";
    });

    return () => {
      sigma.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
  }, []);

  // Rebuild graph contents when data, collapse set, theme, or preview change.
  // Positions come from a cached layout (computed once per data change), so a
  // collapse/expand or preview never relayouts — only visibility/colors change.
  useEffect(() => {
    const graph = graphRef.current;
    const sigma = sigmaRef.current;
    if (!graph || !sigma) return;

    // Recompute the cached layout only when the data identity changes.
    if (layoutSourceRef.current !== collections) {
      positionsRef.current = computeFullLayout(collections);
      layoutSourceRef.current = collections;
      needsFitRef.current = true;
    }

    const targetKey = previewFileId ? `node:${previewFileId}` : null;
    const pathKeys = ancestorPathKeys(collections, targetKey);
    // Expand the previewed node's ancestors (ephemerally — the user's collapse
    // set is untouched, so clearing the preview reverts the view for free).
    const effectiveCollapsed =
      targetKey && collapsed.size > 0
        ? new Set([...collapsed].filter((k) => !pathKeys.has(k)))
        : collapsed;

    renderGraph(
      graph,
      collections,
      effectiveCollapsed,
      theme,
      positionsRef.current,
      pathKeys,
      targetKey,
    );
    sigma.setSetting("labelColor", { color: PALETTE[theme].label });
    sigma.refresh();

    const camera = sigma.getCamera();
    if (targetKey && graph.hasNode(targetKey)) {
      // Begin a preview: snapshot the camera once, then pan/zoom to the node.
      if (!cameraSnapshotRef.current) cameraSnapshotRef.current = camera.getState();
      const display = sigma.getNodeDisplayData(targetKey);
      if (display) {
        camera.animate({ x: display.x, y: display.y, ratio: 0.35 }, { duration: 400 });
      }
    } else if (cameraSnapshotRef.current) {
      // Preview cleared: restore the pre-search camera.
      camera.animate(cameraSnapshotRef.current, { duration: 400 });
      cameraSnapshotRef.current = null;
    } else if (needsFitRef.current) {
      // First paint or data change with no preview: fit everything.
      camera.animatedReset();
      needsFitRef.current = false;
    }
  }, [collections, collapsed, theme, previewFileId]);

  if (collections.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
          <Network className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Nothing to graph yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create a collection and add documents to see the hierarchy here.
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full flex-1" />;
}
