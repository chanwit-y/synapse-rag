# Canvas

An infinite, zoomable whiteboard built on [`@xyflow/react`](https://reactflow.dev). It hosts a graph of typed, draggable nodes (rich-text notes, AI chats, images, video, links, sketches, maps, floating text) connected by edges. Nodes can spawn linked child nodes from selected text, and the whole graph serializes to JSON so a canvas can be persisted as a document.

The canvas is rendered as a **document type** in the Document page: each canvas item stores its `{ nodes, edges }` graph as JSON, and `CanvasDocumentView` hydrates/serializes it on open/save.

## Exports

```tsx
import {
  CanvasWorkspace,
  CanvasDocumentView,
  useCanvasStore,
} from "@/components/container/canvas";

import type {
  AppNode,
  NodeKind,
  NodeColor,
  SpawnFromTextArgs,
  // ...and every node-data type (TextEditorNodeData, ChatNodeData, etc.)
} from "@/components/container/canvas";
```

| Export | Kind | Purpose |
| --- | --- | --- |
| `CanvasDocumentView` | component | High-level view: hydrates the store from saved JSON, renders the workspace with a Save / Fullscreen header, and serializes back out on save. **Use this for a persisted canvas.** |
| `CanvasWorkspace` | component | The raw board (ReactFlow + Toolbar + toasts). Reads/writes the shared store. Use directly only if you manage hydration/persistence yourself. |
| `useCanvasStore` | Zustand hook | The single source of truth for `nodes`, `edges`, and the semantic actions (`addNode`, `spawn`, `loadCanvas`, …). |
| `SpawnFromTextArgs` | type | Arguments for `spawn` (creating a linked child node from selected text). |

## Basic Usage (persisted canvas)

`CanvasDocumentView` is the intended entry point. Give it the serialized graph and an async `onSave` that persists the next serialized graph.

```tsx
import { CanvasDocumentView } from "@/components/container/canvas";

<CanvasDocumentView
  itemId={canvasItemId}                     // the canvas item's id (DB key)
  content={serializedGraphJson}            // '{"nodes":[...],"edges":[...]}'
  onSave={async (next) => {
    await saveDocument(next);               // persist the serialized graph
  }}
/>;
```

### Lazy-load it (recommended)

`@xyflow/react` is a large, DOM-only bundle, so load it on the client only when a canvas is actually opened (this is how the Document page does it):

```tsx
import dynamic from "next/dynamic";

const CanvasDocumentView = dynamic(
  () => import("@/components/container/canvas").then((m) => m.CanvasDocumentView),
  {
    ssr: false,
    loading: () => <div>Loading canvas…</div>,
  },
);
```

> **Remount on document switch.** Key the view by item id (`key={file.id}`) and mount it only once `content` is loaded — the store hydrates from `content` on mount, so a stable `content` per mount avoids reloading mid-edit.

| Prop | Type | Description |
| --- | --- | --- |
| `itemId` | `string` | The canvas item's id. Chat nodes use it to persist messages live to the DB, and it scopes the transcript hydrate / GC. |
| `content` | `string` | Serialized `{ nodes, edges }` JSON for this canvas. Empty / invalid JSON safely hydrates to an empty board. |
| `onSave` | `(content: string) => Promise<void>` | Persist the serialized graph. Resolves once saved; the Save button shows a busy state until it does. |

## Raw Workspace

If you handle hydration and persistence yourself, render `CanvasWorkspace` directly and drive the store. It already wraps itself in `ReactFlowProvider` + `CanvasProvider`.

```tsx
import { useEffect } from "react";
import { CanvasWorkspace, useCanvasStore } from "@/components/container/canvas";

function MyCanvas({ nodes, edges }) {
  const loadCanvas = useCanvasStore((s) => s.loadCanvas);

  useEffect(() => {
    loadCanvas(nodes, edges);
  }, [nodes, edges, loadCanvas]);

  return <CanvasWorkspace embedded />;
}
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `embedded` | `boolean` | `false` | Fill the parent container instead of rendering as a fixed fullscreen overlay. `CanvasDocumentView` always uses `embedded`. |

## Node Kinds

Nodes are added from the floating left Toolbar; each `kind` maps to a custom node component and a typed `data` shape.

| `NodeKind` | Toolbar label | What it is |
| --- | --- | --- |
| `textEditor` | Add text editor | Rich-text (Tiptap) "document" note. Select a phrase to highlight it and spawn a linked Note / Ask-AI node. |
| `chat` | Add chat | An AI chat node; can auto-answer a seeded question (`pending`) and spawn children from an AI reply. |
| `text` | Add text | A chrome-less floating text label (uniform font size/style/color, inline-edited, auto-sizes). |
| `image` | Add image | Uploaded image with caption + BlurHash placeholder. |
| `video` | Add video | Embedded YouTube video (from a pasted URL). |
| `links` | Add links | A list of links; labels default to the hostname and are editable. |
| `draw` | Add draw | Freehand sketch (SVG strokes in a 0–1000 coordinate space). |
| `map` | Add map | Embedded Google Map parsed from a pasted Maps URL. |

Every node `data` carries an optional `color: NodeColor` accent:

```ts
type NodeColor =
  | "default" | "violet" | "sky" | "emerald"
  | "amber" | "rose" | "teal" | "indigo";
```

## The Store (`useCanvasStore`)

The Zustand store is the single source of truth — `CanvasWorkspace` runs ReactFlow in controlled mode against it. Select narrow slices to avoid extra re-renders.

```tsx
const nodes = useCanvasStore((s) => s.nodes);
const addNode = useCanvasStore((s) => s.addNode);

// Outside React (e.g. on save), read a snapshot imperatively:
const { nodes, edges } = useCanvasStore.getState();
const serialized = JSON.stringify({ nodes, edges });
```

### State

| Field | Type | Description |
| --- | --- | --- |
| `nodes` | `AppNode[]` | All nodes on the board. |
| `edges` | `Edge[]` | All edges (react-flow edges). |
| `toasts` | `Toast[]` | Transient in-canvas notifications (rendered by `CanvasToasts`). |

### Actions

| Action | Signature | Description |
| --- | --- | --- |
| `addNode` | `(kind: NodeKind, center: { x: number; y: number }) => void` | Build and insert a fresh node of `kind` near `center` (flow coords), with slight cascade jitter. |
| `spawn` | `(args: SpawnFromTextArgs) => string` | Create a linked child node from selected text and return its id. Used by the highlight/Ask-AI flow. |
| `loadCanvas` | `(nodes: AppNode[], edges: Edge[]) => void` | Replace the whole graph (used when opening a persisted canvas). Resets the id counter past restored ids. |
| `updateNodeData` | `(id: string, patch: Partial<AppNode["data"]>) => void` | Shallow-merge a patch into one node's `data`. |
| `removeEdge` | `(id: string) => void` | Delete a single edge by id and show an Undo toast. Used by the ✕ button on plain (colorable) edges; highlight edges are non-interactive and cleaned up by the node-delete flow instead. |
| `setNodes` / `setEdges` | `(updater \| array) => void` | react-flow-style mutators (value or updater fn). |
| `onNodesChange` / `onEdgesChange` / `onConnect` | react-flow handlers | Controlled-mode change handlers; wired into `<ReactFlow>` by the workspace. |
| `notify` | `(message: string, action?: { label; onClick }) => void` | Show a toast (actionable toasts linger ~6s, plain ones ~2.6s). |
| `dismissToast` | `(id: number) => void` | Remove a toast immediately. |

### Spawning a linked node (`SpawnFromTextArgs`)

```ts
type SpawnFromTextArgs = {
  text: string;                 // text the new node should contain
  sourceNodeId: string;         // node the selection came from (edge links back)
  title?: string;               // optional title (e.g. "Ask AI", "Note")
  kind?: "chat" | "textEditor"; // defaults to "textEditor"
  sourceHandle?: string;        // edge start handle (e.g. "s-right", or "highlight")
  targetHandle?: string;        // edge end handle (e.g. "t-top")
  highlight?: { start?: number; end?: number; messageId?: string };
};
```

```tsx
const spawn = useCanvasStore((s) => s.spawn);

// Ask AI about the selected phrase from a chat message:
const childId = spawn({
  text: selectedText,
  sourceNodeId: thisNodeId,
  kind: "chat",
  title: "Ask AI",
  sourceHandle: "highlight",
  highlight: { start, end, messageId },
});
```

A `highlight` source pairs a saved highlight on the source node (keyed to the new child's id) with the spawned edge, so the connector visibly springs from the highlighted phrase and animates when either endpoint is selected.

## Persistence Format

A canvas serializes to a plain JSON object:

```json
{ "nodes": [ /* AppNode[] */ ], "edges": [ /* Edge[] */ ] }
```

- Save: `JSON.stringify(useCanvasStore.getState())` (the `{ nodes, edges }` slice).
- Open: `loadCanvas(parsed.nodes, parsed.edges)`.
- `CanvasDocumentView` does both for you, and additionally garbage-collects `/canvas-images/...` files that a save dropped from the graph (best-effort; a failed unlink never blocks the save).

### Chat messages are stored separately (not in the graph JSON)

Chat-node transcripts are **not** carried in the `{ nodes, edges }` JSON. They live in the `canvas_chat_messages` DB table (one row per message, keyed by `itemId` + node id), persisted **live, per turn** — each user message and AI reply is written the moment it happens, so a conversation survives even if the user never clicks Save. `CanvasDocumentView`:

- **strips** chat nodes' `messages` (and the transient `pending` flag) out of the graph before saving — the JSON holds chat *structure* only;
- **hydrates** each chat node's `messages` from the table on open (via `listCanvasChatMessagesAction`);
- **GCs** transcripts of chat nodes removed from the graph after a save (`pruneCanvasChatMessagesAction`, best-effort), mirroring the image GC.

Writes are idempotent on the message id, so re-persisting a seed on remount (or a retried write) never duplicates. The chat node's editable **title**, by contrast, is plain structure — it stays in the graph JSON (synced into the store via `updateNodeData` as you type).

## Notes & Gotchas

- **Provider is built in.** `CanvasWorkspace` mounts its own `ReactFlowProvider` and `CanvasProvider`; don't wrap it again. `useReactFlow()` / `useCanvas()` only work inside it.
- **Client + DOM only.** Both components are `"use client"` and render to the DOM/WebGL — render with `ssr: false`.
- **Controlled graph.** Never mutate `nodes`/`edges` arrays in place; go through the store actions (or `setNodes`/`setEdges`) so react-flow stays in sync.
- **Theme-aware.** Background dots, minimap, and node accents follow the app's light/dark theme via the layout store.
- **Interaction guard.** A shared `interacting` flag (`useCanvas`) is flipped during pan/zoom/drag so iframe nodes (video/map) can cover their embeds and keep gestures smooth.
- **Esc / Fullscreen.** `CanvasDocumentView` provides a maximize toggle (in-app fullscreen overlay) that exits on `Escape`.
