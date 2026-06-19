"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
  Bot,
  Send,
  Sparkles,
  ArrowLeft,
  StickyNote,
  ChevronDown,
  FileText,
  Loader2,
} from "lucide-react";
import {
  appendCanvasChatMessageAction,
  chatTurnsWithModelFromDbAction,
  summarizeContextAction,
  summarizeChatNodeAction,
} from "@/server/actions";
import { useCanvasStore } from "../store/canvas-store";
import { markdownToProseMirrorDoc } from "./markdownToDoc";
import SideHandles, { SIDES } from "./SideHandles";
import NodeRemoveButton from "./NodeRemoveButton";
import NodeColorButton from "./NodeColorButton";
import { nodeColor } from "./nodeColors";
import SideChoiceRow from "./SideChoiceRow";
import type { ChatMessage, ChatNode as ChatNodeType } from "../types";

type Rect = { top: number; left: number; width: number; height: number };

/** The in-progress (unsaved) selection inside an AI bubble — drives the popover
 *  + preview overlay. A highlight is only persisted when the user spawns. */
type Live = {
  messageId: string;
  start: number;
  end: number;
  phrase: string;
  /** Selection rects in the scroll content's coordinate space (scroll + clip). */
  contentRects: Rect[];
  /** First-line anchor in the node's CSS space, clamped to the message viewport. */
  anchor: { x: number; y: number } | null;
};

/** Active state of the "choose source/target side" step in the popover. */
type Picker = { kind: "chat" | "textEditor"; title: string; src: string; tgt: string };

/** Character offsets of a DOM selection within `root`'s text content. */
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

