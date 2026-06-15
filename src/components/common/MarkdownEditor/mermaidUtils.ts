/**
 * Repair the most common mermaid authoring mistake: unescaped double quotes
 * inside a node label, e.g. `C[Click "create blank agent"]`, which mermaid's
 * parser rejects. We rewrite such a label to a fully-quoted form with the inner
 * quotes escaped as `#quot;`, so it renders with the quotes preserved:
 *   [Click "create blank agent"]  ->  ["Click #quot;create blank agent#quot;"]
 *
 * Narrow & safe by design:
 * - Only `[...]` and `{...}` node-shape labels are touched. `(...)` is left
 *   alone because parentheses commonly appear as literal text inside labels
 *   (e.g. `(Not Recommended)`), not as node shapes.
 * - A label with no `"` is left byte-identical.
 * - A label already fully wrapped in quotes (`"..."`) is left identical.
 * Only labels with an unescaped interior quote are rewritten — and those already
 * fail to parse, so this can never change a currently-valid diagram.
 */
export function repairMermaidLabels(src: string): string {
  const repairLabel = (open: string, close: string) => (match: string, content: string) => {
    if (!content.includes('"')) return match;

    const trimmed = content.trim();
    const alreadyQuoted =
      trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');
    if (alreadyQuoted) return match;

    const escaped = content.replace(/"/g, "#quot;");
    return `${open}"${escaped}"${close}`;
  };

  return src
    .replace(/\[([^\]]*)\]/g, repairLabel("[", "]"))
    .replace(/\{([^}]*)\}/g, repairLabel("{", "}"));
}
