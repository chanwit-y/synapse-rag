# Epic 2 — Document History & Translation

Track every saved version of a document, compare versions, and maintain a
translated variant of the content.

---

## US-2.1 — View a document's version history

**As an** Author, **I want** to see the list of past versions of a document,
**so that** I can understand how it has changed over time.

**Acceptance criteria**
- Each save appends a `histories` entry tied to the item.
- The history list is ordered with the most recent version first.
- Selecting a version shows that version's content.

---

## US-2.2 — Compare two versions with a diff

**As an** Author, **I want** to see the differences between document versions,
**so that** I can review what changed.

**Acceptance criteria**
- A diff view highlights additions and removals between two versions.
- The diff renders the markdown text content (via the `diff` library).

---

## US-2.3 — Maintain a translated version of a document

**As an** Author, **I want** the document to have a translated variant,
**so that** I can read/share the content in another language.

**Acceptance criteria**
- A translation can be ensured/generated for a document
  (`ensureDocumentTranslation`).
- A translation can be edited and saved (`saveDocumentTranslation`).
- The translated content is stored alongside the source without overwriting it.
