"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export interface PopoverProps {
  /** Whether the panel is shown. */
  open: boolean;
  /** Called when the panel requests to close (outside click / Escape). */
  onClose: () => void;
  /** Element the panel is positioned against. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Panel contents. */
  children: ReactNode;
  /** Horizontal edge of the anchor to align the panel to. Defaults to "start". */
  align?: "start" | "end";
  /** Gap between the anchor and the panel, in pixels. Defaults to 4. */
  offset?: number;
  /** Extra classes for the panel. */
  className?: string;
}

interface Coords {
  top: number;
  left: number;
}

/**
 * A lightweight anchored popover rendered in a portal so it escapes any
 * `overflow: hidden` ancestor (e.g. a scrolling sidebar). Positioned with fixed
 * coordinates computed from the anchor's bounding rect; recomputed on scroll and
 * resize while open. Closes on outside click or Escape.
 */
export default function Popover({
  open,
  onClose,
  anchorRef,
  children,
  align = "start",
  offset = 4,
  className,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  // Position the panel just below the anchor, aligned to the requested edge.
  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const panelWidth = panelRef.current?.offsetWidth ?? 0;
      const left =
        align === "end" ? rect.right - panelWidth : rect.left;
      setCoords({ top: rect.bottom + offset, left });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef, align, offset]);

  // Outside click + Escape to dismiss.
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, anchorRef, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      className={`fixed z-50 min-w-40 rounded-md border border-border bg-surface p-1 shadow-lg ${
        className ?? ""
      }`}
      style={{
        top: coords?.top ?? -9999,
        left: coords?.left ?? -9999,
        visibility: coords ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
