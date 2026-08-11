import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const WeatherSkeleton: React.FC = () => {
  return (
    <div className="mx-4 -mt-10 relative z-20 gradient-sky rounded-2xl p-4 shadow-lg overflow-hidden animate-pulse">
      {/* Decorative circle */}
      <div className="absolute right-0 top-0 w-32 h-32 bg-primary-foreground/10 rounded-full transform translate-x-8 -translate-y-8" />

      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-3">
          {/* Location */}
          <Skeleton className="h-3 w-28 bg-primary-foreground/20" />
          {/* Temperature */}
          <Skeleton className="h-10 w-24 bg-primary-foreground/20" />
          {/* Condition */}
          <Skeleton className="h-4 w-16 bg-primary-foreground/20" />
          {/* Feels like */}
          <Skeleton className="h-3 w-32 bg-primary-foreground/20" />
        </div>
        {/* Weather icon */}
        <Skeleton className="w-16 h-16 rounded-full bg-primary-foreground/20" />
      </div>

      {/* Stats bar */}
      <div className="flex gap-6 mt-4 border-t border-primary-foreground/20 pt-3 relative z-10">
        <Skeleton className="h-4 w-12 bg-primary-foreground/20" />
        <Skeleton className="h-4 w-16 bg-primary-foreground/20" />
        <Skeleton className="h-4 w-14 bg-primary-foreground/20" />
      </div>
    </div>
  );
};

export default WeatherSkeleton;
