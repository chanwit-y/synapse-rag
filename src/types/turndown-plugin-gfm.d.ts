// Ambient types for `turndown-plugin-gfm`, which ships no declarations. Each
// export is a TurndownService plugin (the `gfm` bundle plus the individual
// rules) — typed against the `Plugin` shape Turndown's own types expose.
declare module "turndown-plugin-gfm" {
  import type { Plugin } from "turndown";

  export const gfm: Plugin;
  export const tables: Plugin;
  export const strikethrough: Plugin;
  export const taskListItems: Plugin;
  export const highlightedCodeBlock: Plugin;
}
