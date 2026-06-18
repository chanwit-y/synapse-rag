"use client";

import { X } from "lucide-react";
import { useCanvasStore } from "../store/canvas-store";
import type { AppNode, Highlight } from "../types";

/**
 * A small delete control rendered in the top-right corner of every node.
 * Hidden until the node is hovered (`group-hover`) or selected (a globals.css
 * rule targets `.react-flow__node.selected .node-delete-btn`).
 *
 * Deleting drops the node plus every edge touching it (a child loses just this
 * incoming edge — it may still have other sources). Because each highlight
 * is paired 1:1 with the child it spawned, deleting that child also strips the
 * parent's matching highlight (`nodeId === id`). A snapshot of the node, its
 * edges, and any affected parents' highlights feeds the Undo action.
 */
export default function NodeRemoveButton({ id }: { id: string }) {
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const notify = useCanvasStore((s) => s.notify);

  const remove = () => {
    const { nodes, edges } = useCanvasStore.getState();
    const node = nodes.find((n) => n.id === id);
    const touching = edges.filter((e) => e.source === id || e.target === id);

    // Parents whose highlight is paired to this (child) node, with a snapshot of
    // their highlight array so Undo can put it back exactly.
    const pairedParents = edges
      .filter((e) => e.target === id && e.sourceHandle?.startsWith("highlight-"))
      .map((e) => e.source);
    const parentSnapshots = pairedParents.map((pid) => {
      const p = nodes.find((n) => n.id === pid);
      return {
        pid,
        highlights:
          p?.type === "textEditor" || p?.type === "chat"
            ? p.data.highlights
            : undefined,
      };
    });

    setNodes((nds) =>
      nds
        .filter((n) => n.id !== id)
        .map((n) =>
          pairedParents.includes(n.id) &&
          (n.type === "textEditor" || n.type === "chat")
            ? ({
                ...n,
                data: {
                  ...n.data,
                  highlights: (n.data.highlights ?? []).filter(
                    (h) => h.nodeId !== id,
                  ),
                },
              } as AppNode)
            : n,
        ),
    );
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));

    notify("Node deleted", {
      label: "Undo",
      onClick: () => {
        setNodes((nds) => {
          const restored = node ? [...nds, node] : nds;
          return restored.map((n) => {
            const snap = parentSnapshots.find((s) => s.pid === n.id);
            return snap && (n.type === "textEditor" || n.type === "chat")
              ? ({ ...n, data: { ...n.data, highlights: snap.highlights as Highlight[] | undefined } } as AppNode)
              : n;
          });
        });
        if (touching.length) setEdges((eds) => [...eds, ...touching]);
      },
    });
  };

  return (
    <button
      onClick={remove}
      title="Delete node"
      className="nodrag node-delete-btn absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 opacity-0 shadow-sm ring-1 ring-slate-200 transition-opacity hover:text-rose-500 group-hover:opacity-100"
    >
      <X size={13} />
    </button>
  );
}
