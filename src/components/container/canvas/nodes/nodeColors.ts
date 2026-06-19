import type { NodeColor, PaperColor } from "../types";

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

/** Per-color **text** color classes for the plain Text node — the actual font
 *  color (not a header/border accent). `default` is theme-adaptive (slate-800 in
 *  light, slate-100 in dark) so labels stay readable in both themes; the accent
 *  hues use a mid shade that reads on the canvas background. Static Tailwind
 *  literals so they survive the JIT purge. */
export const TEXT_COLORS: Record<NodeColor, { label: string; text: string; swatch: string; ring: string }> = {
  default: { label: "Default", text: "text-slate-800 dark:text-slate-100", swatch: "bg-slate-800 dark:bg-slate-100", ring: "ring-slate-400" },
  violet: { label: "Violet", text: "text-violet-600 dark:text-violet-400", swatch: "bg-violet-500", ring: "ring-violet-500" },
  sky: { label: "Sky", text: "text-sky-600 dark:text-sky-400", swatch: "bg-sky-500", ring: "ring-sky-500" },
  emerald: { label: "Emerald", text: "text-emerald-600 dark:text-emerald-400", swatch: "bg-emerald-500", ring: "ring-emerald-500" },
  amber: { label: "Amber", text: "text-amber-600 dark:text-amber-400", swatch: "bg-amber-500", ring: "ring-amber-500" },
  rose: { label: "Rose", text: "text-rose-600 dark:text-rose-400", swatch: "bg-rose-500", ring: "ring-rose-500" },
  teal: { label: "Teal", text: "text-teal-600 dark:text-teal-400", swatch: "bg-teal-500", ring: "ring-teal-500" },
  indigo: { label: "Indigo", text: "text-indigo-600 dark:text-indigo-400", swatch: "bg-indigo-500", ring: "ring-indigo-500" },
};

/** Resolve a Text node's font color classes (falling back to default). */
export function textColor(color: NodeColor | undefined) {
  return TEXT_COLORS[color ?? "default"];
}

/** Per-color paper (drawing-surface) options for the Draw node. `default` is
 *  theme-adaptive — `surface: null` signals "don't override", so the node keeps
 *  its existing `bg-white dark:bg-slate-900` surface and theme-adaptive dots.
 *  Every other option is a solid light fill rendered identically in light and
 *  dark, paired with a fixed subtle-gray dot color (paper is always light, so
 *  the dark ink stays readable). `swatch` is the popover swatch background. */
export const PAPER_COLORS: Record<
  PaperColor,
  { label: string; surface: string | null; dot: string; swatch: string }
> = {
  default: { label: "Default", surface: null, dot: "#cbd5e1", swatch: "bg-white ring-1 ring-inset ring-slate-300 dark:bg-slate-900 dark:ring-slate-600" },
  white: { label: "White", surface: "#ffffff", dot: "#e2e8f0", swatch: "bg-white ring-1 ring-inset ring-slate-300" },
  cream: { label: "Cream", surface: "#fdf6e3", dot: "#e7dcb8", swatch: "bg-[#fdf6e3] ring-1 ring-inset ring-amber-200" },
  blue: { label: "Blue", surface: "#eff6ff", dot: "#cfe0f5", swatch: "bg-[#eff6ff] ring-1 ring-inset ring-sky-200" },
  green: { label: "Green", surface: "#f0fdf4", dot: "#cdeed7", swatch: "bg-[#f0fdf4] ring-1 ring-inset ring-emerald-200" },
  pink: { label: "Pink", surface: "#fdf2f8", dot: "#f3d9e6", swatch: "bg-[#fdf2f8] ring-1 ring-inset ring-rose-200" },
};

export const PAPER_COLOR_KEYS = Object.keys(PAPER_COLORS) as PaperColor[];

/** Resolve a Draw node's paper color (falling back to default). */
export function paperColor(color: PaperColor | undefined) {
  return PAPER_COLORS[color ?? "default"];
}
