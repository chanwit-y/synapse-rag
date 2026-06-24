"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { FileText, Search, Shapes } from "lucide-react";
import { tagColorClasses, type TagItem } from "@/components/common/TagBar";

export interface CommandPaletteItem {
  id: string;
  name: string;
  type: "file" | "canvas";
  /** Breadcrumb for disambiguation, e.g. "Docs / Backend". */
  path: string;
  tags: TagItem[];
}

export interface CommandPaletteProps {
  /** Close the palette (Esc, backdrop click, or after a selection). */
  onClose: () => void;
  /** The full, in-memory candidate set (files + canvases across collections). */
  items: CommandPaletteItem[];
  /** Open the chosen document by its item id. */
  onSelect: (id: string) => void;
  /**
   * Fired as the highlighted result changes (and with `null` when the query is
   * empty or there are no matches). Used by Graph mode to live-preview the
   * active result in the graph; ignored in editor mode.
   */
  onActiveChange?: (item: CommandPaletteItem | null) => void;
  /**
   * Dim + blur the backdrop behind the palette. Defaults to `true`. Graph mode
   * passes `false` so the graph stays visible behind the palette for preview.
   */
  dimBackdrop?: boolean;
}

/** Cap rendered rows so a huge workspace never bogs the palette down. */
const RESULT_LIMIT = 50;

type Ranked = { item: CommandPaletteItem; rank: number };

/**
 * Score an item against the query. Lower rank = better match; `null` excludes
 * it. Name matches outrank tag-only matches, and a name prefix outranks a name
 * substring, so the most relevant rows float to the top.
 */
function rankItem(item: CommandPaletteItem, q: string): number | null {
  const name = item.name.toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  if (item.tags.some((t) => t.name.toLowerCase().includes(q))) return 2;
  return null;
}

/**
 * Cmd/Ctrl+K search overlay. Mount it only while open (the parent gates it with
 * `{open && <CommandPalette/>}`) so it starts from a clean state each time.
 */
export default function CommandPalette({
  onClose,
  items,
  onSelect,
  onActiveChange,
  dimBackdrop = true,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus the input on mount (after paint, so it isn't stolen on open).
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...items]
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, RESULT_LIMIT);
    }
    const scored: Ranked[] = [];
    for (const item of items) {
      const rank = rankItem(item, q);
      if (rank != null) scored.push({ item, rank });
    }
    scored.sort(
      (a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name),
    );
    return scored.slice(0, RESULT_LIMIT).map((s) => s.item);
  }, [items, query]);

  // Clamp the highlight to the current result set without an extra effect.
  const activeIndex =
    results.length === 0 ? -1 : Math.min(active, results.length - 1);

  // The result the graph should preview: the highlighted row, but only once a
  // query is typed (an empty palette leaves the graph untouched).
  const previewItem =
    query.trim() && activeIndex >= 0 ? (results[activeIndex] ?? null) : null;

  // Notify the parent as the previewed result changes.
  useEffect(() => {
    onActiveChange?.(previewItem);
  }, [previewItem, onActiveChange]);

  // Scroll the highlighted row into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const choose = (id: string) => {
    onSelect(id);
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) choose(item.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] ${
        dimBackdrop ? "bg-black/40 backdrop-blur-sm" : ""
      }`}
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search documents"
      >
        {/* Search box */}
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search files and canvases by name or tag…"
            aria-label="Search documents"
            className="flex-1 bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto py-1">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matching documents.
            </p>
          ) : (
            results.map((item, index) => {
              const Icon = item.type === "canvas" ? Shapes : FileText;
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-index={index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                    isActive ? "bg-muted" : ""
                  }`}
                >
                  <Icon
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-foreground">
                      {item.name}
                    </span>
                    {item.path && (
                      <span className="truncate text-xs text-muted-foreground">
                        {item.path}
                      </span>
                    )}
                  </span>
                  {item.tags.length > 0 && (
                    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${tagColorClasses(tag.color, tag.name)}`}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
