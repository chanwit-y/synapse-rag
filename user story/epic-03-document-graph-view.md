# Epic 3 — Document Graph View

Visualize the whole knowledge base as a force-directed graph and navigate it,
as an alternative to the file-tree editor. (Sigma/graphology,
`DocumentGraphView`.)

---

## US-3.1 — Switch the Document page into graph mode

**As an** Author, **I want** a toggle to switch between the editor and a graph
view, **so that** I can see the structure of my knowledge base at a glance.

**Acceptance criteria**
- A toggle button sits next to the add-collection "+" in the sidebar header.
- The button shows the graph icon in editor mode and a back-to-editor icon in
  graph mode, with `aria-pressed` reflecting state.
- The chosen mode persists across reloads (Zustand `persist` to localStorage).
- The toggle is hidden when the sidebar is collapsed, and reappears on expand
  (so the user is never trapped in graph mode).

---

## US-3.2 — See the collection → folder → file hierarchy as a graph

**As an** Author, **I want** the graph to show all collections and their nested
folders/files, **so that** I can perceive relationships across the workspace.

**Acceptance criteria**
- Nodes represent collections, folders, and files, colored by kind.
- Edges connect each node to its parent.
- A force-directed (ForceAtlas2) layout positions the nodes.
- Colors adapt to the active light/dark theme.
- When there is nothing to show, an empty state is displayed.

---

## US-3.3 — Expand and collapse subtrees in the graph

**As an** Author, **I want** to collapse and expand folder/collection nodes,
**so that** I can focus on part of a large graph.

**Acceptance criteria**
- Clicking a collapsible (collection/folder) node toggles its subtree's
  visibility.
- A collapsed node indicates how many children are hidden.
- The graph starts fully expanded.

---

## US-3.4 — Open a document from the graph

**As an** Author, **I want** to click a file node to open that document,
**so that** I can jump straight from the map into editing.

**Acceptance criteria**
- Clicking a file node switches back to editor mode and opens that document.
- Hovering a node changes the cursor to indicate it is clickable.
