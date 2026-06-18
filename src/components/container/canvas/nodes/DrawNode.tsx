"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { Pencil, Eraser, Undo2, Trash2 } from "lucide-react";
import SideHandles from "./SideHandles";
import NodeRemoveButton from "./NodeRemoveButton";
import NodeColorButton from "./NodeColorButton";
import { nodeColor } from "./nodeColors";
import type { Stroke, DrawNode as DrawNodeType } from "../types";

/** Fixed internal coordinate space. The SVG fills the body with this viewBox
 *  (preserveAspectRatio="none"), so strokes map 1:1 to the node and scale with
 *  NodeResizer. Pointer→internal mapping is pure rect fractions, which makes it
 *  zoom- and resize-independent without ever touching getZoom(). */
const VB = 1000;

/** The pen palette — a dedicated ink set tuned to read on white (separate from
 *  the node-accent palette, which tints chrome). */
const INKS = [
  { name: "Slate", color: "#334155" },
  { name: "Red", color: "#ef4444" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Green", color: "#22c55e" },
  { name: "Amber", color: "#f59e0b" },
];

/** Stroke widths in internal units (scale with the node). */
const WIDTHS = [
  { name: "Thin", width: 5 },
  { name: "Medium", width: 11 },
  { name: "Thick", width: 20 },
];

/** How close (in internal units) the eraser must pass to a stroke to drop it. */
const ERASE_RADIUS = 28;

/** Horizontal breathing room (px) kept between the toolbar and the node edges. */
const TOOLBAR_MARGIN = 16;
/** Smallest the toolbar is allowed to scale, so it stays legible/tappable. */
const TOOLBAR_MIN_SCALE = 0.7;

let strokeCounter = 0;
const nextStrokeId = () => `stk-${Date.now()}-${strokeCounter++}`;

/** Build an SVG path string from a flat [x0,y0,x1,y1,…] point list. A single
 *  point becomes a zero-length segment so round caps render it as a dot. */
function toPath(points: number[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += ` L ${points[i]} ${points[i + 1]}`;
  if (points.length === 2) d += ` L ${points[0]} ${points[1]}`;
  return d;
}

export default function DrawNode({ id, data, selected, width: nodeWidth }: NodeProps<DrawNodeType>) {
  const c = nodeColor(data.color);
  const svgRef = useRef<SVGSVGElement>(null);

  // Toolbar tracks node width: full-size when the node is wide enough to hold
  // it, shrinking proportionally (clamped to TOOLBAR_MIN_SCALE) as the node
  // narrows so it never overflows the edges. Scaled against the bar's own
  // measured layout width (transform doesn't affect scrollWidth, so no loop).
  const barRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(0);
  useLayoutEffect(() => {
    if (selected && barRef.current) setBarWidth(barRef.current.scrollWidth);
  }, [selected]);
  const toolbarScale =
    barWidth && nodeWidth
      ? Math.max(TOOLBAR_MIN_SCALE, Math.min(1, (nodeWidth - TOOLBAR_MARGIN) / barWidth))
      : 1;

  const [title, setTitle] = useState(data.title);
  const [strokes, setStrokes] = useState<Stroke[]>(data.strokes ?? []);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(INKS[0].color);
  const [width, setWidth] = useState(WIDTHS[1].width);

  // In-progress stroke (pen). The ref is the source of truth for committing;
  // `draft` mirrors it only to trigger the live-path redraw. Keeping the commit
  // out of any setState updater keeps updaters pure (React 19 StrictMode
  // double-invokes them in dev, which would otherwise commit the stroke twice).
  const draftRef = useRef<number[] | null>(null);
  const [draft, setDraft] = useState<number[] | null>(null);
  const drafting = useRef(false);

  /** Map a pointer event to clamped internal coords via the SVG's screen rect. */
  const toInternal = (clientX: number, clientY: number): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VB;
    const y = ((clientY - rect.top) / rect.height) * VB;
    return [Math.max(0, Math.min(VB, x)), Math.max(0, Math.min(VB, y))];
  };

  /** Drop any stroke passing within ERASE_RADIUS of (x,y). */
  const eraseAt = (x: number, y: number) =>
    setStrokes((ls) =>
      ls.filter((s) => {
        for (let i = 0; i < s.points.length; i += 2) {
          const dx = s.points[i] - x;
          const dy = s.points[i + 1] - y;
          if (dx * dx + dy * dy <= ERASE_RADIUS * ERASE_RADIUS) return false;
        }
        return true;
      }),
    );

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const [x, y] = toInternal(e.clientX, e.clientY);
    drafting.current = true;
    if (tool === "eraser") {
      eraseAt(x, y);
    } else {
      draftRef.current = [x, y];
      setDraft(draftRef.current);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drafting.current) return;
    const [x, y] = toInternal(e.clientX, e.clientY);
    if (tool === "eraser") {
      eraseAt(x, y);
    } else {
      draftRef.current = [...(draftRef.current ?? []), x, y];
      setDraft(draftRef.current);
    }
  };

  const endStroke = () => {
    if (!drafting.current) return;
    drafting.current = false;
    const points = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (tool === "pen" && points && points.length >= 2) {
      setStrokes((ls) => [...ls, { id: nextStrokeId(), color, width, points }]);
    }
  };

  const undo = () => setStrokes((ls) => ls.slice(0, -1));
  const clear = () => setStrokes([]);

  return (
    <div className={`group relative flex h-full w-full flex-col rounded-2xl border ${c.border} bg-white shadow-xl shadow-slate-900/10 [contain:layout]`}>
      <NodeResizer isVisible={selected} minWidth={220} minHeight={200} color="#a78bfa" />
      <SideHandles />
      <NodeRemoveButton id={id} />
      <NodeColorButton id={id} color={data.color} />

      <div className={`flex items-center gap-2 rounded-t-2xl border-b border-slate-100 ${c.header} px-4 py-2.5`}>
        <Pencil size={15} className="shrink-0 text-slate-500" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="nodrag min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      {/* Drawing surface — the body always captures drags as strokes. */}
      <div className="relative min-h-0 flex-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB} ${VB}`}
          preserveAspectRatio="none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          className={`nodrag nopan nowheel h-full w-full rounded-b-2xl bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] ${
            tool === "eraser" ? "cursor-cell" : "cursor-crosshair"
          }`}
        >
          {strokes.map((s) => (
            <path
              key={s.id}
              d={toPath(s.points)}
              stroke={s.color}
              strokeWidth={s.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {draft && draft.length >= 2 && (
            <path
              d={toPath(draft)}
              stroke={color}
              strokeWidth={width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {strokes.length === 0 && !draft && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-slate-300">
            Draw here
          </p>
        )}

        {/* Floating tool bar — overlay so toggling it never resizes the canvas. */}
        {selected && (
          <div
            ref={barRef}
            style={{
              transform: `translateX(-50%) scale(${toolbarScale})`,
              transformOrigin: "bottom center",
            }}
            className="nodrag absolute bottom-2 left-1/2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-lg"
          >
            <div className="flex items-center gap-1">
              {INKS.map((ink) => (
                <button
                  key={ink.color}
                  title={ink.name}
                  onClick={() => {
                    setColor(ink.color);
                    setTool("pen");
                  }}
                  className={`h-5 w-5 rounded-full ring-offset-1 transition-[box-shadow] ${
                    tool === "pen" && color === ink.color
                      ? "ring-2 ring-slate-400"
                      : "ring-1 ring-slate-200"
                  }`}
                  style={{ backgroundColor: ink.color }}
                />
              ))}
            </div>

            <div className="h-5 w-px bg-slate-200" />

            <div className="flex items-center gap-1">
              {WIDTHS.map((w) => (
                <button
                  key={w.width}
                  title={w.name}
                  onClick={() => {
                    setWidth(w.width);
                    setTool("pen");
                  }}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                    tool === "pen" && width === w.width
                      ? "bg-slate-800"
                      : "hover:bg-slate-100"
                  }`}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: w.width / 2.5,
                      height: w.width / 2.5,
                      backgroundColor: tool === "pen" && width === w.width ? "#fff" : "#64748b",
                    }}
                  />
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-slate-200" />

            <button
              title="Eraser"
              onClick={() => setTool("eraser")}
              className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                tool === "eraser" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Eraser size={14} />
            </button>
            <button
              title="Undo last stroke"
              onClick={undo}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100"
            >
              <Undo2 size={14} />
            </button>
            <button
              title="Clear all"
              onClick={clear}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
