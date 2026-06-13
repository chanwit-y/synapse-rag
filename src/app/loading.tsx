import { Skeleton } from "@/components/common/Skeleton";

export default function Loading() {
  return (
    <div
      className="relative flex h-[calc(100vh-64px)] flex-col"
      role="status"
      aria-busy="true"
      aria-label="Loading chat"
    >
      {/* Header. */}
      <header className="flex items-center justify-between gap-4 border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton width={40} height={40} variant="rounded" />
          <div className="space-y-2">
            <Skeleton width={140} height={16} variant="rounded" />
            <Skeleton width={90} height={12} />
          </div>
        </div>
        <Skeleton width={120} height={32} variant="rounded" />
      </header>

      {/* Knowledge / RAG selector bar. */}
      <section className="border-b border-border/60 bg-surface/40 px-6 py-2.5">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2">
          <Skeleton width={90} height={14} />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} width={96} height={26} variant="rounded" />
          ))}
        </div>
      </section>

      {/* Message stream. */}
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {[
            { mine: false, lines: 3 },
            { mine: true, lines: 1 },
            { mine: false, lines: 4 },
          ].map((bubble, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${bubble.mine ? "flex-row-reverse" : "flex-row"}`}
            >
              <Skeleton width={32} height={32} variant="circular" />
              <div className={`flex max-w-[75%] flex-col gap-2 ${bubble.mine ? "items-end" : "items-start"}`}>
                {Array.from({ length: bubble.lines }).map((_, l) => (
                  <Skeleton
                    key={l}
                    height={14}
                    width={`${160 + ((i + l) * 53) % 220}px`}
                    variant="rounded"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer. */}
      <div className="border-t border-border/60 px-4 py-4 sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton height={52} variant="rounded" />
        </div>
      </div>
    </div>
  );
}
