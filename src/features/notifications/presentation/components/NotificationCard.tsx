import React from 'react';
import {
  CloudSun, TrendingUp, Landmark, ShoppingBag, Tractor, Wallet,
  Bot, ListChecks, BellRing, Info, ArrowRight, X, Clock,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate, localeFor } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import type { AppNotification, NotifCategory, NotifSeverity } from '../../domain/notificationTypes';
import { timeAgo } from '../../domain/notificationStore';

const CATEGORY_META: Record<NotifCategory, { icon: React.ComponentType<{ size?: number; className?: string }>; tone: string }> = {
  weather: { icon: CloudSun, tone: 'text-sky-600 bg-sky-500/12' },
  mandi: { icon: TrendingUp, tone: 'text-emerald-600 bg-emerald-500/12' },
  scheme: { icon: Landmark, tone: 'text-indigo-600 bg-indigo-500/12' },
  order: { icon: ShoppingBag, tone: 'text-orange-600 bg-orange-500/12' },
  booking: { icon: Tractor, tone: 'text-amber-600 bg-amber-500/12' },
  payment: { icon: Wallet, tone: 'text-violet-600 bg-violet-500/12' },
  ai: { icon: Bot, tone: 'text-purple-600 bg-purple-500/12' },
  task: { icon: ListChecks, tone: 'text-teal-600 bg-teal-500/12' },
  reminder: { icon: BellRing, tone: 'text-rose-600 bg-rose-500/12' },
  system: { icon: Info, tone: 'text-slate-600 bg-slate-500/12' },
};

const SEVERITY_RING: Record<NotifSeverity, string> = {
  info: 'border-border',
  alert: 'border-l-amber-500/80',
  critical: 'border-l-rose-600',
};

const SEVERITY_LABEL: Record<NotifSeverity, string> = {
  info: '',
  alert: 'Alert',
  critical: 'Urgent',
};

interface NotificationCardProps {
  notification: AppNotification;
  onNavigate: (tab: string) => void;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({ notification, onNavigate, onRead, onDismiss }) => {
  const { t, language } = useLanguage();
  const meta = CATEGORY_META[notification.category] || CATEGORY_META.system;
  const Icon = meta.icon;
  const isPending = !!notification.scheduledAt && new Date(notification.scheduledAt).getTime() > Date.now();
  const resolveParams = (): Record<string, string | number> => {
    const params = notification.params || {};
    return Object.fromEntries(
      Object.entries(params).map(([k, v]) => [
        k,
        typeof v === 'string' && v.startsWith('i18n:') ? t(v.slice(5)) : v,
      ]),
    );
  };
  const resolved = resolveParams();
  const title = interpolate(t(notification.titleKey), resolved);
  const body = notification.bodyKey ? interpolate(t(notification.bodyKey), resolved) : null;
  const severityLabel = SEVERITY_LABEL[notification.severity];

  return (
    <article
      className={cn(
        'relative rounded-2xl border bg-card p-3.5 shadow-card transition-all',
        !notification.read && 'border-l-4',
        SEVERITY_RING[notification.severity],
        !notification.read ? 'bg-muted/40' : 'opacity-90',
      )}
      role="listitem"
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.tone)}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              {t(`notif.category.${notification.category}`)}
            </span>
            {severityLabel && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide',
                  notification.severity === 'critical' ? 'bg-rose-600 text-white' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                )}
              >
                {severityLabel}
              </span>
            )}
            <span className="ml-auto text-[10px] font-semibold text-muted-foreground">
              {isPending ? (
                <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
                  <Clock size={11} />
                  {t('notif.center.scheduled')}
                </span>
              ) : (
                timeAgo(notification.createdAt, localeFor(language))
              )}
            </span>
            {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500 animate-live-pulse" />}
          </div>

          <p className={cn('mt-1 text-[13px] leading-snug text-foreground', notification.read ? 'font-semibold' : 'font-bold')}>
            {title}
          </p>
          {body && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{body}</p>}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {notification.actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  if (!notification.read) onRead(notification.id);
                  onNavigate(action.tab);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                  action.variant !== 'ghost'
                    ? 'bg-forest text-white shadow-sm hover:brightness-110 dark:bg-emerald-600'
                    : 'border border-border bg-background/60 text-muted-foreground hover:text-foreground',
                )}
              >
                {t(action.labelKey)}
                <ArrowRight size={13} />
              </button>
            ))}
            {!notification.read && (
              <button
                onClick={() => onRead(notification.id)}
                className="rounded-lg px-2 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
              >
                {t('notif.action.markRead')}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          aria-label={t('notif.action.dismiss')}
          className="shrink-0 rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    </article>
  );
};
