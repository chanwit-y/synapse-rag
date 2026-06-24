"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  ListTodo,
  Heading,
  Sparkles,
  StickyNote,
  ArrowLeft,
  FileInput,
} from "lucide-react";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  buildTableExtensions,
  buildTaskListExtensions,
  TableMenu,
} from "@/components/common/TiptapEditor";
import { summarizeContextAction } from "@/server/actions";
import { useCanvasStore } from "../store/canvas-store";
import { htmlToProseMirrorDoc, markdownToProseMirrorDoc } from "./markdownToDoc";
import SideHandles, { SIDES } from "./SideHandles";
import NodeRemoveButton from "./NodeRemoveButton";
import NodeColorButton from "./NodeColorButton";
import { nodeColor } from "./nodeColors";
import SideChoiceRow from "./SideChoiceRow";
import { SpawnHighlight } from "./spawnHighlight";
import type { Highlight, TextEditorNode as TextEditorNodeType } from "../types";

type Rect = { top: number; left: number; width: number; height: number };

/** The in-progress (unsaved) selection — drives the popover. ProseMirror
 *  positions (`from`/`to`), the phrase text, and a body-relative anchor. */
type Live = { from: number; to: number; phrase: string; anchor: { x: number; y: number } };

/** Active state of the "choose source/target side" step in the popover. */
type Picker = {
  kind: "chat" | "textEditor";
  title: string;
  /** source handle: "highlight" or one of the four side names */
  src: string;
  /** target handle: one of the four side names */
  tgt: string;
};

/** Toolbar buttons → Tiptap commands + the `isActive` key each reflects. */
const FORMAT_BUTTONS = [
  {
    icon: Heading,
    label: "Heading",
    active: "heading" as const,
    run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    icon: Bold,
    label: "Bold",
    active: "bold" as const,
    run: (e: Editor) => e.chain().focus().toggleBold().run(),
  },
  {
    icon: Italic,
    label: "Italic",
    active: "italic" as const,
    run: (e: Editor) => e.chain().focus().toggleItalic().run(),
  },
  {
    icon: Underline,
    label: "Underline",
    active: "underline" as const,
    run: (e: Editor) => e.chain().focus().toggleUnderline().run(),
  },
  {
    icon: List,
    label: "List",
    active: "bulletList" as const,
    run: (e: Editor) => e.chain().focus().toggleBulletList().run(),
  },
  {
    icon: ListTodo,
    label: "Task list",
    active: "taskList" as const,
    run: (e: Editor) => e.chain().focus().toggleTaskList().run(),
  },
];

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

/** Build a single-paragraph ProseMirror doc from plain text, applying a
 *  `spawnHighlight` mark over each [start,end) range. Used only to migrate a
 *  legacy `paragraph` into `doc` (the mark is the source of truth afterwards). */
