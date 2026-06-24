import { Marked, type RendererObject, type Tokens } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

// Markdown <-> HTML bridge for the Tiptap editor. Tiptap works in HTML/ProseMirror
// while the document is persisted as Markdown (same `items.content` as the
// markdown editor), so we convert on load (md -> html) and on every change/save
// (html -> md). Core turndown handles the base set natively (headings, bold,
// italic, code, lists, blockquote, links, images, hr); the GFM plugin adds
// `tables` so tables round-trip. (The plugin also enables strikethrough/task
// lists, which are inert here since strikethrough stays disabled in the editor
// and its task-list rule never matches Tiptap's task markup — see below.)
// `marked` parses GFM tables back to HTML by default. Tables are kept GFM-safe:
// header row + plain cell content, no merged cells, no per-column alignment.
//
// Task lists need custom round-trip handling: Tiptap renders them as
// `<ul data-type="taskList"><li data-type="taskItem" data-checked>…</li></ul>`,
// which neither plain `marked` emits from `- [ ]` nor the gfm turndown rule
// recognizes (it keys off a checkbox whose direct parent is the `<li>`, but
// Tiptap nests the checkbox in a `<label>`). So we add a marked renderer (md ->
// Tiptap html) and a turndown rule (Tiptap html -> md) for them here.

// md -> html: emit Tiptap's task-list markup for an all-task GFM list. A list is
// treated as a task list only when *every* item is a task, so mixed lists fall
// back to the default renderer (returning `false`) and stay valid bullet lists.
const taskListRenderer: RendererObject = {
  list(token: Tokens.List) {
    if (!token.items.length || !token.items.every((item) => item.task)) return false;
    const body = token.items
      .map((item) => {
        const checked = item.checked === true;
        // Drop the leading `checkbox` token (we render our own input) and wrap
        // the item's content as block(s): tight text -> <p>, nested list ->
        // recurse through this same renderer, other blocks -> default parse.
        const inner = item.tokens
          .filter((t) => t.type !== "checkbox")
          .map((t) =>
            t.type === "text"
              ? `<p>${this.parser.parseInline((t as Tokens.Text).tokens ?? [])}</p>`
              : this.parser.parse([t]),
          )
          .join("");
        const input = `<input type="checkbox"${checked ? ' checked="checked"' : ""}>`;
        return `<li data-type="taskItem" data-checked="${checked}"><label>${input}<span></span></label><div>${inner}</div></li>`;
      })
      .join("");
    return `<ul data-type="taskList">${body}</ul>`;
  },
};

// Dedicated marked instance (not the global singleton) so the task-list renderer
// stays scoped to the Tiptap editors. Shared with the canvas import (markdownToDoc)
// via the `taskMarked` export so `- [ ]` markdown converts identically there.
export const taskMarked = new Marked({ gfm: true });
taskMarked.use({ renderer: taskListRenderer });

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});
turndown.use(gfm);

// html -> md: serialize a Tiptap task item to a GFM `- [ ]` / `- [x]` line.
// Added after gfm so it takes precedence over the default `li` rule. The nested
// `<label><input></label>` renders to nothing on its own, so `content` is just
// the item body (its `<div><p>…</p></div>` and any nested task list).
turndown.addRule("taskListItem", {
  filter: (node) =>
    node.nodeName === "LI" &&
    (node as HTMLElement).getAttribute("data-type") === "taskItem",
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    const marker = `- [${checked ? "x" : " "}] `;
    const text = content
      .replace(/^\n+/, "")
      .replace(/\n+$/, "")
      .replace(/\n{2,}/g, "\n")
      // Indent wrapped/nested lines under the marker so nested task lists round-trip.
      .replace(/\n/gm, "\n" + " ".repeat(marker.length));
    return marker + text + ((node as HTMLElement).nextSibling ? "\n" : "");
  },
});

/** Convert a Markdown string into HTML for Tiptap's `setContent`. */
export function markdownToHtml(markdown: string): string {
  const text = (markdown ?? "").trim();
  if (!text) return "";
  try {
    return taskMarked.parse(text, { async: false }) as string;
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
