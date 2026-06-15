/**
 * Scoped styles for assistant chat messages rendered as markdown. Tailwind v4's
 * preflight strips default margins/list styling from headings, lists, etc., so
 * everything the renderer emits is restyled here under `.chat-md`.
 */
export const CHAT_MARKDOWN_CSS = `
.chat-md {
  font-size: 0.875rem;
  line-height: 1.65;
  color: inherit;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.chat-md > :first-child { margin-top: 0; }
.chat-md > :last-child { margin-bottom: 0; }

.chat-md p { margin: 0.5rem 0; }

.chat-md h1,
.chat-md h2,
.chat-md h3,
.chat-md h4,
.chat-md h5,
.chat-md h6 {
  font-weight: 600;
  line-height: 1.3;
  margin: 1rem 0 0.5rem;
}
.chat-md h1 { font-size: 1.4rem; }
.chat-md h2 { font-size: 1.25rem; }
.chat-md h3 { font-size: 1.1rem; }
.chat-md h4 { font-size: 1rem; }
.chat-md h5,
.chat-md h6 { font-size: 0.9rem; }

.chat-md ul,
.chat-md ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
.chat-md ul { list-style: disc; }
.chat-md ol { list-style: decimal; }
.chat-md li { margin: 0.25rem 0; }
.chat-md li > ul,
.chat-md li > ol { margin: 0.25rem 0; }

.chat-md li > input[type="checkbox"] {
  margin-right: 0.4rem;
  vertical-align: middle;
}

.chat-md a {
  color: var(--color-brand-700, #4f46e5);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.chat-md a:hover { opacity: 0.85; }

.chat-md blockquote {
  margin: 0.75rem 0;
  padding: 0.25rem 0.9rem;
  border-left: 3px solid var(--color-border, #d4d4d8);
  color: var(--color-muted-foreground, #6b7280);
}

.chat-md hr {
  margin: 1rem 0;
  border: 0;
  border-top: 1px solid var(--color-border, #d4d4d8);
}

.chat-md :not(pre) > code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.825em;
  padding: 0.12em 0.35em;
  border-radius: 4px;
  background: rgba(127, 127, 127, 0.16);
}

.chat-md pre.chat-md-pre {
  margin: 0.75rem 0;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  overflow-x: auto;
  background: rgba(127, 127, 127, 0.12);
  border: 1px solid var(--color-border, #e4e4e7);
}
.chat-md[data-color-mode="dark"] pre.chat-md-pre {
  background: rgba(0, 0, 0, 0.35);
}
.chat-md pre.chat-md-pre code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.82rem;
  line-height: 1.55;
  background: none;
  padding: 0;
}

.chat-md table {
  width: 100%;
  margin: 0.75rem 0;
  border-collapse: collapse;
  font-size: 0.82rem;
  display: block;
  overflow-x: auto;
}
.chat-md th,
.chat-md td {
  border: 1px solid var(--color-border, #e4e4e7);
  padding: 0.4rem 0.6rem;
  text-align: left;
}
.chat-md th {
  background: rgba(127, 127, 127, 0.1);
  font-weight: 600;
}

.chat-md .chat-md-img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5rem 0;
}

.chat-md .mermaid-diagram {
  margin: 0.75rem 0;
  display: flex;
  justify-content: center;
}
.chat-md .mermaid-diagram svg {
  max-width: 100%;
  height: auto;
}
.chat-md .mermaid-loading {
  margin: 0.5rem 0;
  font-size: 0.8rem;
  color: var(--color-muted-foreground, #6b7280);
}
.chat-md .mermaid-error {
  margin: 0.75rem 0;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  border: 1px solid #f5b5b5;
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
  font-size: 0.8rem;
}
.chat-md .mermaid-error-title {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.chat-md .mermaid-error pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
`;
