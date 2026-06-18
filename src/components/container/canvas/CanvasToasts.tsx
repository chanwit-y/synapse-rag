"use client";

import { useCanvasStore } from "./store/canvas-store";

/**
 * Renders the transient toast stack at the bottom of the canvas. Toasts (and
 * their optional action button, e.g. Undo) live in the canvas store; this is the
 * view that paints them. Mounted once in CanvasWorkspace.
 */
export default function CanvasToasts() {
  const toasts = useCanvasStore((s) => s.toasts);
  const dismiss = useCanvasStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 animate-[toast-in_180ms_ease-out] rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur"
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                dismiss(toast.id);
              }}
              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
