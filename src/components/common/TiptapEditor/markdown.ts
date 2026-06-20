import { marked } from "marked";
import TurndownService from "turndown";

// Markdown <-> HTML bridge for the Tiptap editor. Tiptap works in HTML/ProseMirror
// while the document is persisted as Markdown (same `items.content` as the
// markdown editor), so we convert on load (md -> html) and on every change/save
// (html -> md). The feature scope is the round-trip-safe set turndown handles
// natively (headings, bold, italic, code, lists, blockquote, links, images, hr) —
// no GFM tables/strikethrough, which would need turndown-plugin-gfm.

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});

/** Convert a Markdown string into HTML for Tiptap's `setContent`. */
export function markdownToHtml(markdown: string): string {
  const text = (markdown ?? "").trim();
  if (!text) return "";
  try {
    return marked.parse(text, { async: false }) as string;
  } catch {
    return "";
  }
}

/** Convert the editor's HTML back into Markdown for persistence. */
export function htmlToMarkdown(html: string): string {
  try {
    return turndown.turndown(html ?? "");
  } catch {
    return "";
  }
}
