"use client";

import { useCallback, useEffect, useState } from "react";
import type { Edge } from "@xyflow/react";
import { Maximize2, Minimize2, Save } from "lucide-react";
import CanvasWorkspace from "./CanvasWorkspace";
import { useCanvasStore } from "./store/canvas-store";
import type { AppNode } from "./types";

/** Safely parse the stored `{ nodes, edges }` JSON into a react-flow graph. */
function parseGraph(content: string): { nodes: AppNode[]; edges: Edge[] } {
  try {
    const parsed = JSON.parse(content || "{}") as {
      nodes?: AppNode[];
      edges?: Edge[];
    };
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

export interface CanvasDocumentViewProps {
  /** Serialized `{ nodes, edges }` JSON for this canvas. */
  content: string;
  /** Persist the serialized graph. Resolves once saved. */
  onSave: (content: string) => Promise<void>;
}

/**
 * Renders a persisted canvas document inside the document main pane. Hydrates
 * the shared canvas store from the item's saved JSON on open, and serializes it
 * back out on Save. The heavy `@xyflow/react` bundle stays isolated here so it's
 * only loaded once a canvas is actually opened.
 */
export default function CanvasDocumentView({
  content,
  onSave,
}: CanvasDocumentViewProps) {
  const loadCanvas = useCanvasStore((s) => s.loadCanvas);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => setIsFullscreen((v) => !v), []);

  // Esc exits the maximized (in-app) view, matching native fullscreen muscle
  // memory without taking over the whole OS screen.
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // Hydrate the store with the saved graph. The parent keys this view by item id
  // and mounts it only once content is loaded, so `content` is stable for the
  // component's life (it changes only on save, where re-hydrating is a no-op) —
  // in-canvas edits never trigger a reload.
  useEffect(() => {
    const { nodes, edges } = parseGraph(content);
    loadCanvas(nodes, edges);
  }, [content, loadCanvas]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const { nodes, edges } = useCanvasStore.getState();
      await onSave(JSON.stringify({ nodes, edges }));
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onSave]);

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex min-h-0 flex-col bg-surface"
          : "flex h-full min-h-0 flex-1 flex-col bg-surface"
      }
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface/50 px-4 py-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          title={isSaving ? "Saving…" : "Save"}
          aria-label={isSaving ? "Saving…" : "Save"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit full screen" : "Full screen"}
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground shadow-sm transition-colors hover:bg-surface-strong hover:text-foreground"
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <CanvasWorkspace embedded />
      </div>
    </div>
  );
}
