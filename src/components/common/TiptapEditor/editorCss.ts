// Structural typography for the Tiptap content area. Colors inherit from the
// wrapper (which carries the themed `text-foreground`); only code/blockquote
// surfaces get an explicit tint, flipped via the `.is-dark` modifier so the
// editor matches the app theme.
export const TIPTAP_EDITOR_CSS = `
.synapse-tiptap .ProseMirror {
  outline: none;
  min-height: 100%;
  font-size: 0.95rem;
  line-height: 1.7;
}
.synapse-tiptap .ProseMirror > * + * { margin-top: 0.75em; }
.synapse-tiptap .ProseMirror h1 { font-size: 1.9rem; font-weight: 700; line-height: 1.2; }
.synapse-tiptap .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; line-height: 1.25; }
.synapse-tiptap .ProseMirror h3 { font-size: 1.2rem; font-weight: 600; line-height: 1.3; }
.synapse-tiptap .ProseMirror ul { list-style: disc; padding-left: 1.5rem; }
.synapse-tiptap .ProseMirror ol { list-style: decimal; padding-left: 1.5rem; }
.synapse-tiptap .ProseMirror li > * + * { margin-top: 0.25em; }
.synapse-tiptap .ProseMirror a { color: #0BA6DF; text-decoration: underline; cursor: pointer; }
.synapse-tiptap .ProseMirror img { max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; }
.synapse-tiptap .ProseMirror blockquote {
  border-left: 3px solid rgba(120, 120, 120, 0.4);
  padding-left: 1rem;
  color: inherit;
  opacity: 0.85;
}
.synapse-tiptap .ProseMirror code {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.9em;
}
.synapse-tiptap .ProseMirror pre {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  overflow-x: auto;
}
.synapse-tiptap .ProseMirror pre code { background: none; padding: 0; }
.synapse-tiptap .ProseMirror hr {
  border: none;
  border-top: 1px solid rgba(120, 120, 120, 0.35);
  margin: 1.25em 0;
}
.synapse-tiptap.is-dark .ProseMirror code,
.synapse-tiptap.is-dark .ProseMirror pre {
  background: rgba(255, 255, 255, 0.08);
}
.synapse-tiptap .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  opacity: 0.45;
}
`;
