import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const PashuMelaSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-4 flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Search skeleton */}
      <Skeleton className="h-10 w-full rounded-lg mb-3" />

      {/* Filter buttons skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-lg flex-shrink-0" />
        ))}
      </div>

      {/* More filters button skeleton */}
      <Skeleton className="h-8 w-full rounded-lg mb-3" />

      {/* Results count skeleton */}
      <Skeleton className="h-4 w-32 mb-3" />

      {/* Animal cards grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Image placeholder */}
            <Skeleton className="h-28 w-full" />
            {/* Content */}
            <div className="p-2 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
              <div className="flex justify-between items-center mt-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-8 w-full rounded-lg mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PashuMelaSkeleton;
