import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * A programmatic-only mark tagging the phrase a child node was spawned from.
 * Keyed by the paired child's id (`nodeId`) so the text-editor node can:
 *   - anchor the edge source handle to the mark's DOM rect, and
 *   - reveal the yellow "highlighter" look for the right pair on focus.
 *
 * Rendered as `<mark data-node-id="…" class="spawn-highlight">`. The visual
 * state (transparent at rest, yellow when active) is driven entirely from CSS
 * via a `data-active` attribute toggled by the node, so changing visibility
 * never costs a ProseMirror transaction.
 *
 * `inclusive: false` keeps the highlight from growing when the user types at
 * its boundary. There are no input rules or keyboard shortcuts — the mark is
 * only ever applied/removed programmatically (at spawn time / migration).
 */
export interface SpawnHighlightOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spawnHighlight: {
      /** Apply a spawn highlight keyed to `nodeId` over the current selection. */
      setSpawnHighlight: (nodeId: string) => ReturnType;
    };
  }
}

export const SpawnHighlight = Mark.create<SpawnHighlightOptions>({
  name: "spawnHighlight",

  inclusive: false,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      nodeId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-node-id"),
        renderHTML: (attributes) =>
          attributes.nodeId ? { "data-node-id": attributes.nodeId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "mark[data-node-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(
        { class: "spawn-highlight" },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setSpawnHighlight:
        (nodeId) =>
        ({ commands }) =>
          commands.setMark(this.name, { nodeId }),
    };
  },
});

export default SpawnHighlight;
