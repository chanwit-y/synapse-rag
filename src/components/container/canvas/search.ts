import type { JSONContent } from "@tiptap/core";
import type { AppNode } from "./types";

/** Recursively collect every `text` leaf out of a ProseMirror doc (the
 *  text-editor node's source of truth), joined by spaces. */
function extractDocText(doc: JSONContent | undefined): string {
  if (!doc) return "";
  const out: string[] = [];
  const walk = (node: JSONContent) => {
    if (typeof node.text === "string") out.push(node.text);
    node.content?.forEach(walk);
  };
  walk(doc);
  return out.join(" ");
}

/** All searchable text for a node, flattened to one lower-cased string. Covers
 *  titles plus body content per node type; draw nodes contribute only a title
 *  (their strokes hold no text). Computed on demand — never stored. */
export function nodeSearchText(node: AppNode): string {
  const parts: string[] = [];
  switch (node.type) {
    case "chat":
      parts.push(node.data.title);
      node.data.messages.forEach((m) => parts.push(m.text));
      if (node.data.contextSummary) parts.push(node.data.contextSummary);
      break;
    case "textEditor":
      parts.push(node.data.title);
      parts.push(node.data.doc ? extractDocText(node.data.doc) : node.data.paragraph);
      break;
    case "text":
      parts.push(node.data.text);
      break;
    case "image":
    case "video":
    case "map":
      parts.push(node.data.title, node.data.caption);
      break;
    case "links":
      parts.push(node.data.title);
      node.data.links.forEach((l) => parts.push(l.label, l.url));
      break;
    case "draw":
      parts.push(node.data.title);
      break;
  }
  return parts.join(" ").toLowerCase();
}

/** Case-insensitive substring match. `query` must already be lower-cased and
 *  trimmed (the caller does it once per keystroke, not once per node). */
export function nodeMatches(node: AppNode, query: string): boolean {
  if (!query) return false;
  return nodeSearchText(node).includes(query);
}
