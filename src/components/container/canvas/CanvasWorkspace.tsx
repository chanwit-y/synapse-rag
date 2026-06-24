"use client";

import "@xyflow/react/dist/style.css";
import "./styles.css";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesInitialized,
  type Connection,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import { useLayoutStore } from "@/store/layout-store";

import { CanvasProvider, useCanvas } from "./CanvasContext";
import CanvasToasts from "./CanvasToasts";
import CanvasSearch from "./CanvasSearch";
import Toolbar from "./Toolbar";
import TextEditorNode from "./nodes/TextEditorNode";
import ChatNode from "./nodes/ChatNode";
import ImageNode from "./nodes/ImageNode";
import VideoNode from "./nodes/VideoNode";
import LinksNode from "./nodes/LinksNode";
import DrawNode from "./nodes/DrawNode";
import MapNode from "./nodes/MapNode";
import TextNode from "./nodes/TextNode";
import ColorableEdge from "./edges/ColorableEdge";
import type { AppNode, NodeColor, NodeKind } from "./types";
import { NODE_COLORS } from "./nodes/nodeColors";
import { nodeMatches } from "./search";
import { useCanvasStore } from "./store/canvas-store";

const edgeTypes: EdgeTypes = { colorable: ColorableEdge };

function subscribePrefersDark(cb: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", cb);
  return () => media.removeEventListener("change", cb);
}

/** Resolve the canvas dark state from the app theme (mirrors LayoutProvider) so
 *  the react-flow chrome whose colors are *props* (dots, minimap) can follow the
 *  light/dark toggle alongside the `dark:` utility classes. */
