import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const MandiPriceSkeleton: React.FC = () => {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Search bar skeleton */}
      <div className="bg-card p-3 rounded-xl border border-border">
        <Skeleton className="h-5 w-full" />
      </div>

      {/* Price cards skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="bg-card p-4 rounded-xl border border-border"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Skeleton className="w-11 h-11 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-5 w-20 ml-auto" />
              <Skeleton className="h-3 w-12 ml-auto" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MandiPriceSkeleton;
