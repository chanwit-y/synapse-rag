"use client";

import { useEffect, useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { NODE_COLORS, NODE_COLOR_KEYS } from "../nodes/nodeColors";
import type { NodeColor } from "../types";

/**
 * A plain connection edge with a per-edge color picker. A small dot button sits
 * at the edge midpoint (revealed on hover/selection, like the node color
 * button); clicking it opens the shared swatch popover. Picking a swatch writes
 * `data.color` (a NodeColor) onto the edge; the stroke is derived from that
 * color's `dot` hex. Until a color is picked, the edge keeps whatever
 * `style.stroke` it was created with (slate connects, amber spawns).
 *
 * Only plain edges use this type — highlight edges stay the default amber,
 * click-through edges managed by `displayEdges`.
 */
export default function ColorableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
  style,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const color = (data?.color as NodeColor | undefined) ?? undefined;
  const stroke = color
    ? NODE_COLORS[color].dot
    : (style?.stroke as string | undefined) ?? NODE_COLORS.default.dot;

  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the popover on any outside pointerdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const show = selected || hovered || open;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, stroke, strokeWidth: selected ? 3 : (style?.strokeWidth as number) ?? 2 }}
      />
      {/* Transparent fat path purely for hover detection (clicks still bubble to
          react-flow's edge group → selection unaffected). */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        style={{ pointerEvents: "stroke" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <EdgeLabelRenderer>
        <div
          ref={ref}
          className="nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: show ? "all" : "none",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            onClick={() => setOpen((o) => !o)}
            title="Edge color"
            className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-opacity hover:ring-slate-300 ${
              show ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stroke }} />
          </button>

          {open && (
            <div
              className="absolute left-1/2 top-7 z-20 grid -translate-x-1/2 gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/15"
              style={{ gridTemplateColumns: "repeat(4, 1.5rem)" }}
            >
              {NODE_COLOR_KEYS.map((key) => {
                const c = NODE_COLORS[key];
                const isActive = (color ?? "default") === key;
                return (
                  <button
                    key={key}
                    title={c.label}
                    onClick={() => {
                      setEdges((eds) =>
                        eds.map((e) =>
                          e.id === id ? { ...e, data: { ...e.data, color: key } } : e,
                        ),
                      );
                      setOpen(false);
                    }}
                    className={`h-6 w-6 rounded-full ${c.swatch} transition-transform hover:scale-110 ${
                      isActive ? `ring-2 ring-offset-1 ring-offset-white ${c.ring}` : ""
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
