"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Tag as TagIcon, X } from "lucide-react";
import { tagColor } from "./tagColor";

export interface TagItem {
  id: string;
  name: string;
}

export interface TagBarProps {
  /** Tags currently applied to the open document. */
  tags: TagItem[];
  /** All workspace tags, used to suggest existing names while typing. */
  suggestions: TagItem[];
  /** Create-or-pick a tag by name. */
  onAdd: (name: string) => void;
  /** Remove an applied tag by id. */
  onRemove: (tagId: string) => void;
  /** Disable editing (e.g. while a request is in flight). */
  disabled?: boolean;
}

export default function TagBar({
  tags,
  suggestions,
  onAdd,
  onRemove,
  disabled,
}: TagBarProps) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  // Suggest only tags not already applied (case-insensitive).
  const available = useMemo(() => {
    const applied = new Set(tags.map((t) => t.name.toLowerCase()));
    return suggestions.filter((s) => !applied.has(s.name.toLowerCase()));
  }, [tags, suggestions]);

  const commit = () => {
    const name = draft.trim();
    if (!name) return;
    onAdd(name);
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      // Quick-remove the last chip when the input is empty.
      e.preventDefault();
      onRemove(tags[tags.length - 1].id);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <TagIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {tags.map((tag) => (
        <span
          key={tag.id}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tagColor(tag.name)}`}
        >
          {tag.name}
          {!disabled && (
            <button
              type="button"
              className="-mr-0.5 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
              onClick={() => onRemove(tag.id)}
              aria-label={`Remove tag ${tag.name}`}
              title={`Remove ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      <input
        type="text"
        value={draft}
        list={listId}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={tags.length ? "Add tag…" : "Add a tag…"}
        aria-label="Add tag"
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-xs text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      <datalist id={listId}>
        {available.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>
    </div>
  );
}