function paragraphDocWithMarks(
  text: string,
  ranges: { nodeId: string; start: number; end: number }[],
): JSONContent {
  if (!text) return EMPTY_DOC;
  // Boundaries split the text into segments; each segment carries the marks of
  // every range covering it (ranges here never overlap in practice).
  const bounds = new Set<number>([0, text.length]);
  for (const r of ranges) {
    bounds.add(Math.max(0, Math.min(text.length, r.start)));
    bounds.add(Math.max(0, Math.min(text.length, r.end)));
  }
  const points = [...bounds].sort((a, b) => a - b);
  const content: JSONContent[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const s = points[i];
    const e = points[i + 1];
    const slice = text.slice(s, e);
    if (!slice) continue;
    const marks = ranges
      .filter((r) => r.start <= s && r.end >= e)
      .map((r) => ({ type: "spawnHighlight", attrs: { nodeId: r.nodeId } }));
    content.push(marks.length ? { type: "text", text: slice, marks } : { type: "text", text: slice });
  }
  return { type: "doc", content: [content.length ? { type: "paragraph", content } : { type: "paragraph" }] };
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

  // Coordinate origin for handles/overlays — the padded body container.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [resizeTick, setResizeTick] = useState(0);
  const c = nodeColor(data.color);
  const highlights = useMemo(() => data.highlights ?? [], [data.highlights]);
  // First-line rect (body space) per live highlight, keyed by paired child id.
  const [rectsMap, setRectsMap] = useState<Record<string, Rect[]>>({});
  const [live, setLive] = useState<Live | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  // While true, "Create" is awaiting the context summary before spawning.
  const [summarizing, setSummarizing] = useState(false);
  // Import-from-source popover: open flag, chosen source format, pasted text, and
  // whether we're on the "replace existing content?" confirmation step.
  const [importOpen, setImportOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<"markdown" | "html">("markdown");
  const [importText, setImportText] = useState("");
  const [importConfirm, setImportConfirm] = useState(false);

  // Comma-joined ids of this node's selected highlight-children (primitive, to
  // limit re-renders) — drives per-pair focus reveal.
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

  // Initial editor content: prefer the saved `doc`; otherwise migrate the legacy
  // `paragraph` (+ any offset highlights / seeded `initialHighlight`) into a doc
  // with `spawnHighlight` marks. Computed once for the editor's life.
  const initial = useMemo(() => {
    if (data.doc) return { doc: data.doc, migratedHighlights: null as Highlight[] | null };
    const text = data.paragraph ?? "";
    const ranges: { nodeId: string; start: number; end: number }[] = [];
    for (const h of highlights) {
      if (h.start !== undefined && h.end !== undefined) {
        ranges.push({ nodeId: h.nodeId, start: h.start, end: h.end });
      }
    }
    let migratedHighlights: Highlight[] | null = null;
    // Seed an `initialHighlight` only when this node has an outgoing highlight
    // edge to pair it with (mirrors the legacy mount migration).
    if (ranges.length === 0 && data.initialHighlight?.trim()) {
      const seed = data.initialHighlight.trim();
      const start = text.indexOf(seed);
      const edge = getEdges().find(
        (e) => e.source === id && e.sourceHandle?.startsWith("highlight-"),
      );
      const nodeId = edge?.sourceHandle?.slice("highlight-".length);
      if (start >= 0 && nodeId) {
        ranges.push({ nodeId, start, end: start + seed.length });
        migratedHighlights = [...highlights, { nodeId, phrase: seed }];
      }
    }
    return { doc: paragraphDocWithMarks(text, ranges), migratedHighlights };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Latest values for the editor's (create-once) event callbacks.
  const liveDepsRef = useRef({ getZoom });
  useEffect(() => {
    liveDepsRef.current = { getZoom };
  }, [getZoom]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushDoc = useCallback(
    (editor: Editor) => {
      updateNodeData(id, { doc: editor.getJSON() });
    },
    [id, updateNodeData],
  );

  // Recompute the popover anchor + phrase from the current selection.
  const refreshPopover = useCallback((editor: Editor) => {
    const { from, to, empty } = editor.state.selection;
    const body = bodyRef.current;
    if (empty || to <= from || !body) {
      setShowPopover(false);
      setPicker(null);
      setLive(null);
      return;
    }
    const phrase = editor.state.doc.textBetween(from, to, " ");
    if (!phrase.trim()) {
      setShowPopover(false);
      setLive(null);
      return;
    }
    const zoom = liveDepsRef.current.getZoom() || 1;
    const bodyRect = body.getBoundingClientRect();
    const cf = editor.view.coordsAtPos(from);
    const ct = editor.view.coordsAtPos(to);
    const anchor = {
      x: ((cf.left + ct.left) / 2 - bodyRect.left) / zoom,
      y: (cf.top - bodyRect.top) / zoom,
    };
    setLive({ from, to, phrase, anchor });
    setShowPopover(true);
    setPicker(null);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false, heading: { levels: [2] } }),
      SpawnHighlight,
      // Resizable on: the node persists ProseMirror JSON, so widths last.
      ...buildTableExtensions({ resizable: true }),
      ...buildTaskListExtensions(),
    ],
    content: initial.doc,
    editorProps: {
      attributes: {
        class:
          "nodrag nowheel tiptap-body relative z-10 min-h-[2.5rem] text-[13.5px] leading-relaxed text-slate-600 outline-none dark:text-slate-300",
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => flushDoc(editor), 400);
    },
    onSelectionUpdate: ({ editor }) => refreshPopover(editor),
    onBlur: () => {
      setShowPopover(false);
      setPicker(null);
      setLive(null);
    },
  });

  // Persist a freshly-migrated doc (and any seeded highlight) exactly once, so a
  // legacy node is upgraded in place on first open.
  useEffect(() => {
    if (!editor || data.doc) return;
    updateNodeData(id, {
      doc: initial.doc,
      ...(initial.migratedHighlights ? { highlights: initial.migratedHighlights } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Flush any pending debounced save on unmount.
  useEffect(
    () => () => {
      if (saveTimer.current && editor) {
        clearTimeout(saveTimer.current);
        updateNodeData(id, { doc: editor.getJSON() });
      }
    },
    [editor, id, updateNodeData],
  );

  // Toolbar pressed-states, recomputed only when the relevant active flags flip.
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            heading: editor.isActive("heading", { level: 2 }),
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            bulletList: editor.isActive("bulletList"),
            taskList: editor.isActive("taskList"),
          }
        : null,
  });

  // Measure each live highlight's first-line rect + toggle the focus-reveal
  // `data-active` flag. `data.highlights` is the authority for which marks are
  // live (an orphaned mark — child deleted — falls out and goes inert).
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const liveSet = new Set(highlights.map((h) => h.nodeId));
    const childSet = new Set(selectedChildIds ? selectedChildIds.split(",") : []);
    const zoom = getZoom() || 1;
    const bodyRect = body.getBoundingClientRect();

    const map: Record<string, Rect[]> = {};
    body.querySelectorAll<HTMLElement>("mark[data-node-id]").forEach((el) => {
      const nid = el.getAttribute("data-node-id");
      if (!nid) return;
      const isLive = liveSet.has(nid);
      const active = isLive && (selected || childSet.has(nid));
      el.toggleAttribute("data-active", active);
      if (!isLive) return;
      const r = el.getClientRects()[0];
      if (!r || r.width <= 0 || r.height <= 0) return;
      map[nid] = [
        {
          left: (r.left - bodyRect.left) / zoom,
          top: (r.top - bodyRect.top) / zoom,
          width: r.width / zoom,
          height: r.height / zoom,
        },
      ];
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRectsMap(map);
  }, [editor, highlights, selected, selectedChildIds, resizeTick, getZoom]);

  // Re-anchor edges whenever handle rects move.
  useEffect(() => {
    updateNodeInternals(id);
  }, [rectsMap, id, updateNodeInternals]);

  // Spawn the paired node, then (for a highlight source) apply the mark to the
  // remembered range keyed to the new child id and collapse the selection.
  //
  // For an "Ask AI" (chat) spawn we first summarize this note's text with a
  // small model so the new chat is seeded with the context its phrase came from.
  // Best-effort + blocking: "Create" shows "Summarizing…" until it resolves, and
  // a failure just spawns a context-less chat.
  const createFromPicker = useCallback(async () => {
    if (!picker || !live || !editor || summarizing) return;
    const phrase = live.phrase.trim();
    if (!phrase) return;
    const isHighlight = picker.src === "highlight";

    let contextSummary = "";
    if (picker.kind === "chat") {
      const noteText = editor.getText().trim();
      const modelId = useCanvasStore.getState().chatModelId;
      if (modelId) {
        setSummarizing(true);
        const result = await summarizeContextAction({
          kind: "note",
          content: noteText,
          fallbackModelId: modelId,
        });
        setSummarizing(false);
        if (result.success) contextSummary = result.data.summary;
      }
    }

    const newId = spawn({
      text: phrase,
      sourceNodeId: id,
      title: picker.title,
      kind: picker.kind,
      sourceHandle: isHighlight ? "highlight" : `s-${picker.src}`,
      targetHandle: `t-${picker.tgt}`,
      highlight: isHighlight ? {} : undefined,
      ...(contextSummary ? { contextSummary, contextKind: "note" as const } : {}),
    });
    if (isHighlight) {
      editor
        .chain()
        .setTextSelection({ from: live.from, to: live.to })
        .setSpawnHighlight(newId)
        .setTextSelection(live.to)
        .run();
    }
    setPicker(null);
    setShowPopover(false);
    setLive(null);
  }, [picker, live, editor, id, spawn, summarizing]);

  // Reset and close the import popover.
  const closeImport = useCallback(() => {
    setImportOpen(false);
    setImportConfirm(false);
    setImportText("");
  }, []);

  // Convert the pasted source and replace the body. `setContent` updates the live
  // editor (which is create-once and won't re-read `data.doc`); its `onUpdate`
  // then persists the new doc via the existing debounced flush.
  const applyImport = useCallback(() => {
    if (!editor) return;
    const doc =
      importFormat === "markdown"
        ? markdownToProseMirrorDoc(importText)
        : htmlToProseMirrorDoc(importText);
    editor.commands.setContent(doc);
    closeImport();
    notify("✅ Replaced the note from the imported content");
  }, [editor, importFormat, importText, closeImport, notify]);

  // Convert pressed: if the body already has content, step to a replace
  // confirmation first; otherwise replace straight away.
  const runImport = useCallback(() => {
    if (!editor || !importText.trim()) return;
    if (!editor.isEmpty) {
      setImportConfirm(true);
      return;
    }
    applyImport();
  }, [editor, importText, applyImport]);

  const anchorOf = (rects: Rect[]) =>
    rects[0] ? { x: rects[0].left + rects[0].width / 2, y: rects[0].top } : null;

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
      <div className={`flex items-center justify-between gap-2 rounded-t-2xl border-b border-slate-100 ${c.header} px-4 py-2.5 dark:border-slate-800`}>
        <input
          value={data.title}
          onChange={(e) => updateNodeData(id, { title: e.target.value })}
          className="nodrag min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none dark:text-slate-100"
        />
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-400 transition-opacity group-hover:opacity-0 dark:text-slate-500">
          Document
        </span>
      </div>

      {/* Formatting toolbar */}
      <div className="relative flex items-center gap-0.5 border-b border-slate-100 px-3 py-1.5 dark:border-slate-800">
        {FORMAT_BUTTONS.map(({ icon: Icon, label, active, run }) => {
          const isActive = toolbarState?.[active] ?? false;
          return (
            <button
              key={label}
              title={label}
              disabled={!editor}
              onClick={() => editor && run(editor)}
              className={`nodrag rounded-md p-1.5 transition-colors ${
                isActive
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={15} strokeWidth={2} />
            </button>
          );
        })}

        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <TableMenu editor={editor} variant="canvas" allowHeaderToggle />

        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <button
          title="Import Markdown / HTML"
          disabled={!editor}
          onClick={() => (importOpen ? closeImport() : setImportOpen(true))}
          className={`nodrag rounded-md p-1.5 transition-colors ${
            importOpen
              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          }`}
        >
          <FileInput size={15} strokeWidth={2} />
        </button>

        {/* Import-from-source popover */}
        {importOpen && (
          <div className="nodrag nowheel absolute left-3 top-full z-30 mt-1 w-[280px] rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-800">
            {importConfirm ? (
              <div className="flex flex-col gap-2 p-0.5">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  This note already has content. Replace it with the imported text?
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={applyImport}
                    className="flex-1 rounded-lg bg-rose-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-600"
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => setImportConfirm(false)}
                    className="flex-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-700/50">
                  {(["markdown", "html"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setImportFormat(fmt)}
                      className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        importFormat === fmt
                          ? "bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      {fmt === "markdown" ? "Markdown" : "Rich text"}
                    </button>
                  ))}
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={
                    importFormat === "markdown"
                      ? "Paste Markdown here…"
                      : "Paste HTML markup here…"
                  }
                  rows={6}
                  className="nodrag nowheel w-full resize-y rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-amber-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={runImport}
                    disabled={!importText.trim()}
                    className="flex-1 rounded-lg bg-violet-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
                  >
                    Convert
                  </button>
                  <button
                    onClick={closeImport}
                    className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editable body */}
      <div ref={bodyRef} className="relative px-4 py-3">
        <EditorContent editor={editor} />

        {/* Source handles — one per live highlight, anchored to its first line
            (always rendered so edge geometry survives when a mark hides). */}
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

        {/* Floating context menu popover — only while text is selected */}
        {live && showPopover && (
          <div
            // Keep the editor's selection when clicking inside (no blur).
            onMouseDown={(e) => e.preventDefault()}
            className="nodrag absolute z-20 min-w-[230px] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-800"
            style={{ left: live.anchor.x, top: live.anchor.y - 8 }}
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
                  disabled={summarizing}
                  className="mt-0.5 rounded-lg bg-violet-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-600 disabled:opacity-60"
                >
                  {summarizing ? "Summarizing…" : "Create"}
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