function useIsDark() {
  const theme = useLayoutStore((s) => s.theme);
  const prefersDark = useSyncExternalStore(
    subscribePrefersDark,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  return theme === "system" ? prefersDark : theme === "dark";
}

const nodeTypes: NodeTypes = {
  textEditor: TextEditorNode,
  chat: ChatNode,
  image: ImageNode,
  video: VideoNode,
  links: LinksNode,
  draw: DrawNode,
  map: MapNode,
  text: TextNode,
};

function Flow() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView, setCenter, getZoom } = useReactFlow();
  const { setInteracting } = useCanvas();
  const isDark = useIsDark();

  // The store is the single source of truth for nodes/edges (controlled mode).
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);

  const [selectMode, setSelectMode] = useState(false);

  // --- Node search ---------------------------------------------------------
  // `searchOpen` toggles the find box; `query` is the live input. Matching runs
  // off a deferred copy so fast typing never blocks node rendering. `activeMatch`
  // is the index (into the ordered match list) the viewport last centered on.
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const deferredQuery = useDeferredValue(query);

  // Ids of nodes matching the query, in node order. Empty when the query is
  // blank — the common idle case returns instantly without scanning content.
  const matchIds = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return [] as string[];
    return nodes.filter((n) => nodeMatches(n, q)).map((n) => n.id);
  }, [nodes, deferredQuery]);
  const matchSet = useMemo(() => new Set(matchIds), [matchIds]);

  // Reset to the first hit whenever the query changes, then keep the active
  // index in range as matches come and go (e.g. a node edited mid-search).
  useEffect(() => {
    setActiveMatch(0);
  }, [deferredQuery]);
  useEffect(() => {
    if (matchIds.length === 0) return;
    setActiveMatch((i) => (i >= matchIds.length ? matchIds.length - 1 : i));
  }, [matchIds.length]);

  // Pan/zoom the viewport so the match at `index` sits centered (keeping the
  // current zoom). Off-screen matches become visible; on-screen ones recenter.
  const focusMatch = useCallback(
    (index: number) => {
      const id = matchIds[index];
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      const w = node.measured?.width ?? (node.width as number | undefined) ?? 320;
      const h = node.measured?.height ?? (node.height as number | undefined) ?? 200;
      setCenter(node.position.x + w / 2, node.position.y + h / 2, {
        zoom: getZoom(),
        duration: 400,
      });
    },
    [matchIds, nodes, setCenter, getZoom],
  );

  const goToMatch = useCallback(
    (dir: 1 | -1) => {
      if (matchIds.length === 0) return;
      setActiveMatch((i) => {
        const next = (i + dir + matchIds.length) % matchIds.length;
        focusMatch(next);
        return next;
      });
    },
    [matchIds.length, focusMatch],
  );

  // Custom nodes measure asynchronously; refit once they all have dimensions.
  const initialized = useNodesInitialized();
  const didFit = useRef(false);
  useEffect(() => {
    if (initialized && !didFit.current) {
      didFit.current = true;
      fitView({ padding: 0.25, duration: 300 });
    }
  }, [initialized, fitView]);

  // Live feedback while dragging: forbid only self-links (multiple sources are
  // allowed). The connection itself is committed by the store's onConnect.
  const isValidConnection = useCallback(
    (conn: Connection | Edge) => conn.source !== conn.target,
    [],
  );

  // Toolbar add: project the viewport center, then let the store build + insert.
  const handleAdd = useCallback(
    (kind: NodeKind) => {
      const bounds = wrapperRef.current?.getBoundingClientRect();
      const center = bounds
        ? screenToFlowPosition({
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
          })
        : { x: 200, y: 200 };
      addNode(kind, center);
    },
    [screenToFlowPosition, addNode],
  );

  // Comma-joined ids of the selected nodes, read from the store as a primitive.
  // This drives the highlight-edge "focus" effect; zustand's Object.is equality
  // on the string means `displayEdges` only re-derives when the *selection*
  // changes, not on every drag-tick position update.
  const selectedIdsKey = useCanvasStore((s) =>
    s.nodes
      .filter((n) => n.selected)
      .map((n) => n.id)
      .join(","),
  );

  // Highlight edges (sourceHandle "highlight") animate + brighten only while one
  // of their endpoints is selected; otherwise they sit dimmed and static. Other
  // edges pass through untouched. Derived for display; base `edges` stays canonical.
  const displayEdges = useMemo(() => {
    const selectedIds = new Set(selectedIdsKey ? selectedIdsKey.split(",") : []);
    return edges.map((e) => {
      // Plain edges use the colorable edge type (per-edge color picker).
      if (!e.sourceHandle?.startsWith("highlight")) return { ...e, type: "colorable" };
      const active = selectedIds.has(e.source) || selectedIds.has(e.target);
      return {
        ...e,
        animated: active,
        // While active, raise the edge above the nodes so it visibly springs
        // from the highlighted phrase (a selected node sits at z~1000, so clear
        // it); at rest it tucks behind. Non-interactive (interactionWidth 0 +
        // pointer-events none) so the raised edge never blocks clicks/selection
        // on the node content beneath it.
        zIndex: active ? 2000 : 0,
        interactionWidth: 0,
        style: active
          ? { stroke: "#f59e0b", strokeWidth: 2.5, pointerEvents: "none" as const }
          : {
              stroke: "#fcd34d",
              strokeWidth: 1.5,
              strokeOpacity: 0.55,
              pointerEvents: "none" as const,
            },
      };
    });
  }, [edges, selectedIdsKey]);

  // Tag nodes with search classes: the active match gets the strong ring, other
  // hits a softer ring, and everything else dims back. When no search is active
  // the original array is returned untouched (no className churn / no re-render).
  const searchActive = matchSet.size > 0;
  const activeMatchId = matchIds[activeMatch];
  const displayNodes = useMemo(() => {
    if (!searchActive) return nodes;
    return nodes.map((n) => {
      const cls = !matchSet.has(n.id)
        ? "canvas-search-dim"
        : n.id === activeMatchId
          ? "canvas-search-active"
          : "canvas-search-hit";
      return { ...n, className: `${n.className ?? ""} ${cls}`.trim() };
    });
  }, [nodes, searchActive, matchSet, activeMatchId]);

  // Minimap dot tint: a node's picked accent color wins; un-accented (default)
  // nodes fall back to a per-type color so the minimap still reads by type.
  const minimapColor = useMemo(
    () => (n: { type?: string; data?: { color?: NodeColor } }) => {
      const color = n.data?.color;
      if (color && color !== "default") return NODE_COLORS[color].dot;
      if (n.type === "chat") return "#c4b5fd";
      if (n.type === "image") return "#93c5fd";
      if (n.type === "video") return "#fca5a5";
      if (n.type === "links") return "#5eead4";
      if (n.type === "draw") return "#f0abfc";
      if (n.type === "text") return "#94a3b8";
      return "#fcd34d";
    },
    [],
  );

  // Flip the shared `interacting` flag around viewport moves (pan/zoom) and node
  // drags so iframe nodes can guard their embeds for the duration of the gesture.
  const startInteract = useCallback(() => setInteracting(true), [setInteracting]);
  const endInteract = useCallback(() => setInteracting(false), [setInteracting]);

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      <ReactFlow<AppNode>
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onMoveStart={startInteract}
        onMoveEnd={endInteract}
        onNodeDragStart={startInteract}
        onNodeDragStop={endInteract}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        selectionOnDrag={selectMode}
        panOnDrag={selectMode ? [1, 2] : true}
        className="bg-slate-50 dark:bg-slate-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.6}
          color={isDark ? "#334155" : "#cbd5e1"}
        />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!rounded-xl !border !border-slate-200 !bg-white/90 !shadow-lg !backdrop-blur dark:!border-slate-700 dark:!bg-slate-900/90"
        />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeColor={minimapColor}
          nodeStrokeWidth={3}
          maskColor={isDark ? "rgba(2, 6, 23, 0.6)" : "rgba(241, 245, 249, 0.6)"}
          className="!bottom-0 !right-16 !rounded-xl !border !border-slate-200 !bg-white/80 !shadow-lg dark:!border-slate-700 dark:!bg-slate-900/80"
        />
      </ReactFlow>

      <Toolbar
        onAdd={handleAdd}
        selectMode={selectMode}
        onToggleSelect={() => setSelectMode((s) => !s)}
      />

      <CanvasSearch
        open={searchOpen}
        onToggle={setSearchOpen}
        query={query}
        onQueryChange={setQuery}
        matchCount={matchIds.length}
        activeIndex={matchIds.length ? activeMatch : -1}
        onNext={() => goToMatch(1)}
        onPrev={() => goToMatch(-1)}
      />
    </div>
  );
}

export interface CanvasWorkspaceProps {
  /**
   * Render filling its parent (the document main pane) instead of as a
   * fullscreen overlay. The canvas is a document now, so this is the default
   * usage.
   */
  embedded?: boolean;
}

export default function CanvasWorkspace({ embedded = false }: CanvasWorkspaceProps) {
  return (
    <div
      className={
        embedded
          ? "relative h-full w-full bg-slate-50 dark:bg-slate-950"
          : "fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950"
      }
    >
      <ReactFlowProvider>
        <CanvasProvider>
          <Flow />
          <CanvasToasts />
        </CanvasProvider>
      </ReactFlowProvider>
    </div>
  );
}
