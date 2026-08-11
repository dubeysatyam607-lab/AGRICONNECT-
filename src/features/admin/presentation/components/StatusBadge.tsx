import { cn } from '@/lib/utils';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple' | 'teal';

const TONE_MAP: Record<string, Tone> = {
  Active: 'green',
  Verified: 'green',
  Published: 'green',
  Approved: 'green',
  Success: 'green',
  Completed: 'green',
  Confirmed: 'green',
  Resolved: 'green',
  Sent: 'green',
  Delivered: 'green',
  Available: 'green',
  'In Progress': 'blue',
  Processing: 'blue',
  Shipped: 'blue',
  Scheduled: 'blue',
  Investigating: 'blue',
  Waiting: 'blue',
  Upcoming: 'blue',
  Pending: 'amber',
  Inactive: 'gray',
  Draft: 'gray',
  Paused: 'amber',
  Trial: 'purple',
  Expired: 'gray',
  Cancelled: 'red',
  Suspended: 'red',
  Rejected: 'red',
  Failed: 'red',
  Refunded: 'red',
  Closed: 'gray',
  OutofStock: 'red',
  'Out of Stock': 'red',
  Hidden: 'gray',
  Unverified: 'amber',
  Archived: 'gray',
  New: 'blue',
  Fixed: 'green',
  Ignored: 'gray',
  End: 'gray',
  Ended: 'gray',
  up: 'green',
  down: 'red',
  stable: 'gray',
};

const TONE_STYLES: Record<Tone, string> = {
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  gray: 'bg-muted text-muted-foreground',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
};

export function AdminStatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = TONE_MAP[status] ?? TONE_MAP[status.replace(/\s+/g, '')] ?? 'gray';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        TONE_STYLES[tone],
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', tone === 'gray' ? 'bg-current opacity-60' : 'bg-current')} />
      {status}
    </span>
  );
}
