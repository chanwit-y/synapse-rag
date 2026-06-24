import type { CSSProperties } from "react";
import Skeleton from "./Skeleton";

/** A node-card placeholder: header line over a few body lines. */
function NodeCard({
  style,
  lines = 3,
  image = false,
}: {
  style: CSSProperties;
  lines?: number;
  image?: boolean;
}) {
  return (
    <div
      className="absolute rounded-xl border border-border bg-surface/70 p-3 shadow-sm backdrop-blur-[1px]"
      style={style}
    >
      <Skeleton width="55%" height={11} className="mb-3" />
      {image ? (
        <Skeleton variant="rounded" width="100%" height={88} />
      ) : (
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} height={9} width={`${92 - i * 14}%`} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Full-pane skeleton matching the canvas workspace (react-flow): a dotted
 * background with scattered node cards, the left toolbar rail, and the
 * bottom-right minimap + controls. Shown in the right pane while a canvas
 * file's content loads.
 */
export default function CanvasSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      role="status"
      aria-busy="true"
      aria-label="Loading canvas"
    >
      {/* Header: title + breadcrumb on the left, action buttons on the right. */}
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <Skeleton width={240} height={24} variant="rounded" />
            <Skeleton width={160} height={12} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton width={32} height={32} variant="rounded" />
            <Skeleton width={32} height={32} variant="rounded" />
          </div>
        </div>
      </div>

      {/* Canvas surface: dotted background + node cards + chrome. */}
      <div
        className="relative flex-1 overflow-hidden bg-slate-50 text-border dark:bg-slate-950"
        style={{
          backgroundImage:
            "radial-gradient(currentColor 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* Scattered node cards. */}
        <NodeCard style={{ left: "10%", top: "12%", width: "16rem" }} lines={3} />
        <NodeCard style={{ left: "42%", top: "34%", width: "18rem" }} lines={4} />
        <NodeCard
          style={{ right: "9%", top: "16%", width: "14rem" }}
          image
        />
        <NodeCard style={{ left: "20%", bottom: "14%", width: "13rem" }} lines={2} />

        {/* Left toolbar rail. */}
        <div className="absolute left-5 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 rounded-2xl border border-border bg-surface/80 p-1.5 shadow-xl backdrop-blur">
          <Skeleton variant="rounded" width={32} height={32} />
          <div className="mx-2 h-px bg-border" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={32} height={32} />
          ))}
        </div>

        {/* Bottom-right minimap + controls. */}
        <Skeleton
          variant="rounded"
          className="absolute bottom-4 right-4 shadow-lg"
          width={176}
          height={112}
        />
        <div className="absolute bottom-4 right-48 flex flex-col gap-1 rounded-xl border border-border bg-surface/80 p-1 shadow-lg">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={24} height={24} />
          ))}
        </div>
      </div>
    </div>
  );
}
