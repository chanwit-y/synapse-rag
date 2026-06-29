"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { NODE_COLORS, NODE_COLOR_KEYS } from "./nodeColors";
import { useCanvasStore } from "../store/canvas-store";
import type { NodeColor } from "../types";

/**
 * A small palette control rendered next to each node's ✕. Revealed on hover
 * (`group-hover`) or selection (the `.node-ctl` rule in globals.css). Clicking
 * opens a swatch popover; picking a swatch writes `data.color` via
 * `updateNodeData`, which every node reads to tint its header + border.
 */
export default function NodeColorButton({
  id,
  color,
  positionClassName = "right-10 top-1.5",
}: {
  id: string;
  color: NodeColor | undefined;
  /** Override the absolute position of the control (default sits at `right-10`).
   *  Used when a node has extra controls and needs the color picker re-slotted. */
  positionClassName?: string;
}) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = color ?? "default";

  // Close on any pointerdown outside this control — robust across clicks on the
  // canvas, other nodes, and other nodes' palette triggers (an overlay catcher
  // sits below those triggers and misses them).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={ref} className={`nodrag absolute ${positionClassName} z-20`}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Node color"
        className={`node-ctl flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-opacity hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700 dark:hover:text-slate-200 ${
          open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <Palette size={13} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 z-20 grid w-max gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-800"
          style={{ gridTemplateColumns: "repeat(4, 1.5rem)" }}
        >
            {NODE_COLOR_KEYS.map((key) => {
              const c = NODE_COLORS[key];
              const isActive = active === key;
              return (
                <button
                  key={key}
                  title={c.label}
                  onClick={() => {
                    updateNodeData(id, { color: key });
                    setOpen(false);
                  }}
                  className={`h-6 w-6 rounded-full ${c.swatch} transition-transform hover:scale-110 ${
                    isActive
                      ? `ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-800 ${c.ring}`
                      : ""
                  }`}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
