import { TableKit } from "@tiptap/extension-table";

// Shared table node set for both Tiptap editors (the Document-page editor and
// the canvas TextEditorNode). `TableKit` bundles Table + TableRow + TableHeader
// + TableCell. The two editors differ only in `resizable`:
//   - Document editor: resizable OFF — column widths can't survive the GFM
//     Markdown round-trip, so they'd silently reset on reload.
//   - Canvas node: resizable ON — it persists ProseMirror JSON, so widths last.
// Feature scope is intentionally GFM-safe: header row + plain cell content, no
// merged cells and no per-column alignment (see markdown.ts / TableMenu).
export function buildTableExtensions({ resizable }: { resizable: boolean }) {
  return [TableKit.configure({ table: { resizable } })];
}
