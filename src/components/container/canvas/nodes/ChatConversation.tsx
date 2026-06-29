"use client";

import { useEffect, useRef } from "react";
import { Send, Sparkles, BookOpen } from "lucide-react";
import type { ChatMessage } from "../types";

/** A single chat bubble (user or AI) plus an optional grounding-source chip.
 *  Shared by the inline node body and the expanded modal so both render
 *  messages identically. When `selectable` is set the AI bubble carries the
 *  `data-mid` attribute + `onSelect` handler the inline node uses to drive its
 *  text-selection popover; the modal renders the same bubble without them. */
export function ChatBubble({
  message: m,
  selectable = false,
  onSelect,
}: {
  message: ChatMessage;
  selectable?: boolean;
  onSelect?: (messageId: string) => void;
}) {
  const isAi = m.role === "ai";
  return (
    <div className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
      <div
        data-mid={selectable && isAi ? m.id : undefined}
        onMouseUp={selectable && isAi ? () => onSelect?.(m.id) : undefined}
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug ${
          m.role === "user"
            ? "rounded-br-sm bg-violet-500 text-white"
            : `rounded-bl-sm bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 ${
                selectable ? "cursor-text select-text" : "select-text"
              }`
        }`}
      >
        {m.text}
      </div>
      {/* Grounding source chip — links to the Wikipedia article that grounded a
          historical answer. Persisted with the message. */}
      {isAi && m.source && (
        <a
          href={m.source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Wikipedia: ${m.source.title}`}
          className="nodrag mt-1 inline-flex max-w-[80%] items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-500 transition-colors hover:border-violet-300 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-violet-500 dark:hover:text-violet-300"
        >
          <BookOpen size={11} className="shrink-0" />
          <span className="truncate">Wikipedia: {m.source.title}</span>
        </a>
      )}
    </div>
  );
}

/** The "AI is typing" three-dot indicator. */
export function TypingIndicator() {
  return (
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

/** The "Ask anything…" input + send button. Shared by the inline node and the
 *  modal; both bind to the same draft/send so a half-typed message carries over
 *  when the chat is expanded. */
export function ChatInput({
  draft,
  onChange,
  onSend,
  autoFocus = false,
}: {
  draft: string;
  onChange: (value: string) => void;
  onSend: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5 dark:border-slate-800">
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend();
        }}
        placeholder="Ask anything…"
        className="nodrag min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[12.5px] text-slate-700 outline-none transition-colors focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
      />
      <button
        onClick={onSend}
        className="nodrag flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white transition-colors hover:bg-violet-600"
      >
        <Send size={14} />
      </button>
    </div>
  );
}

/** The expanded-modal conversation: a scrollable transcript + input bar. A plain
 *  variant of the inline node body — no text-selection popover, highlight
 *  overlays, context banner, or summarize (those stay on the inline node). Reads
 *  and writes the same chat state the node holds (one component instance), so
 *  sending here and inline stay perfectly in sync. */
export default function ChatConversation({
  messages,
  typing,
  draft,
  onDraftChange,
  onSend,
}: {
  messages: ChatMessage[];
  typing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}) {
  // Own scroll ref so the modal auto-scrolls independently of the inline body.
  const scrollRef = useRef<HTMLDivElement>(null);
  // Pin to the latest message — only on count/typing change, not every keystroke.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, typing]);

  return (
    <div className="flex h-[60vh] flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-1 py-2"
      >
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
        {typing && <TypingIndicator />}
      </div>
      <ChatInput draft={draft} onChange={onDraftChange} onSend={onSend} autoFocus />
    </div>
  );
}
