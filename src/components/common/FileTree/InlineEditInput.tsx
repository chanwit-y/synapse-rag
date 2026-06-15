"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export interface InlineEditInputProps {
  initialValue: string;
  /** For files, the basename (before the extension) is preselected. */
  kind?: "file" | "folder" | "collection";
  onCommit: (value: string) => void;
  onCancel: () => void;
  className?: string;
}

/**
 * A focused text input for renaming a tree node or collection in place. Enter
 * commits, Escape cancels, blur commits. Pointer/click events are stopped so
 * interacting with it never starts a drag or toggles selection. The first
 * commit/cancel wins (guards the Enter-then-blur double fire).
 */
export default function InlineEditInput({
  initialValue,
  kind,
  onCommit,
  onCancel,
  className,
}: InlineEditInputProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (kind === "file") {
      const dot = initialValue.lastIndexOf(".");
      if (dot > 0) el.setSelectionRange(0, dot);
      else el.select();
    } else {
      el.select();
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCommit(value);
  };

  const cancel = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCancel();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      spellCheck={false}
      className={
        className ??
        "min-w-0 flex-1 rounded border border-accent bg-background px-1 py-0.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-accent"
      }
    />
  );
}
