"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type NodeProps } from "@xyflow/react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Baseline,
} from "lucide-react";
import { useCanvasStore } from "../store/canvas-store";
import SideHandles from "./SideHandles";
import NodeRemoveButton from "./NodeRemoveButton";
import { TEXT_COLORS, NODE_COLOR_KEYS, textColor } from "./nodeColors";
import type { NodeColor, TextAlign, TextNode as TextNodeType } from "../types";

/** Preset font sizes for the size dropdown (px). */
const FONT_SIZES = [12, 14, 16, 20, 24, 32, 48, 64] as const;

const ALIGNS: { value: TextAlign; icon: typeof AlignLeft; label: string }[] = [
  { value: "left", icon: AlignLeft, label: "Align left" },
  { value: "center", icon: AlignCenter, label: "Align center" },
  { value: "right", icon: AlignRight, label: "Align right" },
];

export default function TextNode({ id, data, selected }: NodeProps<TextNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const elRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  const text = data.text ?? "";
  const fontSize = data.fontSize ?? 24;
  const align = data.align ?? "left";
  const tc = textColor(data.color);

  // Keep the (uncontrolled) contentEditable DOM in sync with the stored text
  // while NOT editing — avoids cursor jumps mid-typing. On entering edit mode the
  // current text is already in the DOM, so we leave it alone.
  useEffect(() => {
    if (!editing && elRef.current && elRef.current.innerText !== text) {
      elRef.current.innerText = text;
    }
  }, [text, editing]);

  const startEditing = useCallback(() => {
    setEditing(true);
    requestAnimationFrame(() => {
      const el = elRef.current;
      if (!el) return;
      el.focus();
      // Place the caret at the end of the existing text.
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }, []);

  // Freshly-added node: drop straight into edit mode so the user can type.
  const didAutoEdit = useRef(false);
  useEffect(() => {
    if (data.autoEdit && !didAutoEdit.current) {
      didAutoEdit.current = true;
      updateNodeData(id, { autoEdit: false });
      startEditing();
    }
  }, [data.autoEdit, id, updateNodeData, startEditing]);

  // Enter (while selected, not editing) begins editing — mirrors double-click.
  useEffect(() => {
    if (!selected || editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        startEditing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, editing, startEditing]);

  // Close the color popover on an outside pointerdown.
  useEffect(() => {
    if (!colorOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!colorRef.current?.contains(e.target as Node)) setColorOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [colorOpen]);

  const commit = useCallback(() => {
    setEditing(false);
    const next = elRef.current?.innerText ?? "";
    if (next !== text) updateNodeData(id, { text: next });
  }, [id, text, updateNodeData]);

  const toolbarShown = selected;

  return (
    <div className="group relative">
      {/* Handles reveal on hover/select (handled inside SideHandles). */}
      <SideHandles />
      <NodeRemoveButton id={id} className="-right-2.5 -top-2.5" />

      {/* Floating format toolbar — only while the node is selected. */}
      {toolbarShown && (
        <div
          ref={colorRef}
          className="nodrag absolute -top-2 left-1/2 z-30 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-800"
        >
          {/* Size */}
          <select
            value={fontSize}
            onChange={(e) => updateNodeData(id, { fontSize: Number(e.target.value) })}
            className="nodrag h-7 cursor-pointer rounded-md bg-transparent px-1.5 text-xs font-medium text-slate-600 outline-none hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Font size"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <span className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Bold / Italic / Underline */}
          <TbBtn active={!!data.bold} label="Bold" onClick={() => updateNodeData(id, { bold: !data.bold })}>
            <Bold size={14} />
          </TbBtn>
          <TbBtn active={!!data.italic} label="Italic" onClick={() => updateNodeData(id, { italic: !data.italic })}>
            <Italic size={14} />
          </TbBtn>
          <TbBtn
            active={!!data.underline}
            label="Underline"
            onClick={() => updateNodeData(id, { underline: !data.underline })}
          >
            <Underline size={14} />
          </TbBtn>

          <span className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Alignment */}
          {ALIGNS.map(({ value, icon: Icon, label }) => (
            <TbBtn key={value} active={align === value} label={label} onClick={() => updateNodeData(id, { align: value })}>
              <Icon size={14} />
            </TbBtn>
          ))}

          <span className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Text color */}
          <div className="relative">
            <TbBtn active={colorOpen} label="Text color" onClick={() => setColorOpen((o) => !o)}>
              <Baseline size={14} />
              <span className={`-mt-0.5 block h-1 w-3.5 rounded-full ${tc.swatch}`} />
            </TbBtn>
            {colorOpen && (
              <div
                className="absolute right-0 top-9 z-30 grid w-max gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-800"
                style={{ gridTemplateColumns: "repeat(4, 1.5rem)" }}
              >
                {NODE_COLOR_KEYS.map((key) => {
                  const c = TEXT_COLORS[key];
                  const isActive = (data.color ?? "default") === key;
                  return (
                    <button
                      key={key}
                      title={c.label}
                      onClick={() => {
                        updateNodeData(id, { color: key as NodeColor });
                        setColorOpen(false);
                      }}
                      className={`h-6 w-6 rounded-full ${c.swatch} transition-transform hover:scale-110 ${
                        isActive ? `ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-800 ${c.ring}` : ""
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* The text itself — chrome-less, auto-sizing, edited inline. */}
      <div className="relative min-w-[80px] max-w-[640px]">
        <div
          ref={elRef}
          contentEditable={editing}
          suppressContentEditableWarning
          onDoubleClick={startEditing}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              elRef.current?.blur();
            }
          }}
          className={`${editing ? "nodrag nowheel cursor-text" : "cursor-default"} whitespace-pre-wrap wrap-break-word rounded-md border border-slate-200 px-3 py-2 leading-snug outline-none dark:border-slate-700 ${tc.text} ${
            editing ? "ring-2 ring-amber-300 dark:ring-amber-500/50" : ""
          }`}
          style={{
            fontSize,
            fontWeight: data.bold ? 700 : 400,
            fontStyle: data.italic ? "italic" : "normal",
            textDecoration: data.underline ? "underline" : "none",
            textAlign: align,
            minWidth: 80,
          }}
        />
        {/* Faint placeholder while empty and not editing. */}
        {!editing && !text && (
          <span
            onDoubleClick={startEditing}
            className="pointer-events-none absolute left-3 top-2 select-none text-slate-400 dark:text-slate-500"
            style={{ fontSize }}
          >
            Text
          </span>
        )}
      </div>
    </div>
  );
}

/** Compact toolbar toggle button. */
function TbBtn({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      // Keep edit focus (and node selection) when toggling — don't blur the text.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`nodrag flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-md px-1 transition-colors ${
        active
          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
