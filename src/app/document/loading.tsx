import { Skeleton } from "@/components/common/Skeleton";

export default function Loading() {
  return (
    <div
      className="flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden"
      role="status"
      aria-busy="true"
      aria-label="Loading documents"
    >
      {/* Sidebar (matches FileSidebar default width of 280px). */}
      <div className="flex w-[280px] shrink-0 flex-col gap-4 border-r border-border bg-surface p-4">
        <Skeleton width={120} height={20} variant="rounded" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2" style={{ paddingLeft: (i % 3) * 16 }}>
              <Skeleton width={16} height={16} variant="rounded" />
              <Skeleton height={14} width={`${50 + ((i * 11) % 40)}%`} />
            </div>
          ))}
        </div>
      </div>

      {/* Editor panel. */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <Skeleton width={220} height={22} variant="rounded" />
              <Skeleton width={160} height={12} />
            </div>
            <Skeleton width={36} height={36} variant="rounded" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} height={14} width={`${100 - ((i * 7) % 45)}%`} />
          ))}
        </div>
      </div>
    </div>
  );
}
