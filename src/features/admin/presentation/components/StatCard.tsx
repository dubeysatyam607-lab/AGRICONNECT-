import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconClassName?: string;
  delta?: number;
  deltaLabel?: string;
  hint?: string;
}

export function StatCard({ title, value, icon: Icon, iconClassName, delta, deltaLabel, hint }: StatCardProps) {
  const trendUp = (delta ?? 0) >= 0;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn('h-10 w-10 shrink-0 rounded-lg flex items-center justify-center', iconClassName ?? 'bg-primary/10 text-primary')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            )}
          >
            {delta === 0 ? <Minus className="h-3 w-3" /> : trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
        {hint && !deltaLabel && <span className="text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}
