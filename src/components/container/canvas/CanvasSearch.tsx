"use client";

import { useEffect, useRef } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";

type CanvasSearchProps = {
  /** Whether the input is expanded (vs. just the search icon). */
  open: boolean;
  onToggle: (open: boolean) => void;
  query: string;
  onQueryChange: (q: string) => void;
  /** Number of matching nodes for the current query. */
  matchCount: number;
  /** 0-based index of the active (centered) match; -1 when none. */
  activeIndex: number;
  onNext: () => void;
  onPrev: () => void;
};

/** Top-right canvas search: a search-icon toggle that expands into a find box.
 *  Live-highlights matches as you type; Enter steps to the next match,
 *  Shift+Enter the previous, Escape clears then closes. Presentational only —
 *  the owning Flow computes matches and drives the viewport. */
export default function CanvasSearch({
  open,
  onToggle,
  query,
  onQueryChange,
  matchCount,
  activeIndex,
  onNext,
  onPrev,
}: CanvasSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the field whenever it expands so the user can type immediately.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const hasQuery = query.trim().length > 0;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onToggle(true)}
        title="Search nodes"
        aria-label="Search nodes"
        className="absolute right-5 top-5 z-30 flex h-10 w-10 origin-center animate-[canvas-search-icon-in_160ms_ease-out] items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-500 shadow-xl shadow-slate-900/10 backdrop-blur transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <div className="absolute right-5 top-5 z-30 flex origin-right animate-[canvas-search-in_200ms_ease-out] items-center gap-1 rounded-xl border border-slate-200 bg-white/90 px-2 py-1.5 shadow-xl shadow-slate-900/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <Search size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === "Escape") {
            e.preventDefault();
            if (hasQuery) onQueryChange("");
            else onToggle(false);
          }
        }}
        placeholder="Search nodes…"
        aria-label="Search nodes"
        className="w-44 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      {hasQuery && (
        <span className="shrink-0 select-none whitespace-nowrap text-xs tabular-nums text-slate-400 dark:text-slate-500">
          {matchCount ? `${activeIndex + 1}/${matchCount}` : "0/0"}
        </span>
      )}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onPrev}
          disabled={matchCount === 0}
          title="Previous match (Shift+Enter)"
          aria-label="Previous match"
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronUp size={15} />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={matchCount === 0}
          title="Next match (Enter)"
          aria-label="Next match"
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronDown size={15} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          onQueryChange("");
          onToggle(false);
        }}
        title="Close search (Esc)"
        aria-label="Close search"
        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <X size={15} />
      </button>
    </div>
  );
}
