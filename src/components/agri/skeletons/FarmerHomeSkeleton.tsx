import { Skeleton } from '@/components/ui/skeleton';

export default function FarmerHomeSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-4 animate-pulse">
      {/* Hero banner skeleton */}
      <div className="rounded-3xl bg-card border border-border p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-card border border-border p-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      {/* Mandi prices preview */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-32" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Weather widget */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 bg-primary/15" />
            <Skeleton className="h-8 w-16 bg-primary/15" />
            <Skeleton className="h-3 w-24 bg-primary/15" />
          </div>
          <Skeleton className="h-14 w-14 rounded-full bg-primary/15" />
        </div>
      </div>
    </div>
  );
}
