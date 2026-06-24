"use client";

import { Fragment } from "react";
import { Handle, Position, useNodeId, useStore } from "@xyflow/react";

/** Cardinal sides exposed as connectable handles on every node. */
export const SIDES = [
  { side: "top", pos: Position.Top },
  { side: "right", pos: Position.Right },
  { side: "bottom", pos: Position.Bottom },
  { side: "left", pos: Position.Left },
] as const;

export type Side = (typeof SIDES)[number]["side"];

/**
 * Renders a source + target handle on each of the four sides (overlapping, so
 * each side shows as a single dot). Handle ids are `s-<side>` / `t-<side>` so
 * the position picker can attach an edge to a chosen side of any node.
 *
 * The dots are revealed only while the node is hovered (`group-hover`, every
 * node root carries `group`) or selected — keeping nodes clean at rest. Opacity
 * doesn't disable the handles, so they stay connectable the moment they appear.
 */
export default function SideHandles() {
  const nodeId = useNodeId();
  const selected = useStore((s) =>
    nodeId ? s.nodeLookup.get(nodeId)?.selected ?? false : false,
  );
  return (
    <div
      className={`transition-opacity ${
        selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      {SIDES.map(({ side, pos }) => (
        <Fragment key={side}>
          <Handle
            id={`t-${side}`}
            type="target"
            position={pos}
            className="!h-3 !w-3 !border-2 !border-white !bg-slate-300 dark:!border-slate-900 dark:!bg-slate-600"
          />
          <Handle
            id={`s-${side}`}
            type="source"
            position={pos}
            className="!h-3 !w-3 !border-2 !border-white !bg-slate-300 dark:!border-slate-900 dark:!bg-slate-600"
          />
        </Fragment>
      ))}
    </div>
  );
}
