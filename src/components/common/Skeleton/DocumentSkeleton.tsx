import Skeleton from "./Skeleton";

export type DocumentSkeletonProps = {
  /** Number of placeholder body lines. */
  lines?: number;
};

// Deterministic line widths so the skeleton looks like prose without hydration
// mismatches from random values.
const LINE_WIDTHS = [
  "95%",
  "88%",
  "72%",
  "90%",
  "60%",
  "84%",
  "78%",
  "55%",
  "92%",
  "68%",
  "82%",
  "48%",
];

/**
 * Full-pane skeleton matching the document editor layout (header bar with title,
 * breadcrumb and toolbar, over a body of prose lines). Shown in the right pane
 * while a file's content loads.
 */
export default function DocumentSkeleton({ lines = 12 }: DocumentSkeletonProps) {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      role="status"
      aria-busy="true"
      aria-label="Loading document"
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

      {/* Toolbar row. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-6 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width={28} height={28} variant="rounded" />
        ))}
      </div>

      {/* Body prose lines. */}
      <div className="flex-1 space-y-3 overflow-hidden p-6">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} height={14} width={LINE_WIDTHS[i % LINE_WIDTHS.length]} />
        ))}
      </div>
    </div>
  );
}
