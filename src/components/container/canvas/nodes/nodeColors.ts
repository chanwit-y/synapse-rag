import type { NodeColor } from "../types";

/** Per-color class sets for the node accent. Each holds the **rest** border,
 *  the header background tint, the picker swatch, the deeper `ring` shade used to
 *  mark the active swatch, and a `dot` hex (the -300 shade) used to tint the
 *  node on the minimap — class sets are static Tailwind literals so they survive
 *  the JIT purge. `default` is the neutral option: a white/outline swatch (not a
 *  gray fill) so it reads as "no accent", with a neutral slate selection ring;
 *  its `dot` is unused (default nodes fall back to a per-type minimap color). */
export const NODE_COLORS: Record<
  NodeColor,
  { label: string; border: string; header: string; swatch: string; ring: string; dot: string }
> = {
  default: { label: "Default", border: "border-slate-200 dark:border-slate-700", header: "bg-slate-50/70 dark:bg-slate-800/50", swatch: "bg-white ring-1 ring-inset ring-slate-300", ring: "ring-slate-400", dot: "#cbd5e1" },
  violet: { label: "Violet", border: "border-violet-300 dark:border-violet-500/50", header: "bg-violet-50 dark:bg-violet-500/10", swatch: "bg-violet-400", ring: "ring-violet-500", dot: "#c4b5fd" },
  sky: { label: "Sky", border: "border-sky-300 dark:border-sky-500/50", header: "bg-sky-50 dark:bg-sky-500/10", swatch: "bg-sky-400", ring: "ring-sky-500", dot: "#7dd3fc" },
  emerald: { label: "Emerald", border: "border-emerald-300 dark:border-emerald-500/50", header: "bg-emerald-50 dark:bg-emerald-500/10", swatch: "bg-emerald-400", ring: "ring-emerald-500", dot: "#6ee7b7" },
  amber: { label: "Amber", border: "border-amber-300 dark:border-amber-500/50", header: "bg-amber-50 dark:bg-amber-500/10", swatch: "bg-amber-400", ring: "ring-amber-500", dot: "#fcd34d" },
  rose: { label: "Rose", border: "border-rose-300 dark:border-rose-500/50", header: "bg-rose-50 dark:bg-rose-500/10", swatch: "bg-rose-400", ring: "ring-rose-500", dot: "#fda4af" },
  teal: { label: "Teal", border: "border-teal-300 dark:border-teal-500/50", header: "bg-teal-50 dark:bg-teal-500/10", swatch: "bg-teal-400", ring: "ring-teal-500", dot: "#5eead4" },
  indigo: { label: "Indigo", border: "border-indigo-300 dark:border-indigo-500/50", header: "bg-indigo-50 dark:bg-indigo-500/10", swatch: "bg-indigo-400", ring: "ring-indigo-500", dot: "#a5b4fc" },
};

export const NODE_COLOR_KEYS = Object.keys(NODE_COLORS) as NodeColor[];

/** Resolve a node's color (falling back to default). */
export function nodeColor(color: NodeColor | undefined) {
  return NODE_COLORS[color ?? "default"];
}
