"use client";

import { createContext, useContext, useState } from "react";

type CanvasContextValue = {
  /** True while the viewport is being panned/zoomed or a node is being dragged.
   *  Set by `Flow`; read by iframe nodes (Video/Map) to drop a pointer-events
   *  guard over the embed so the gesture stays smooth and isn't hijacked. */
  interacting: boolean;
  setInteracting: (v: boolean) => void;
};

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used within <CanvasProvider>");
  return ctx;
}

/**
 * Holds the small bit of cross-node UI state that isn't part of the canvas
 * graph: the `interacting` flag iframe nodes read to guard their embeds during
 * pan/zoom/drag. Nodes, edges, spawning, and toasts now live in the canvas
 * zustand store (`./store/canvas-store`).
 */
export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [interacting, setInteracting] = useState(false);

  return (
    <CanvasContext.Provider value={{ interacting, setInteracting }}>
      {children}
    </CanvasContext.Provider>
  );
}
