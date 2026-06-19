"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Edge } from "@xyflow/react";
import { Maximize2, Minimize2, Save } from "lucide-react";
import { deleteCanvasImageAction, listChatModelsAction } from "@/server/actions";
import SelectField from "@/components/common/SelectField/SelectField";
import CanvasWorkspace from "./CanvasWorkspace";
import { useCanvasStore } from "./store/canvas-store";
import type { AppNode } from "./types";

type ChatModelOption = { id: string; name: string; isDefault: boolean };

/** Pull every `/canvas-images/...` path referenced in a serialized graph. Used
 *  to garbage-collect images that a save removed from the canvas. */
function canvasImagePaths(serialized: string): Set<string> {
  const matches = serialized.match(/\/canvas-images\/[A-Za-z0-9._-]+/g);
  return new Set(matches ?? []);
}

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
  const chatModelId = useCanvasStore((s) => s.chatModelId);
  const setChatModelId = useCanvasStore((s) => s.setChatModelId);
  const [chatModels, setChatModels] = useState<ChatModelOption[]>([]);
  // The image paths present in the last persisted graph. Diffed on save so an
  // image dropped from the canvas (and durably saved away) is unlinked on disk.
  const savedImagePathsRef = useRef<Set<string>>(canvasImagePaths(content));
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // While exiting, the overlay stays mounted (still fixed) so the shrink-out
  // animation can play; `onAnimationEnd` then collapses it back to embedded.
  const [isExiting, setIsExiting] = useState(false);

  const enterFullscreen = useCallback(() => {
    setIsExiting(false);
    setIsFullscreen(true);
  }, []);
  const exitFullscreen = useCallback(() => setIsExiting(true), []);
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen && !isExiting) exitFullscreen();
    else enterFullscreen();
  }, [isFullscreen, isExiting, enterFullscreen, exitFullscreen]);

  // Esc exits the maximized (in-app) view, matching native fullscreen muscle
  // memory without taking over the whole OS screen.
  useEffect(() => {
    if (!isFullscreen || isExiting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, isExiting, exitFullscreen]);

  // Load the active chat models for the canvas picker; preselect the default one
  // (then the first) when nothing is chosen yet. The selection is ephemeral and
  // lives in the canvas store so chat nodes can read it.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listChatModelsAction();
      if (cancelled || !result.success) return;
      const options: ChatModelOption[] = result.data
        .filter((m) => m.status === "active")
        .map((m) => ({ id: m.id, name: m.name, isDefault: m.isDefault }));
      setChatModels(options);
      const current = useCanvasStore.getState().chatModelId;
      const stillValid = current && options.some((o) => o.id === current);
      if (!stillValid) {
        setChatModelId(options.find((o) => o.isDefault)?.id ?? options[0]?.id ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setChatModelId]);

  // Hydrate the store with the saved graph. The parent keys this view by item id
  // and mounts it only once content is loaded, so `content` is stable for the
  // component's life (it changes only on save, where re-hydrating is a no-op) —
  // in-canvas edits never trigger a reload.
  useEffect(() => {
    const { nodes, edges } = parseGraph(content);
    loadCanvas(nodes, edges);
    savedImagePathsRef.current = canvasImagePaths(content);
  }, [content, loadCanvas]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const { nodes, edges } = useCanvasStore.getState();
      const serialized = JSON.stringify({ nodes, edges });
      await onSave(serialized);

      // After the graph is durably saved, unlink any canvas image that was in
      // the previously-saved graph but is no longer referenced. Best-effort:
      // a failed delete just leaves an orphan file, never blocks the save.
      const nextPaths = canvasImagePaths(serialized);
      const removed = [...savedImagePathsRef.current].filter(
        (p) => !nextPaths.has(p),
      );
      savedImagePathsRef.current = nextPaths;
      if (removed.length) {
        void Promise.all(
          removed.map((p) => deleteCanvasImageAction(p).catch(() => undefined)),
        );
      }
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onSave]);

  return (
    <div
      onAnimationEnd={() => {
        if (isExiting) {
          setIsFullscreen(false);
          setIsExiting(false);
        }
      }}
      className={
        isFullscreen
          ? `fixed inset-0 z-50 flex min-h-0 origin-center flex-col bg-surface ${
              isExiting
                ? "animate-[canvas-fullscreen-out_200ms_ease-in]"
                : "animate-[canvas-fullscreen-in_220ms_ease-out]"
            }`
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
        <div className="flex items-center gap-2">
          <SelectField
            size="small"
            aria-label="AI model"
            placeholder={chatModels.length ? "Model" : "No models"}
            disabled={chatModels.length === 0}
            options={chatModels.map((m) => ({ value: m.id, label: m.name }))}
            value={chatModelId}
            onChange={(v) => setChatModelId(v == null ? null : String(v))}
            className="w-44"
          />
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
      </div>
      <div className="relative min-h-0 flex-1">
        <CanvasWorkspace embedded />
      </div>
    </div>
  );
}
