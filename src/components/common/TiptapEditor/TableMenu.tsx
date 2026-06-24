"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Table as TableIcon,
  ChevronDown,
  Plus,
  Trash2,
  Heading,
} from "lucide-react";

// Reusable table dropdown shared by both Tiptap editors. One trigger button
// opens a menu of structural operations; everything except "Insert table" is
// disabled until the cursor sits inside a table. The panel uses neutral app
// tokens so it reads correctly in light/dark for both the Document editor
// (theme-prop driven) and the canvas node (`dark:` driven). Trigger styling is
// switched per `variant` so it matches each editor's toolbar.

export type TableMenuProps = {
  editor: Editor | null;
  /** Canvas stores JSON so a header-less table round-trips; the Document editor
   *  persists GFM Markdown (header required), so it hides the toggle. */
  allowHeaderToggle?: boolean;
  variant?: "document" | "canvas";
};

function MenuItem({
  onClick,
  disabled,
  icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      // Keep the editor selection while clicking a menu item.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-strong disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      {children}
    </button>
  );
}

function MenuDivider() {
  return <span className="my-1 block h-px bg-border" />;
}

export default function TableMenu({
  editor,
  allowHeaderToggle = false,
  variant = "document",
}: TableMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const inTable = useEditorState({
    editor,
    selector: ({ editor }) => editor?.isActive("table") ?? false,
  });

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!editor) return null;

  // Run a command then close the menu.
  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  const isCanvas = variant === "canvas";
  const iconSize = isCanvas ? 15 : 16;

  const triggerActive = isCanvas
    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
    : "bg-primary text-primary-foreground";
  const triggerIdle = isCanvas
    ? "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
    : "text-muted-foreground hover:bg-surface-strong hover:text-foreground";
  const triggerBase = isCanvas
    ? "nodrag flex items-center gap-0.5 rounded-md p-1.5 transition-colors"
    : "inline-flex h-8 items-center gap-0.5 rounded px-1.5 transition-colors";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        aria-label="Table"
        aria-expanded={open}
        title="Table"
        className={`${triggerBase} ${open ? triggerActive : triggerIdle}`}
      >
        <TableIcon size={iconSize} strokeWidth={2} />
        <ChevronDown size={isCanvas ? 12 : 13} strokeWidth={2} />
      </button>

      {open && (
        <div className="nodrag nowheel absolute left-0 top-full z-30 mt-1 w-52 rounded-lg border border-border bg-surface p-1 shadow-lg">
          <MenuItem
            icon={<TableIcon size={14} />}
            onClick={() =>
              run(() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run(),
              )
            }
          >
            Insert table
          </MenuItem>

          <MenuDivider />

          <MenuItem
            icon={<Plus size={14} />}
            disabled={!inTable}
            onClick={() => run(() => editor.chain().focus().addRowBefore().run())}
          >
            Add row above
          </MenuItem>
          <MenuItem
            icon={<Plus size={14} />}
            disabled={!inTable}
            onClick={() => run(() => editor.chain().focus().addRowAfter().run())}
          >
            Add row below
          </MenuItem>
          <MenuItem
            icon={<Trash2 size={14} />}
            disabled={!inTable}
            onClick={() => run(() => editor.chain().focus().deleteRow().run())}
          >
            Delete row
          </MenuItem>

          <MenuDivider />

          <MenuItem
            icon={<Plus size={14} />}
            disabled={!inTable}
            onClick={() => run(() => editor.chain().focus().addColumnBefore().run())}
          >
            Add column left
          </MenuItem>
          <MenuItem
            icon={<Plus size={14} />}
            disabled={!inTable}
            onClick={() => run(() => editor.chain().focus().addColumnAfter().run())}
          >
            Add column right
          </MenuItem>
          <MenuItem
            icon={<Trash2 size={14} />}
            disabled={!inTable}
            onClick={() => run(() => editor.chain().focus().deleteColumn().run())}
          >
            Delete column
          </MenuItem>

          <MenuDivider />

          {allowHeaderToggle && (
            <MenuItem
              icon={<Heading size={14} />}
              disabled={!inTable}
              onClick={() => run(() => editor.chain().focus().toggleHeaderRow().run())}
            >
              Toggle header row
            </MenuItem>
          )}
          <MenuItem
            icon={<Trash2 size={14} />}
            disabled={!inTable}
            onClick={() => run(() => editor.chain().focus().deleteTable().run())}
          >
            Delete table
          </MenuItem>
        </div>
      )}
    </div>
  );
}
