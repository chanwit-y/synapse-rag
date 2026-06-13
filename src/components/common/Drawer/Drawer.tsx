"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./Drawer.css";

export type DrawerAnchor = "left" | "right" | "top" | "bottom";
export type DrawerSize = "sm" | "md" | "lg" | "xl" | "full";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  onExited?: () => void;
  anchor?: DrawerAnchor;
  size?: DrawerSize;
  title?: ReactNode;
  hideCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
}

const ANIMATION_MS = 300;

export default function Drawer({
  open,
  onClose,
  onExited,
  anchor = "right",
  size = "md",
  title,
  hideCloseButton = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  footer,
  children,
}: DrawerProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onExitedRef = useRef(onExited);

  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }

    setClosing(true);
    setVisible(false);

    const timer = setTimeout(() => {
      setMounted(false);
      setClosing(false);
      onExitedRef.current?.();
    }, ANIMATION_MS);

    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  useEffect(() => {
    if (visible && panelRef.current) {
      panelRef.current.focus();
    }
  }, [visible]);

  const handleBackdropClick = useCallback(
    (e: MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose],
  );

  if (!mounted) return null;

  const backdropClass = [
    "drawer-backdrop",
    visible && !closing ? "drawer-backdrop--open" : "",
    closing ? "drawer-backdrop--closing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const panelClass = [
    "drawer-panel",
    `drawer-panel--${anchor}`,
    `drawer-panel--${size}`,
  ].join(" ");

  return createPortal(
    <div className={backdropClass} onClick={handleBackdropClick} role="presentation">
      <div
        ref={panelRef}
        className={panelClass}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        {(title || !hideCloseButton) && (
          <div className="drawer-header">
            {title ? <h2>{title}</h2> : <span />}
            {!hideCloseButton && (
              <button
                type="button"
                className="drawer-close-btn"
                aria-label="Close"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        <div className="drawer-body">{children}</div>

        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