export default function ChatNode({ id, data, selected }: NodeProps<ChatNodeType>) {
  const spawn = useCanvasStore((s) => s.spawn);
  const notify = useCanvasStore((s) => s.notify);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const spawnSummaryNote = useCanvasStore((s) => s.spawnSummaryNote);
  const { getZoom } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const c = nodeColor(data.color);
  const [title, setTitle] = useState(data.title);
  const [messages, setMessages] = useState<ChatMessage[]>(data.messages);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(!!data.pending);
  const [live, setLive] = useState<Live | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  // While true, "Create" is awaiting the context summary before spawning.
  const [summarizing, setSummarizing] = useState(false);
  // While true, the chat is being summarized into a note (header button spinner).
  const [busySummarize, setBusySummarize] = useState(false);
  // Collapse the carried-over context note (label stays so it can be reopened).
  // Hidden by default — the context grounds the model regardless of visibility.
  const [contextCollapsed, setContextCollapsed] = useState(true);
  // Saved-highlight geometry, keyed by paired child id.
  const [contentRectsMap, setContentRectsMap] = useState<Record<string, Rect[]>>({});
  const [anchorMap, setAnchorMap] = useState<Record<string, { x: number; y: number }>>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Previously-selected highlight-children, to fire auto-scroll only on the
  // transition where a child becomes newly selected (not on every recompute).
  const prevSelectedRef = useRef<string[]>([]);

  const highlights = data.highlights ?? [];

  // The chat can be summarized only once there's a real exchange to summarize —
  // at least one user message AND one AI reply (a lone seed greeting or an
  // unanswered question isn't worth summarizing).
  const canSummarize =
    messages.some((m) => m.role === "user") && messages.some((m) => m.role === "ai");

  // Summarize this chat into a note: spawn a linked text-editor node below this
  // chat holding the summary. Uses the toolbar's model + instruction. On any
  // failure nothing is spawned and a toast is shown.
  const handleSummarize = useCallback(async () => {
    const { chatModelId, instructionId } = useCanvasStore.getState();
    if (!chatModelId) {
      notify("Select an AI model first");
      return;
    }
    const transcript = messages
      .map((m) => `${m.role === "ai" ? "AI" : "User"}: ${m.text}`)
      .join("\n");

    setBusySummarize(true);
    const result = await summarizeChatNodeAction({
      modelId: chatModelId,
      instructionId,
      transcript,
    });
    setBusySummarize(false);

    if (!result.success || !result.data.summary.trim()) {
      notify("⚠️ Couldn’t summarize this chat");
      return;
    }
    spawnSummaryNote(id, markdownToProseMirrorDoc(result.data.summary));
  }, [messages, id, notify, spawnSummaryNote]);

  // Selected highlight-children → per-pair focus reveal (joined-string primitive).
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

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  };

  // Persist one message to the DB (canvas_chat_messages) keyed to this node.
  // Best-effort and fire-and-forget — the message already shows in the UI; a
  // write failure toasts but never blocks the chat. Idempotent on the message
  // id, so re-persisting a seed on remount is a no-op. No-op when the board
  // isn't backed by a saved canvas item (no `canvasItemId`).
  const persist = useCallback(
    (message: ChatMessage) => {
      const canvasItemId = useCanvasStore.getState().canvasItemId;
      if (!canvasItemId) return;
      void appendCanvasChatMessageAction({
        itemId: canvasItemId,
        nodeId: id,
        message: { id: message.id, role: message.role, text: message.text },
      })
        .then((r) => {
          if (!r.success) notify("⚠️ Couldn't save message");
        })
        .catch(() => undefined);
    },
    [id, notify],
  );

  // Persist the messages a node mounts with (seed greeting / spawned question /
  // hydrated history) exactly once. The idempotent upsert keeps history rows
  // that were just hydrated from the DB from duplicating.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    data.messages.forEach((m) => persist(m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send the conversation so far to the canvas-selected chat model and append
  // the reply. With no model selected we abort + toast (no canned fallback); a
  // request failure toasts and drops an inline error bubble so it's visible.
  const requestReply = useCallback(
    async (history: ChatMessage[]) => {
      const modelId = useCanvasStore.getState().chatModelId;
      if (!modelId) {
        setTyping(false);
        notify("Select an AI model first");
        return;
      }
      const result = await chatTurnsWithModelFromDbAction({
        modelId,
        instructionId: useCanvasStore.getState().instructionId,
        contextSummary: data.contextSummary,
        messages: history.map((m) => ({ role: m.role, text: m.text })),
      });
      setTyping(false);
      if (result.success) {
        const text = result.data.content.trim() || "(No response.)";
        const reply: ChatMessage = { id: `a-${Date.now()}`, role: "ai", text };
        setMessages((m) => [...m, reply]);
        persist(reply);
      } else {
        notify(`⚠️ ${result.error}`);
        const reply: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "ai",
          text: "⚠️ Couldn't reach the model. Try again.",
        };
        setMessages((m) => [...m, reply]);
        persist(reply);
      }
      scrollToBottom();
    },
    [notify, persist, data.contextSummary],
  );

  // "Ask AI" spawns this node with a seeded question + `pending`; answer it on
  // mount by running the seeded transcript through the selected model.
  const askedRef = useRef(false);
  useEffect(() => {
    if (!data.pending || askedRef.current) return;
    askedRef.current = true;
    void requestReply(data.messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.pending]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    const next: ChatMessage[] = [...messages, userMsg];
    setMessages(next);
    persist(userMsg);
    setDraft("");
    scrollToBottom();
    setTyping(true);
    void requestReply(next);
  };

  // Selection rects in the scroll content's coordinate space (so the overlay
  // scrolls with the message and clips at the viewport).
  const contentRects = useCallback((range: Range): Rect[] => {
    const scroll = scrollRef.current;
    if (!scroll) return [];
    const sRect = scroll.getBoundingClientRect();
    const zoom = getZoom() || 1;
    return Array.from(range.getClientRects())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({
        left: (r.left - sRect.left) / zoom + scroll.scrollLeft,
        top: (r.top - sRect.top) / zoom + scroll.scrollTop,
        width: r.width / zoom,
        height: r.height / zoom,
      }));
  }, [getZoom]);

  // First-line anchor in the node's CSS space, clamped to the message viewport
  // so the source handle (and edge) always touches the node even when scrolled.
  const clampedAnchor = useCallback(
    (range: Range): { x: number; y: number } | null => {
      const root = rootRef.current;
      const scroll = scrollRef.current;
      if (!root || !scroll) return null;
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0);
      if (!rects.length) return null;
      const r = rects[0];
      const rRect = root.getBoundingClientRect();
      const sRect = scroll.getBoundingClientRect();
      const zoom = getZoom() || 1;
      const yScreen = Math.min(Math.max(r.top, sRect.top), sRect.bottom);
      const xScreen = Math.min(Math.max(r.left + r.width / 2, sRect.left), sRect.right);
      return { x: (xScreen - rRect.left) / zoom, y: (yScreen - rRect.top) / zoom };
    },
    [getZoom],
  );

  // Recompute every saved highlight's overlay rects + clamped handle anchor.
  // Runs on highlight/message/typing changes and on scroll.
  const recompute = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const cMap: Record<string, Rect[]> = {};
    const aMap: Record<string, { x: number; y: number }> = {};
    for (const h of highlights) {
      const bubble = h.messageId
        ? scroll.querySelector<HTMLElement>(`[data-mid="${h.messageId}"]`)
        : null;
      if (!bubble || h.start === undefined || h.end === undefined) continue;
      const range = rangeFromOffsets(bubble, h.start, h.end);
      if (!range) continue;
      cMap[h.nodeId] = contentRects(range);
      const a = clampedAnchor(range);
      if (a) aMap[h.nodeId] = a;
    }
    setContentRectsMap(cMap);
    setAnchorMap(aMap);
    updateNodeInternals(id);
  }, [highlights, contentRects, clampedAnchor, id, updateNodeInternals]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(recompute, [data.highlights, messages, typing]);

  // Auto-scroll the message list to a highlight when its paired child becomes
  // newly selected — once per selection (the user can scroll away after), and
  // only if the phrase is off-screen, smooth-scrolling it to roughly centered.
  useEffect(() => {
    const scroll = scrollRef.current;
    const cur = selectedChildIds ? selectedChildIds.split(",") : [];
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = cur;
    if (!scroll) return;
    const added = cur.filter((c) => !prev.includes(c));
    if (added.length === 0) return;
    // Among newly-selected children, target the topmost highlight.
    let target: Rect | null = null;
    for (const childId of added) {
      const h = highlights.find((x) => x.nodeId === childId);
      if (!h?.messageId || h.start === undefined || h.end === undefined) continue;
      const bubble = scroll.querySelector<HTMLElement>(`[data-mid="${h.messageId}"]`);
      if (!bubble) continue;
      const range = rangeFromOffsets(bubble, h.start, h.end);
      if (!range) continue;
      const [first] = contentRects(range);
      if (first && (!target || first.top < target.top)) target = first;
    }
    if (!target) return;
    const viewTop = scroll.scrollTop;
    const viewBottom = viewTop + scroll.clientHeight;
    // Already fully in view → don't jolt.
    if (target.top >= viewTop && target.top + target.height <= viewBottom) return;
    const next = target.top - (scroll.clientHeight - target.height) / 2;
    scroll.scrollTo({
      top: Math.max(0, Math.min(next, scroll.scrollHeight - scroll.clientHeight)),
      behavior: "smooth",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildIds]);

  // Selecting text in an AI bubble shows a transient preview + popover; nothing
  // is saved until the user spawns. `messageId` keys the offsets to the bubble.
  const handleSelect = useCallback(
    (messageId: string) => {
      const scroll = scrollRef.current;
      const bubble = scroll?.querySelector<HTMLElement>(`[data-mid="${messageId}"]`);
      const sel = window.getSelection();
      if (!bubble || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setShowPopover(false);
        setPicker(null);
        setLive(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!bubble.contains(range.commonAncestorContainer)) return;
      const { start, end } = selectionOffsets(bubble, range);
      if (end <= start) {
        setShowPopover(false);
        setLive(null);
        return;
      }
      const phrase = bubble.textContent?.slice(start, end) ?? "";
      setLive({
        messageId,
        start,
        end,
        phrase,
        contentRects: contentRects(range),
        anchor: clampedAnchor(range),
      });
      setShowPopover(true);
      setPicker(null);
    },
    [contentRects, clampedAnchor],
  );

  // Scrolling clears the in-progress selection and re-anchors saved handles.
  const onScroll = useCallback(() => {
    setShowPopover(false);
    setPicker(null);
    setLive(null);
    recompute();
  }, [recompute]);

  // Spawn the paired node. "From: Highlight" persists a highlight keyed to the
  // new child (anchored to this message); a side source is a plain edge.
  //
  // For an "Ask AI" (chat) spawn we first summarize this chat's transcript with
  // a small model so the new chat is seeded with the context its phrase came
  // from. Best-effort + blocking: the "Create" button shows "Summarizing…" until
  // it resolves, and a failure just spawns a context-less chat.
  const createFromPicker = useCallback(async () => {
    if (!picker || !live || summarizing) return;
    const phrase = live.phrase.trim();
    if (!phrase) return;
    const isHighlight = picker.src === "highlight";

    let contextSummary = "";
    if (picker.kind === "chat") {
      const transcript = messages
        .map((m) => `${m.role === "ai" ? "AI" : "User"}: ${m.text}`)
        .join("\n");
      const modelId = useCanvasStore.getState().chatModelId;
      if (modelId) {
        setSummarizing(true);
        const result = await summarizeContextAction({
          kind: "chat",
          content: transcript,
          fallbackModelId: modelId,
        });
        setSummarizing(false);
        if (result.success) contextSummary = result.data.summary;
      }
    }

    spawn({
      text: phrase,
      sourceNodeId: id,
      title: picker.title,
      kind: picker.kind,
      sourceHandle: isHighlight ? "highlight" : `s-${picker.src}`,
      targetHandle: `t-${picker.tgt}`,
      highlight: isHighlight
        ? { start: live.start, end: live.end, messageId: live.messageId }
        : undefined,
      ...(contextSummary ? { contextSummary, contextKind: "chat" as const } : {}),
    });
    setPicker(null);
    setShowPopover(false);
    setLive(null);
    window.getSelection()?.removeAllRanges();
  }, [picker, live, id, spawn, summarizing, messages]);

  const popoverAnchor = live?.anchor ?? null;
  const popoverButton =
    "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700";

  // An overlay box (highlighter-pen look), positioned in scroll-content space.
  const overlayBox = (r: Rect, key: string) => (
    <div
      key={key}
      className="pointer-events-none absolute rounded-[3px]"
      style={{
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        background: "rgba(250, 204, 21, 0.55)",
        mixBlendMode: "multiply",
      }}
    />
  );

  return (
    <div
      ref={rootRef}
      className={`group relative flex h-full w-full flex-col rounded-2xl border ${c.border} bg-white shadow-xl shadow-slate-900/10 [contain:layout] dark:bg-slate-900 dark:shadow-black/40`}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={260}
        minHeight={240}
        color="#a78bfa"
        onResize={recompute}
      />
      {/* Four-side connection handles */}
      <SideHandles />
      <NodeRemoveButton id={id} />
      <NodeColorButton id={id} color={data.color} />
      {/* Summarize → replace this chat with a note. Lives in the node-control
          cluster, just left of the color picker. Reveals on hover/selection like
          the other controls; disabled until there's a real exchange. */}
      <button
        type="button"
        onClick={handleSummarize}
        disabled={busySummarize || !canSummarize}
        title={
          canSummarize
            ? "Summarize this chat into a note"
            : "Have a conversation first"
        }
        aria-label="Summarize chat into a note"
        className={`node-ctl nodrag absolute right-[4.625rem] top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 transition-opacity hover:text-violet-600 disabled:cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700 dark:hover:text-violet-300 ${
          busySummarize
            ? "opacity-100"
            : canSummarize
              ? "opacity-0 group-hover:opacity-100"
              : "opacity-0 group-hover:opacity-40"
        }`}
      >
        {busySummarize ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <FileText size={13} />
        )}
      </button>

      {/* Header — incoming edges land on the shared `t-top` side handle (no
          separate handle here), so chat matches every other node type. */}
      <div className={`relative flex items-center gap-2 rounded-t-2xl border-b border-slate-100 ${c.header} px-4 py-3 dark:border-slate-800`}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
          <Bot size={16} />
        </span>
        <div className="flex min-w-0 flex-col">
          <input
            value={title}
            onChange={(e) => {
              // Mirror title edits into the store so they persist in the canvas
              // JSON (local state alone is dropped on save).
              setTitle(e.target.value);
              updateNodeData(id, { title: e.target.value });
            }}
            className="nodrag min-w-0 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none dark:text-slate-100"
          />
          <span className="text-[11px] text-emerald-500">● online</span>
        </div>
      </div>

      {/* Carried-over context — a brief of the chat/note this node was spawned
          from, also injected as a system prompt on every turn. Collapsible: the
          label row stays so a hidden summary can be reopened. */}
      {data.contextSummary && (
        <div className="nowheel shrink-0 overflow-y-auto border-b border-amber-100 bg-amber-50/70 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
          <button
            type="button"
            onClick={() => setContextCollapsed((v) => !v)}
            title={contextCollapsed ? "Show context" : "Hide context"}
            className="nodrag flex w-full items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400"
          >
            <Sparkles size={11} />
            Context from {data.contextKind === "note" ? "note" : "previous chat"}
            <ChevronDown
              size={12}
              className={`ml-auto transition-transform ${contextCollapsed ? "-rotate-90" : ""}`}
            />
          </button>
          {!contextCollapsed && (
            <p className="mt-0.5 text-[11.5px] leading-snug text-amber-900/80 dark:text-amber-200/80">
              {data.contextSummary}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="nodrag nowheel relative flex-1 space-y-3 overflow-y-auto px-3 py-3"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              data-mid={m.role === "ai" ? m.id : undefined}
              onMouseUp={m.role === "ai" ? () => handleSelect(m.id) : undefined}
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug ${
                m.role === "user"
                  ? "rounded-br-sm bg-violet-500 text-white"
                  : "cursor-text select-text rounded-bl-sm bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2.5 dark:bg-slate-800">
              <Sparkles size={12} className="text-violet-400" />
              <span className="flex gap-1">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </span>
            </div>
          </div>
        )}

        {/* Saved highlight overlays — focus-revealed per pair; scroll + clip
            natively (children of the scroll container). */}
        {highlights.map((h) => {
          const show = selected || selectedChildSet.has(h.nodeId);
          if (!show) return null;
          return (contentRectsMap[h.nodeId] ?? []).map((r, i) =>
            overlayBox(r, `${h.nodeId}-${i}`),
          );
        })}

        {/* Live selection preview (unsaved), shown while the popover is open. */}
        {showPopover && live?.contentRects.map((r, i) => overlayBox(r, `live-${i}`))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Ask anything…"
          className="nodrag min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[12.5px] text-slate-700 outline-none transition-colors focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
        />
        <button
          onClick={send}
          className="nodrag flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-white transition-colors hover:bg-violet-600"
        >
          <Send size={14} />
        </button>
      </div>

      {/* Source handles — one per saved highlight, clamped to the message
          viewport (always rendered so edge geometry survives scroll). */}
      {highlights.map((h) => {
        const a = anchorMap[h.nodeId];
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

      {/* Highlight popover — Ask AI / Note + position picker (parity with Note). */}
      {popoverAnchor && showPopover && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="nodrag absolute z-30 min-w-[230px] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-800"
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
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
      style={{ animationDelay: delay }}
    />
  );
}
