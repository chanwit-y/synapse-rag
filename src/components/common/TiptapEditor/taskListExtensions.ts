import { TaskList, TaskItem } from "@tiptap/extension-list";

// Shared task-list node set for both Tiptap editors (the Document-page editor and
// the canvas TextEditorNode) and the canvas Markdown/HTML import (markdownToDoc).
// Keeping it here — next to `buildTableExtensions` — guarantees all three schemas
// stay identical, so a doc produced by one editor is always valid in the others.
// `nested: true` lets a task item hold a sub-task-list (Tab to indent); it round-
// trips to indented `- [ ]` Markdown via the marked/turndown rules in markdown.ts.
export function buildTaskListExtensions() {
  return [TaskList, TaskItem.configure({ nested: true })];
}
