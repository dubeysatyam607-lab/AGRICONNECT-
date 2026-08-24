import { useState } from 'react';
import {
  Activity,
  Bell,
  ChevronDown,
  ChevronUp,
  Loader2,
  Radio,
  Tractor,
  UserPlus,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  useAdminRealtimeFeed,
  type LiveUser,
  type LiveActivity,
} from '../hooks/useAdminRealtimeFeed';

// ─── Time formatting ─────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Action badge color mapping ──────────────────────────────────────────────

function actionColor(action: string): string {
  switch (action) {
    case 'SIGNUP':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
    case 'LOGIN':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400';
    case 'BOOKING_NEW':
    case 'BOOKING_UPDATE':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
    case 'UPDATE':
    case 'DELETE':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400';
  }
}

// ─── Individual feed items ───────────────────────────────────────────────────

function UserRow({ user }: { user: LiveUser }) {
  const initials = (user.full_name || user.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-all',
        user.optimistic
          ? 'border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-500/5 animate-pulse'
          : 'border-border bg-card hover:bg-muted/50',
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">
          {user.full_name || 'New Farmer'}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {user.email || user.phone || user.location || 'Signed up'}
        </p>
      </div>
      <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
        {timeAgo(user.created_at)}
      </span>
    </div>
  );
}

function ActivityRow({ activity }: { activity: LiveActivity }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-2.5 py-2 transition-all',
        activity.optimistic
          ? 'border-primary/30 bg-primary/5 animate-pulse'
          : 'border-border bg-card',
      )}
    >
      <span
        className={cn(
          'mt-0.5 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold',
          actionColor(activity.action),
        )}
      >
        {activity.action}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs text-foreground">{activity.summary}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {activity.actor} · {timeAgo(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

type FeedTab = 'users' | 'activity';

interface RealtimeFeedPanelProps {
  /** Render as a floating overlay panel. */
  className?: string;
  /** Called when the panel close button is clicked. */
  onClose?: () => void;
}

/**
 * Real-time admin feed panel.
 *
 * Shows live user signups and platform activity via Supabase Realtime.
 * New users appear within 1-2 seconds of signup. Activity feed updates
 * within 2 seconds of any database change.
 *
 * Can be rendered as a sidebar panel, overlay, or embedded component.
 */
export function RealtimeFeedPanel({ className, onClose }: RealtimeFeedPanelProps) {
  const feed = useAdminRealtimeFeed();
  const [tab, setTab] = useState<FeedTab>('users');
  const [collapsed, setCollapsed] = useState(false);

  const userCount = feed.newUsers.length;
  const activityCount = feed.recentActivity.length;

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border bg-card shadow-lg overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
          <h3 className="text-xs font-bold text-foreground">Live Feed</h3>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <Radio className="h-2.5 w-2.5" />
            {feed.connected ? 'Connected' : 'Connecting…'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setTab('users')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors',
                tab === 'users'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Signups
              {userCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {userCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('activity')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors',
                tab === 'activity'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              Activity
              {activityCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {activityCount}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ maxHeight: 360 }}>
            {feed.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tab === 'users' ? (
              feed.newUsers.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No users yet. Signups will appear here in real-time.
                </p>
              ) : (
                feed.newUsers.map((user) => <UserRow key={user.id} user={user} />)
              )
            ) : feed.recentActivity.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No activity yet. Events will stream here in real-time.
              </p>
            ) : (
              feed.recentActivity.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {feed.connected ? (
                <Wifi className="h-3 w-3 text-emerald-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              {feed.connected ? 'Realtime active' : 'Reconnecting…'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] font-semibold"
              onClick={feed.refreshAll}
            >
              Refresh
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Compact badge for sidebar ───────────────────────────────────────────────

/**
 * Compact live-feed indicator for the admin sidebar.
 * Shows connection status + unread count badge.
 */
export function RealtimeFeedBadge({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  const feed = useAdminRealtimeFeed();
  const total = feed.newUsers.length + feed.recentActivity.length;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/50',
        className,
      )}
    >
      <div className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </div>
      <span className="flex-1 text-left text-xs font-semibold text-foreground">
        Live Feed
      </span>
      {total > 0 && (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
          {total}
        </span>
      )}
    </button>
  );
}
