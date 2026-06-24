import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import type { JSONContent } from "@tiptap/core";
import type { AppNode, NodeKind } from "../types";

/** Action rendered inside a toast (e.g. an Undo button). */
type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; action?: ToastAction };

/** Arguments for spawning a linked node from selected text. Moved here from the
 *  old CanvasContext: the store now owns nodes/edges, so a node calls `spawn`
 *  directly instead of going through the registerSpawnHandler ref bridge. */
export type SpawnFromTextArgs = {
  /** Text the new node should contain. */
  text: string;
  /** Node the selection came from — the new node is linked back to it. */
  sourceNodeId: string;
  /** Optional title for the new node (e.g. "Ask AI", "Note"). */
  title?: string;
  /** Which kind of node to create. Defaults to "textEditor". */
  kind?: "chat" | "textEditor";
  /** Handle id on the source node the edge starts from (e.g. "s-right"). For a
   *  highlight source, pass `highlight` here AND the offsets below — the store
   *  keys the real handle to the new child's id (`highlight-<childId>`). */
  sourceHandle?: string;
  /** Handle id on the new child node the edge ends at (e.g. "t-top"). */
  targetHandle?: string;
  /** When the edge springs from the highlighted phrase, mark this a highlight
   *  source: the store saves a paired highlight on the source node, keyed to the
   *  new child's id. For a chat source, pass the phrase's character offsets
   *  (`start`/`end`) and `messageId`. For a text-editor source the offsets are
   *  omitted — the caller applies a `spawnHighlight` mark using the returned id. */
  highlight?: { start?: number; end?: number; messageId?: string };
  /** For an "Ask AI" (chat) spawn: a pre-computed brief of the source chat/note,
   *  stored on the new chat node so it shows a context note and grounds every
   *  turn. Empty/omitted spawns a context-less chat (the prior behavior). */
  contextSummary?: string;
  /** Where {@link contextSummary} came from — drives the context note's label. */
  contextKind?: "chat" | "note";
};

interface CanvasState {
  nodes: AppNode[];
  edges: Edge[];
  toasts: Toast[];
  /** Canvas-level selected chat model id (ephemeral; not serialized). Read by
   *  chat nodes when they call the LLM; set from the canvas header picker. */
  chatModelId: string | null;
  /** Canvas-level selected AI instruction template id (ephemeral; not
   *  serialized). Read by chat nodes and injected as the system prompt; set from
   *  the canvas header picker. Null means no instruction. */
  instructionId: string | null;
  /** Id of the canvas `item` this board belongs to (ephemeral; not serialized).
   *  Set on open; chat nodes read it to persist messages live to the DB. Null
   *  for a board that isn't backed by a saved canvas document. */
  canvasItemId: string | null;
  /** Whether chat nodes ground historical questions with a Wikipedia lookup
   *  (ephemeral; not serialized). On by default; toggled from the canvas header.
   *  When off, chat turns skip the classify+fetch step entirely. */
  wikiSearchEnabled: boolean;

  // react-flow controlled handlers (store is the single source of truth)
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;

