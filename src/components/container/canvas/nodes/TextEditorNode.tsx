"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Handle,
  NodeResizer,
  Position,
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import {
  Bold,
  Italic,
  Underline,
  List,
  Heading,
  Sparkles,
  StickyNote,
  ArrowLeft,
} from "lucide-react";
import { useCanvasStore } from "../store/canvas-store";
import SideHandles, { SIDES } from "./SideHandles";
import NodeRemoveButton from "./NodeRemoveButton";
import NodeColorButton from "./NodeColorButton";
import { nodeColor } from "./nodeColors";
import SideChoiceRow from "./SideChoiceRow";
import type { TextEditorNode as TextEditorNodeType } from "../types";
// (highlight popover uses the shared SideChoiceRow)

type Rect = { top: number; left: number; width: number; height: number };

/** The in-progress (unsaved) selection — drives the popover + preview overlay.
 *  A highlight is only persisted when the user spawns a node from it. */
type Live = { start: number; end: number; phrase: string; rects: Rect[] };

/** Active state of the "choose source/target side" step in the popover. */
type Picker = {
  kind: "chat" | "textEditor";
  title: string;
  /** source handle: "highlight" or one of the four side names */
  src: string;
  /** target handle: one of the four side names */
  tgt: string;
};

// Body padding (px-4 py-3) — overlay/handle are positioned in the padded parent.
const PAD_X = 16;
const PAD_Y = 12;

/** Toolbar buttons are visual-only per spec (the editor body is the real interaction). */
const FORMAT_BUTTONS = [
  { icon: Heading, label: "Heading" },
  { icon: Bold, label: "Bold" },
  { icon: Italic, label: "Italic" },
  { icon: Underline, label: "Underline" },
  { icon: List, label: "List" },
];

/** Character offsets of a DOM selection within `root`'s text content. Measured
 *  via Range string length so it works regardless of text-node/element split. */
function selectionOffsets(root: HTMLElement, range: Range) {
  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const end = start + range.toString().length;
  return { start, end };
}

/** Build a DOM Range spanning [start, end) characters of `root`'s text content. */
function rangeFromOffsets(root: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let acc = 0;
  let startNode: Text | null = null;
  let startOff = 0;
  let endNode: Text | null = null;
  let endOff = 0;
  let n: Text | null;
  while ((n = walker.nextNode() as Text | null)) {
    const len = n.textContent?.length ?? 0;
    if (startNode === null && start <= acc + len) {
      startNode = n;
      startOff = Math.max(0, start - acc);
    }
    if (end <= acc + len) {
      endNode = n;
      endOff = Math.max(0, end - acc);
      break;
    }
    acc += len;
  }
  if (!startNode) return null;
  if (!endNode) {
    endNode = startNode;
    endOff = startNode.textContent?.length ?? 0;
  }
  try {
    const range = document.createRange();
    range.setStart(startNode, Math.min(startOff, startNode.textContent?.length ?? 0));
    range.setEnd(endNode, Math.min(endOff, endNode.textContent?.length ?? 0));
    return range;
  } catch {
    return null;
  }
}

