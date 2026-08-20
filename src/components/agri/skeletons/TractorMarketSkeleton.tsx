import { Skeleton } from '@/components/ui/skeleton';

export default function TractorMarketSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Search + filter bar */}
      <div className="bg-card p-3 rounded-xl border border-border flex gap-2">
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg flex-shrink-0" />
        ))}
      </div>

      {/* Tractor cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-2xl border border-border p-0 overflow-hidden">
          <Skeleton className="h-40 w-full" />
          <div className="p-3.5 space-y-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-3 w-14 rounded-full" />
              <Skeleton className="h-3 w-14 rounded-full" />
            </div>
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