  // react-flow-mirrored mutators (same signatures node components already used)
  setNodes: (updater: AppNode[] | ((nds: AppNode[]) => AppNode[])) => void;
  setEdges: (updater: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  updateNodeData: (id: string, patch: Partial<AppNode["data"]>) => void;

  // semantic actions
  addNode: (kind: NodeKind, center: { x: number; y: number }) => void;
  /** Spawn a linked node from selected text; returns the new child node's id so
   *  a text-editor caller can key its `spawnHighlight` mark to it. */
  spawn: (args: SpawnFromTextArgs) => string;
  /** Spawn a text-editor note holding `doc` (a summary of a chat's transcript)
   *  below the chat node, linked back to it with an amber edge. The chat node
   *  stays; repeated calls add more notes. No-op if the id isn't a chat node. */
  spawnSummaryNote: (chatNodeId: string, doc: JSONContent) => void;
  /** Remove a single edge by id, offering an Undo toast. Only plain (colorable)
   *  edges reach this — highlight edges are non-interactive and owned by the
   *  node-delete flow — so no node/highlight cleanup is needed here. */
  removeEdge: (id: string) => void;
  /** Replace the whole graph (used when opening a persisted canvas file). */
  loadCanvas: (nodes: AppNode[], edges: Edge[]) => void;
  /** Set the canvas-level chat model used by chat nodes. */
  setChatModelId: (id: string | null) => void;
  /** Set the canvas-level AI instruction used by chat nodes. */
  setInstructionId: (id: string | null) => void;
  /** Set the canvas item id chat nodes use to persist messages to the DB. */
  setCanvasItemId: (id: string | null) => void;
  /** Toggle Wikipedia grounding of historical questions for chat nodes. */
  setWikiSearchEnabled: (enabled: boolean) => void;
  notify: (message: string, action?: ToastAction) => void;
  dismissToast: (id: number) => void;
}

let idCounter = 0;
const nextId = (kind: NodeKind) => `${kind}-${Date.now()}-${idCounter++}`;

// Persisted canvases own their content, so the store starts empty; opening a
// canvas file hydrates it via `loadCanvas`, and a brand-new canvas stays blank
// until the user adds nodes from the Toolbar.
const initialNodes: AppNode[] = [];
const initialEdges: Edge[] = [];

/** Build a fresh node of `kind`, positioned at `position`. Shared by addNode. */
function buildNode(kind: NodeKind, position: { x: number; y: number }): AppNode {
  if (kind === "chat") {
    return {
      id: nextId(kind),
      type: "chat",
      position,
      style: { width: 320, height: 380 },
      data: {
        title: "AI Assistant",
        messages: [{ id: "g", role: "ai", text: "New chat ready. Ask me anything." }],
      },
    };
  }
  if (kind === "image") {
    return {
      id: nextId(kind),
      type: "image",
      position,
      style: { width: 280 },
      data: { title: "Image", caption: "Add a caption for this image.", imageUrl: "" },
    };
  }
  if (kind === "video") {
    return {
      id: nextId(kind),
      type: "video",
      position,
      style: { width: 300 },
      data: { title: "Video", caption: "Add a caption for this video.", videoUrl: "" },
    };
  }
  if (kind === "links") {
    return {
      id: nextId(kind),
      type: "links",
      position,
      style: { width: 300 },
      data: { title: "Links", links: [] },
    };
  }
  if (kind === "draw") {
    return {
      id: nextId(kind),
      type: "draw",
      position,
      style: { width: 300, height: 280 },
      data: { title: "Sketch", strokes: [] },
    };
  }
  if (kind === "map") {
    return {
      id: nextId(kind),
      type: "map",
      position,
      style: { width: 280, height: 320 },
      data: { title: "Map", caption: "Add a caption for this place.", mapUrl: "" },
    };
  }
  if (kind === "text") {
    // Auto-sizing label — no fixed width/height; it hugs its content.
    return {
      id: nextId(kind),
      type: "text",
      position,
      data: { text: "", fontSize: 24, align: "left", autoEdit: true },
    };
  }
  return {
    id: nextId(kind),
    type: "textEditor",
    position,
    style: { width: 340 },
    data: {
      title: "Untitled Note",
      paragraph:
        "Start writing here. Select any phrase to highlight it and open the AI menu.",
      initialHighlight: "highlight it",
    },
  };
}

export const useCanvasStore = create<CanvasState>()((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  toasts: [],
  chatModelId: null,
  instructionId: null,
  canvasItemId: null,
  wikiSearchEnabled: true,

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  // A node may fan out to many targets AND have many sources. The only guard is
  // against self-links; `addEdge` dedupes an identical source+target+handle edge.
  onConnect: (conn) => {
    if (conn.source === conn.target) return;
    set((s) => ({
      edges: addEdge({ ...conn, style: { stroke: "#cbd5e1", strokeWidth: 2 } }, s.edges),
    }));
  },

  setNodes: (updater) =>
    set((s) => ({ nodes: typeof updater === "function" ? updater(s.nodes) : updater })),
  setEdges: (updater) =>
    set((s) => ({ edges: typeof updater === "function" ? updater(s.edges) : updater })),
  updateNodeData: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as AppNode) : n,
      ),
    })),

  addNode: (kind, center) => {
    // slight cascade so repeated adds don't stack exactly
    const jitter = (idCounter % 5) * 24;
    const position = { x: center.x - 160 + jitter, y: center.y - 120 + jitter };
    set((s) => ({ nodes: [...s.nodes, buildNode(kind, position)] }));
  },

  // Spawn a node from selected text (Ask AI → chat, Note → text editor) and link
  // it back to the source. Fully store-internal — positions off the source
  // node's geometry, so any node component can call it directly.
  spawn: ({
    text,
    sourceNodeId,
    title,
    kind = "textEditor",
    sourceHandle: pickedSource,
    targetHandle: pickedTarget,
    highlight,
    contextSummary,
    contextKind,
  }) => {
    const source = get().nodes.find((n) => n.id === sourceNodeId);
    const srcX = source?.position.x ?? 0;
    const srcY = source?.position.y ?? 0;
    const srcH = source?.measured?.height ?? 260;
    // Drop the new node below the source; cascade so repeated spawns don't stack.
    const offset = (idCounter % 4) * 36;
    const position = { x: srcX + offset, y: srcY + srcH + 70 + offset };
    const newId = nextId(kind);
    const trimmed = text.trim();

    const node: AppNode =
      kind === "chat"
        ? {
            id: newId,
            type: "chat",
            position,
            style: { width: 320, height: 380 },
            data: {
              title: title ?? "Ask AI",
              // Seed the question; the node answers it live on mount.
              messages: [{ id: `q-${newId}`, role: "user", text: trimmed }],
              pending: true,
              ...(contextSummary?.trim()
                ? { contextSummary: contextSummary.trim(), contextKind }
                : {}),
            },
          }
        : {
            id: newId,
            type: "textEditor",
            position,
            style: { width: 340 },
            data: {
              title: title ?? "Note",
              paragraph: trimmed,
              // Highlight the pulled-in text so the note mirrors the spec's
              // yellow-highlight selection look.
              initialHighlight: trimmed,
            },
          };

    // Edges fan out parent → child. A highlight source is keyed to the new
    // child's id (`highlight-<childId>`) and saves a paired highlight on the
    // source node (created only here). A side source is a plain edge.
    const isHighlight = pickedSource === "highlight" && !!highlight;
    const sourceHandle = isHighlight
      ? `highlight-${newId}`
      : pickedSource ?? (kind === "chat" ? undefined : pickedSource);
    const targetHandle = pickedTarget ?? (kind === "chat" ? "t-top" : undefined);

    set((s) => {
      const next = isHighlight
        ? s.nodes.map((n) =>
            n.id === sourceNodeId && (n.type === "textEditor" || n.type === "chat")
              ? ({
                  ...n,
                  data: {
                    ...n.data,
                    highlights: [
                      ...(n.data.highlights ?? []),
                      {
                        nodeId: newId,
                        phrase: trimmed,
                        ...(highlight!.start !== undefined
                          ? { start: highlight!.start, end: highlight!.end }
                          : {}),
                        ...(highlight!.messageId ? { messageId: highlight!.messageId } : {}),
                      },
                    ],
                  },
                } as AppNode)
              : n,
          )
        : s.nodes;
      return { nodes: [...next, node] };
    });
    set((s) => ({
      edges: [
        ...s.edges,
        {
          id: `e-spawn-${newId}`,
          source: sourceNodeId,
          sourceHandle,
          target: newId,
          targetHandle,
          type: "default",
          animated: true,
          style: { stroke: "#f59e0b", strokeWidth: 2.5 },
        },
      ],
    }));
    get().notify(`➕ Created a ${kind === "chat" ? "chat" : "note"} from the selection`);
    return newId;
  },

  // Spawn a summary note below a chat node and link it back with an amber edge.
  // The chat node is untouched (it stays on the canvas); the note is a plain
  // text-editor node carrying the summary doc — no highlight is saved on the
  // chat, so the edge is an ordinary connection and deletes cleanly.
  spawnSummaryNote: (chatNodeId, doc) => {
    const source = get().nodes.find((n) => n.id === chatNodeId);
    if (!source || source.type !== "chat") return;
    const srcX = source.position.x;
    const srcY = source.position.y;
    const srcH = source.measured?.height ?? 380;
    // Drop the note below the chat; cascade so repeated summaries don't stack.
    const offset = (idCounter % 4) * 36;
    const position = { x: srcX + offset, y: srcY + srcH + 70 + offset };
    const newId = nextId("textEditor");
    const note: AppNode = {
      id: newId,
      type: "textEditor",
      position,
      style: { width: 340 },
      data: {
        title: `Summary of ${source.data.title}`,
        doc,
        // `doc` is the source of truth; paragraph is only a legacy migration input.
        paragraph: "",
      },
    };
    set((s) => ({ nodes: [...s.nodes, note] }));
    set((s) => ({
      edges: [
        ...s.edges,
        {
          id: `e-summary-${newId}`,
          source: chatNodeId,
          sourceHandle: "s-bottom",
          target: newId,
          targetHandle: "t-top",
          type: "default",
          animated: true,
          style: { stroke: "#f59e0b", strokeWidth: 2.5 },
        },
      ],
    }));
    get().notify("➕ Created a summary note from the chat");
  },

  // Drop a single plain edge. Snapshots it first so the Undo toast can re-append
  // it (guarded against a double-add if the same id reappeared meanwhile).
  removeEdge: (id) => {
    const edge = get().edges.find((e) => e.id === id);
    if (!edge) return;
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }));
    get().notify("Edge deleted", {
      label: "Undo",
      onClick: () =>
        set((s) =>
          s.edges.some((e) => e.id === id)
            ? s
            : { edges: [...s.edges, edge] },
        ),
    });
  },

  // Swap the whole graph when a canvas file is opened. The id counter is bumped
  // past any numeric suffix already present so freshly-added nodes never collide
  // with ids restored from the saved graph.
  loadCanvas: (nodes, edges) => {
    let maxSuffix = 0;
    for (const n of nodes) {
      const tail = Number(n.id.slice(n.id.lastIndexOf("-") + 1));
      if (Number.isFinite(tail)) maxSuffix = Math.max(maxSuffix, tail);
    }
    idCounter = maxSuffix + 1;
    // Keep the selected chat model across document switches; only the graph and
    // transient toasts are replaced when a canvas file is opened.
    set({ nodes, edges, toasts: [] });
  },

  setChatModelId: (id) => set({ chatModelId: id }),

  setInstructionId: (id) => set({ instructionId: id }),

  setCanvasItemId: (id) => set({ canvasItemId: id }),

  setWikiSearchEnabled: (enabled) => set({ wikiSearchEnabled: enabled }),

  notify: (message, action) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, action }] }));
    // Actionable toasts (e.g. Undo) linger so there's time to click them.
    window.setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      action ? 6000 : 2600,
    );
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
