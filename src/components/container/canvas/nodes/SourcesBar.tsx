"use client";

import { BookOpen } from "lucide-react";
import type { ChatMessage, ChatMessageSource } from "../types";

/** Collect the grounding sources used across a conversation, deduped by URL and
 *  kept in first-mention order (stable as the chat grows). */
function collectSources(messages: ChatMessage[]): ChatMessageSource[] {
  const seen = new Set<string>();
  const out: ChatMessageSource[] = [];
  for (const m of messages) {
    if (m.role !== "ai" || !m.source) continue;
    if (seen.has(m.source.url)) continue;
    seen.add(m.source.url);
    out.push(m.source);
  }
  return out;
}

/** A pinned footer listing every source the whole conversation is grounded in,
 *  complementing the per-bubble chips. Renders nothing when the chat used none
 *  (the common, non-historical case), so it costs no space until it's earned. */
export default function SourcesBar({ messages }: { messages: ChatMessage[] }) {
  const sources = collectSources(messages);
  if (sources.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Sources
      </span>
      <div className="nodrag nowheel flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap">
        {sources.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Wikipedia: ${s.title}`}
            className="inline-flex max-w-[60%] shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-500 transition-colors hover:border-violet-300 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-violet-500 dark:hover:text-violet-300"
          >
            <BookOpen size={11} className="shrink-0" />
            <span className="truncate">{s.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
