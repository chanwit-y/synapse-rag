import Skeleton from "./Skeleton";

export type TableSkeletonProps = {
  /** Page heading line. */
  title?: string;
  /** Number of placeholder rows. */
  rows?: number;
  /** Number of placeholder columns. */
  columns?: number;
};

/**
 * Full-page skeleton matching the header + outlined-table layout used by the
 * RAG, API-key and AI-model pages.
 */
export default function TableSkeleton({
  title,
  rows = 6,
  columns = 4,
}: TableSkeletonProps) {
  return (
    <div
      className="relative flex flex-col gap-6 p-6"
      role="status"
      aria-busy="true"
      aria-label={title ? `Loading ${title}` : "Loading"}
    >
      {/* Header: title + description on the left, action button on the right. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton width={180} height={28} variant="rounded" />
          <Skeleton width={280} height={16} />
        </div>
        <Skeleton width={40} height={40} variant="rounded" />
      </div>

      {/* Outlined table card. */}
      <div className="overflow-hidden rounded-lg border border-border">
        {/* Column headers. */}
        <div
          className="grid gap-4 border-b border-border bg-surface px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} height={14} width={`${60 + ((i * 13) % 30)}%`} />
          ))}
        </div>

        {/* Rows. */}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid items-center gap-4 border-b border-border px-4 py-4 last:border-b-0"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} height={14} width={`${50 + ((r + c) * 17) % 45}%`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
