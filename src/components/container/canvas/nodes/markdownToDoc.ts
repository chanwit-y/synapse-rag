import { generateJSON, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import { SpawnHighlight } from "./spawnHighlight";

// Mirror the TextEditorNode editor's schema exactly (same StarterKit config +
// SpawnHighlight mark) so the doc this produces is always valid for that editor —
// e.g. headings beyond the allowed levels degrade to paragraphs rather than
// landing the editor in an unrepresentable state.
const EXTENSIONS = [
  StarterKit.configure({ link: false, heading: { levels: [2] } }),
  SpawnHighlight,
];

/** A minimal single-paragraph doc — the fallback when conversion fails. */
function plainDoc(text: string): JSONContent {
  return {
    type: "doc",
    content: [
      { type: "paragraph", content: text ? [{ type: "text", text }] : [] },
    ],
  };
}

/**
 * Convert a Markdown string (an LLM-generated chat summary) into a ProseMirror
 * doc the text-editor node renders. Browser-only — `generateJSON` parses HTML via
 * the DOM, so this must run from a user-triggered client path, never during SSR.
 * Any failure degrades to a single plain-text paragraph rather than throwing.
 */
export function markdownToProseMirrorDoc(markdown: string): JSONContent {
  const text = markdown.trim();
  if (!text) return plainDoc("");
  try {
    const html = marked.parse(text, { async: false }) as string;
    return generateJSON(html, EXTENSIONS);
  } catch {
    return plainDoc(text);
  }
}

/**
 * Convert an HTML markup string (pasted rich-text source) into a ProseMirror doc
 * the text-editor node renders. Browser-only — `generateJSON` parses HTML via the
 * DOM, so this must run from a user-triggered client path, never during SSR. Only
 * schema-allowed nodes/marks survive (scripts, styles, unknown tags are dropped),
 * so the input is sanitized as a side effect. Any failure degrades to a single
 * plain-text paragraph rather than throwing.
 */
export function htmlToProseMirrorDoc(html: string): JSONContent {
  const text = html.trim();
  if (!text) return plainDoc("");
  try {
    return generateJSON(text, EXTENSIONS);
  } catch {
    return plainDoc(text);
  }
}
