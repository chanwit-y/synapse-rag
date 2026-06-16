# Epic 1 — Collections & Documents

Organize knowledge into collections and a folder hierarchy of markdown
documents, and edit them in place. (Document page, `/document`.)

---

## US-1.1 — Create a collection

**As an** Author, **I want** to create a named collection, **so that** I have a
top-level container to organize related documents.

**Acceptance criteria**
- A "+" action in the file sidebar header opens a create-collection modal.
- Submitting with a name creates the collection and it appears in the sidebar.
- An empty name is rejected with a validation message.
- The new collection is selectable immediately without a full page reload.

---

## US-1.2 — Browse the collection/folder/file tree

**As an** Author, **I want** to see my collections, folders, and documents in a
sidebar tree, **so that** I can navigate my knowledge base.

**Acceptance criteria**
- The sidebar shows collections, each expandable into nested folders and files.
- Folders expand/collapse on click; the selected document is highlighted.
- The sidebar can be collapsed; when collapsed, the add-collection and
  graph-toggle actions are hidden.

---

## US-1.3 — Create and organize folders & documents

**As an** Author, **I want** to add folders and documents and nest them,
**so that** I can structure content the way I think about it.

**Acceptance criteria**
- I can create a document within a collection or folder.
- Folder hierarchy is supported (items self-reference via `folder_id`).
- Moving/reordering items persists the new directory structure.

---

## US-1.4 — Edit a document in the markdown editor

**As an** Author, **I want** to open a document and edit its markdown,
**so that** I can author and update content.

**Acceptance criteria**
- Selecting a file opens it in the markdown editor with its current content.
- The editor supports markdown with GFM, math (KaTeX), and mermaid diagrams.
- Edits can be saved explicitly; an empty editor still renders without error.

---

## US-1.5 — Save a document and snapshot a version

**As an** Author, **I want** saving a document to record a version,
**so that** my edit history is preserved.

**Acceptance criteria**
- Saving persists the content and creates a `histories` row for the item.
- The save uses the layered action → service → repository flow and returns an
  `ActionResult`.
- A failed save surfaces an error to the user and does not lose the editor
  buffer.

---

## US-1.6 — Embed images in a document

**As an** Author, **I want** to upload an image into a document,
**so that** I can include screenshots and diagrams inline.

**Acceptance criteria**
- Uploading an image stores it and returns a path usable in the markdown.
- The image renders in the editor preview and the rendered document.

---

## US-1.7 — Rename and delete content

**As an** Author, **I want** to rename or delete collections, folders, and
documents, **so that** I can keep the workspace tidy.

**Acceptance criteria**
- I can rename a collection and a document item.
- I can delete a document item and a collection.
- Deleting a collection removes its items (and cascades per schema relations).
- Destructive deletes are confirmed before they run.