export default function TextEditorNode({
  id,
  data,
  selected,
}: NodeProps<TextEditorNodeType>) {
  const notify = useCanvasStore((s) => s.notify);
  const spawn = useCanvasStore((s) => s.spawn);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const { getZoom, getEdges } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const bodyRef = useRef<HTMLDivElement>(null);
  // Bumped on resize so the highlight-rect layout effect re-measures (text reflows).
  const [resizeTick, setResizeTick] = useState(0);
  const c = nodeColor(data.color);
  const highlights = data.highlights ?? [];
  // Per-line rects for each saved highlight, keyed by its paired node id.
  const [rectsMap, setRectsMap] = useState<Record<string, Rect[]>>({});
  // The live, unsaved selection (transient preview + popover anchor).
  const [live, setLive] = useState<Live | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);

  // Comma-joined ids of this node's highlight-children that are currently
  // selected (a primitive, to limit re-renders). Drives per-pair focus reveal:
  // selecting a child lights up only its paired phrase.
  const selectedChildIds = useStore(
    useCallback(
      (s) => {
        const ids: string[] = [];
        s.edges.forEach((e) => {
          if (
            e.source === id &&
            e.sourceHandle?.startsWith("highlight-") &&
            (s.nodeLookup.get(e.target)?.selected ?? false)
          ) {
            ids.push(e.target);
          }
        });
        return ids.join(",");
      },
      [id],
    ),
  );
  const selectedChildSet = new Set(
    selectedChildIds ? selectedChildIds.split(",") : [],
  );

  // Convert a DOM Range to per-line rects in the body's *unscaled* CSS space,
  // compensating for the react-flow viewport zoom transform.
  const rectsFromRange = useCallback(
    (range: Range): Rect[] => {
      const body = bodyRef.current;
      if (!body) return [];
      const bodyRect = body.getBoundingClientRect();
      const zoom = getZoom() || 1;
      return Array.from(range.getClientRects())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({
          left: (r.left - bodyRect.left) / zoom,
          top: (r.top - bodyRect.top) / zoom,
          width: r.width / zoom,
          height: r.height / zoom,
        }));
    },
    [getZoom],
  );

  // Migrate a seeded `initialHighlight` into a saved highlight, paired to the
  // child read off the seeded `highlight-<child>` edge. Mount only. (Spawned
  // leaf notes have no outgoing highlight edge → no migration, by design.)
  useLayoutEffect(() => {
    if (highlights.length > 0) return;
    const seed = data.initialHighlight?.trim();
    if (!seed) return;
    const text = bodyRef.current?.textContent ?? "";
    const start = text.indexOf(seed);
    if (start < 0) return;
    const edge = getEdges().find(
      (e) => e.source === id && e.sourceHandle?.startsWith("highlight-"),
    );
    const nodeId = edge?.sourceHandle?.slice("highlight-".length);
    if (!nodeId) return;
    updateNodeData(id, {
      highlights: [{ nodeId, start, end: start + seed.length, phrase: seed }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute every saved highlight's rects whenever the set changes.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const map: Record<string, Rect[]> = {};
    for (const h of highlights) {
      const range = rangeFromOffsets(body, h.start, h.end);
      if (range) map[h.nodeId] = rectsFromRange(range);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRectsMap(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.highlights, rectsFromRange, resizeTick]);

  // Re-measure handle positions whenever rects move so edges re-anchor.
  useEffect(() => {
    updateNodeInternals(id);
  }, [rectsMap, id, updateNodeInternals]);

  // Selecting text shows the popover + a transient preview; nothing is saved
  // until the user spawns a node. A collapsed selection clears the preview.
  const handleSelect = useCallback(() => {
    const body = bodyRef.current;
    const sel = window.getSelection();
    if (!body || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setShowPopover(false);
      setPicker(null);
      setLive(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!body.contains(range.commonAncestorContainer)) return;
    const { start, end } = selectionOffsets(body, range);
    if (end <= start) {
      setShowPopover(false);
      setLive(null);
      return;
    }
    const phrase = body.textContent?.slice(start, end) ?? "";
    setLive({ start, end, phrase, rects: rectsFromRange(range) });
    setShowPopover(true);
    setPicker(null);
  }, [rectsFromRange]);

  // Clicking away (no selection) hides the popover + preview.
  const handleBlur = useCallback(() => {
    setShowPopover(false);
    setPicker(null);
    setLive(null);
  }, []);

  // Spawn the paired node. With "From: Highlight" the handler saves a highlight
  // (keyed to the new child) and anchors the edge to it; a side source spawns a
  // plain side-anchored edge with no saved highlight.
  const createFromPicker = useCallback(() => {
    if (!picker || !live) return;
    const phrase = live.phrase.trim();
    if (!phrase) return;
    const isHighlight = picker.src === "highlight";
    spawn({
      text: phrase,
      sourceNodeId: id,
      title: picker.title,
      kind: picker.kind,
      sourceHandle: isHighlight ? "highlight" : `s-${picker.src}`,
      targetHandle: `t-${picker.tgt}`,
      highlight: isHighlight ? { start: live.start, end: live.end } : undefined,
    });
    setPicker(null);
    setShowPopover(false);
    setLive(null);
    window.getSelection()?.removeAllRanges();
  }, [picker, live, id, spawn]);

  const anchorOf = (rects: Rect[]) =>
    rects[0]
      ? { x: rects[0].left + PAD_X + rects[0].width / 2, y: rects[0].top + PAD_Y }
      : null;
  const popoverAnchor = live ? anchorOf(live.rects) : null;

  const popoverButton =
    "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700";

  return (
    <div
      className={`group relative h-full w-full rounded-2xl border bg-white shadow-xl shadow-slate-900/10 [contain:layout] dark:bg-slate-900 dark:shadow-black/40 ${
        selected ? "border-amber-300 ring-2 ring-amber-200 dark:border-amber-500/60 dark:ring-amber-500/30" : c.border
      }`}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={260}
        minHeight={140}
        color="#fbbf24"
        onResize={() => setResizeTick((t) => t + 1)}
      />
      {/* Four-side connection handles */}
      <SideHandles />
      <NodeRemoveButton id={id} />
      <NodeColorButton id={id} color={data.color} />

      {/* Header / drag handle */}
      <div className={`flex items-center justify-between rounded-t-2xl border-b border-slate-100 ${c.header} px-4 py-2.5 dark:border-slate-800`}>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{data.title}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 transition-opacity group-hover:opacity-0 dark:text-slate-500">
          Document
        </span>
      </div>

      {/* Formatting toolbar (visual only) */}
      <div className="flex items-center gap-0.5 border-b border-slate-100 px-3 py-1.5 dark:border-slate-800">
        {FORMAT_BUTTONS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            title={label}
            className="nodrag rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            onClick={() => notify(`${label} — formatting is visual-only in this demo`)}
          >
            <Icon size={15} strokeWidth={2} />
          </button>
        ))}
      </div>

      {/* Editable body */}
      <div className="relative px-4 py-3">
        <div
          ref={bodyRef}
          contentEditable
          suppressContentEditableWarning
          onMouseUp={handleSelect}
          onKeyUp={handleSelect}
          onBlur={handleBlur}
          className="nodrag nowheel relative z-10 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-600 outline-none dark:text-slate-300"
        >
          {data.paragraph}
        </div>

        {/* Saved highlight overlays — focus-revealed per pair: shown when this
            node is selected (all) or the paired child is selected (just that
            one). One box per visual line, highlighter-pen look via multiply. */}
        {highlights.map((h) => {
          const show = selected || selectedChildSet.has(h.nodeId);
          if (!show) return null;
          return (rectsMap[h.nodeId] ?? []).map((r, i) => (
            <div
              key={`${h.nodeId}-${i}`}
              className="pointer-events-none absolute z-0 rounded-[3px]"
              style={{
                left: r.left + PAD_X,
                top: r.top + PAD_Y,
                width: r.width,
                height: r.height,
                background: "rgba(250, 204, 21, 0.55)",
                mixBlendMode: "multiply",
              }}
            />
          ));
        })}

        {/* Live selection preview (unsaved) — shown while the popover is open. */}
        {showPopover &&
          live?.rects.map((r, i) => (
            <div
              key={`live-${i}`}
              className="pointer-events-none absolute z-0 rounded-[3px]"
              style={{
                left: r.left + PAD_X,
                top: r.top + PAD_Y,
                width: r.width,
                height: r.height,
                background: "rgba(250, 204, 21, 0.55)",
                mixBlendMode: "multiply",
              }}
            />
          ))}

        {/* Source handles — one per saved highlight, anchored to its first line
            (always rendered so edge geometry survives when the overlay hides). */}
        {highlights.map((h) => {
          const a = anchorOf(rectsMap[h.nodeId] ?? []);
          if (!a) return null;
          return (
            <Handle
              key={h.nodeId}
              id={`highlight-${h.nodeId}`}
              type="source"
              position={Position.Top}
              isConnectable={false}
              style={{ left: a.x, top: a.y, transform: "translate(-50%, -50%)" }}
              className="!h-3 !w-3 !border-2 !border-white !bg-amber-400 !shadow dark:!border-slate-900"
            />
          );
        })}

        {/* Floating context menu popover — only while text is being selected */}
        {popoverAnchor && showPopover && (
          <div
            // Keep the editor's selection when clicking inside (no blur).
            onMouseDown={(e) => e.preventDefault()}
            className="nodrag absolute z-20 min-w-[230px] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-800"
            style={{ left: popoverAnchor.x, top: popoverAnchor.y - 8 }}
          >
            {picker ? (
              <div className="flex flex-col gap-1.5 p-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPicker(null)}
                    className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                    title="Back"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    New {picker.title}
                  </span>
                </div>
                <SideChoiceRow
                  label="From"
                  value={picker.src}
                  options={["highlight", ...SIDES.map((s) => s.side)]}
                  onChange={(v) => setPicker({ ...picker, src: v })}
                />
                <SideChoiceRow
                  label="To"
                  value={picker.tgt}
                  options={SIDES.map((s) => s.side)}
                  onChange={(v) => setPicker({ ...picker, tgt: v })}
                />
                <button
                  onClick={createFromPicker}
                  className="mt-0.5 rounded-lg bg-violet-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-600"
                >
                  Create
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5">
                <button
                  className={popoverButton}
                  onClick={() =>
                    setPicker({ kind: "chat", title: "Ask AI", src: "highlight", tgt: "top" })
                  }
                >
                  <Sparkles size={13} className="text-amber-500" /> Ask AI
                </button>
                <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                <button
                  className={popoverButton}
                  onClick={() =>
                    setPicker({ kind: "textEditor", title: "Note", src: "highlight", tgt: "top" })
                  }
                >
                  <StickyNote size={13} className="text-sky-500" /> Note
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
