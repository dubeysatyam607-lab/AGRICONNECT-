import { Skeleton } from '@/components/ui/skeleton';

export default function AgriStoreSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Search bar */}
      <div className="bg-card p-3 rounded-xl border border-border">
        <Skeleton className="h-5 w-full" />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-lg flex-shrink-0" />
        ))}
      </div>

      {/* Product cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
            <Skeleton className="h-32 w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-between items-center pt-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
