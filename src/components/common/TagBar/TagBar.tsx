"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Tag as TagIcon, X } from "lucide-react";
import {
  addItemTagAction,
  listAllTagsAction,
  listItemTagsAction,
  removeItemTagAction,
} from "@/server/actions";
import { useSnackbar } from "@/components/common/Snackbar/Snackbar";
import { tagColorClasses } from "./tagColor";

export interface TagItem {
  id: string;
  name: string;
  /** Stored chip color key, or null for legacy tags (derived from name). */
  color: string | null;
}

export interface TagBarProps {
  /** The file/canvas these tags belong to. Adds/removes persist against it. */
  itemId: string;
  /** Disable editing (e.g. read-only contexts). Pending requests also disable. */
  disabled?: boolean;
}

/** Most suggestions to show in the autocomplete dropdown at once. */
const SUGGESTION_LIMIT = 8;

/**
 * Self-contained tag editor for a single document. Owns its data: it fetches the
 * item's applied tags + the global suggestion list, and persists every add/remove
 * directly through the tag server actions. Adding reuses an existing tag (matched
 * case-insensitively server-side) or creates one; removing the last reference
 * deletes the orphaned tag. Mount one per open document (keyed by `itemId`).
 *
 * The add input has a keyboard-navigable autocomplete: type to filter existing
 * tags, ↑/↓ to highlight, Enter to add the highlighted suggestion — or, with no
 * highlight, the typed text (creating a new tag).
 */
export default function TagBar({ itemId, disabled }: TagBarProps) {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [suggestions, setSuggestions] = useState<TagItem[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  // Autocomplete dropdown: open state + highlighted index (-1 = use typed text).
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const { showSnackbar } = useSnackbar();

  // Refetch suggestions whenever the tag set may have changed.
  const refreshSuggestions = useCallback(async () => {
    const result = await listAllTagsAction();
    if (result.success) setSuggestions(result.data);
  }, []);

  // Load the suggestion list once on mount.
  useEffect(() => {
    void refreshSuggestions();
  }, [refreshSuggestions]);

  // Load the document's applied tags whenever the document changes.
  useEffect(() => {
    let cancelled = false;
    setTags([]);
    void (async () => {
      const result = await listItemTagsAction(itemId);
      if (!cancelled && result.success) setTags(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  // Suggestions not already applied (case-insensitive), filtered by the draft
  // with prefix matches first, capped to a short list.
  const matches = useMemo(() => {
    const applied = new Set(tags.map((t) => t.name.toLowerCase()));
    const q = draft.trim().toLowerCase();
    const pool = suggestions.filter((s) => !applied.has(s.name.toLowerCase()));
    const filtered = q
      ? pool.filter((s) => s.name.toLowerCase().includes(q))
      : pool;
    if (q) {
      filtered.sort((a, b) => {
        const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return ap - bp || a.name.localeCompare(b.name);
      });
    } else {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered.slice(0, SUGGESTION_LIMIT);
  }, [tags, suggestions, draft]);

  // Clamp the highlight to the current match set.
  const activeIndex = matches.length === 0 ? -1 : Math.min(active, matches.length - 1);
  const showDropdown = open && matches.length > 0;

  const addTag = async (rawName: string) => {
    const name = rawName.trim();
    if (!name || pending) return;
    setPending(true);
    const result = await addItemTagAction(itemId, name);
    setPending(false);
    if (!result.success) {
      showSnackbar({ variant: "error", message: result.error });
      return;
    }
    const tag = result.data;
    setDraft("");
    setOpen(false);
    setActive(-1);
    setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
    void refreshSuggestions();
  };

  const remove = async (tagId: string) => {
    if (pending) return;
    setPending(true);
    const result = await removeItemTagAction(itemId, tagId);
    setPending(false);
    if (!result.success) {
      showSnackbar({ variant: "error", message: result.error });
      return;
    }
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    void refreshSuggestions();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // A highlighted suggestion wins; otherwise add the typed text (create).
      if (showDropdown && activeIndex >= 0) void addTag(matches[activeIndex].name);
      else void addTag(draft);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      // Quick-remove the last chip when the input is empty.
      e.preventDefault();
      void remove(tags[tags.length - 1].id);
    }
  };

  const editable = !disabled && !pending;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <TagIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {tags.map((tag) => (
        <span
          key={tag.id}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tagColorClasses(tag.color, tag.name)}`}
        >
          {tag.name}
          {editable && (
            <button
              type="button"
              className="-mr-0.5 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
              onClick={() => void remove(tag.id)}
              aria-label={`Remove tag ${tag.name}`}
              title={`Remove ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      <div className="relative min-w-24 flex-1">
        <input
          type="text"
          value={draft}
          disabled={disabled || pending}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
          }
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Closing here is safe: suggestion clicks preventDefault on mousedown
            // so the input never blurs when picking one.
            setOpen(false);
            void addTag(draft);
          }}
          placeholder={tags.length ? "Add tag…" : "Add a tag…"}
          aria-label="Add tag"
          className="w-full bg-transparent px-1 py-0.5 text-xs text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        {showDropdown && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 top-full z-20 mt-1 max-h-48 w-44 overflow-y-auto rounded-md border border-border bg-background py-1 shadow-lg"
          >
            {matches.map((s, index) => (
              <li
                key={s.id}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // Keep focus on the input so onBlur doesn't fire before onClick.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => void addTag(s.name)}
                className={`flex cursor-pointer items-center gap-1.5 px-2 py-1 text-xs ${
                  index === activeIndex ? "bg-muted" : ""
                }`}
              >
                <TagIcon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate text-foreground">{s.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
