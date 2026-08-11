import React, { useMemo, useState } from 'react';
import {
  Bell, BellOff, BellRing, CheckCheck, Moon, Settings2, CloudSun, TrendingUp,
  Landmark, ShoppingBag, Tractor, Wallet, Bot, ListChecks, Droplets, Info,
  VolumeX, WifiOff, Trash2, Sparkles, ChevronRight,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from './hooks/useNotifications';
import { NotificationCard } from './components/NotificationCard';
import {
  getState, markRead, markAllRead, markCategoryRead, dismissNotification,
  clearRead, dismissAll, setCategoryPref, setDelivery, setPushEnabled, setDnd,
  pushPermission, requestPushPermission, isInQuietHours, resetNotificationData,
} from '../domain/notificationStore';
import type { NotifCategory, NotifDelivery } from '../domain/notificationTypes';

const CATEGORY_ICONS: Record<NotifCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  weather: CloudSun,
  mandi: TrendingUp,
  scheme: Landmark,
  order: ShoppingBag,
  booking: Tractor,
  payment: Wallet,
  ai: Bot,
  task: ListChecks,
  reminder: Droplets,
  system: Info,
};

const ALL_CATEGORIES: NotifCategory[] = [
  'weather', 'mandi', 'scheme', 'order', 'booking', 'payment', 'ai', 'task', 'reminder', 'system',
];

const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: `${String(h).padStart(2, '0')}:00`, label: `${String(h).padStart(2, '0')}:00` }));

interface NotificationCenterProps {
  onNavigate: (tab: string) => void;
  onToast?: (message: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate, onToast }) => {
  const { t } = useLanguage();
  const { notifications, pending, unread, queue, categories } = useNotifications();
  const prefs = getState().prefs;

  const [filter, setFilter] = useState<NotifCategory | 'all' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);

  const inQuietHours = isInQuietHours(prefs.dnd);
  const permission = pushPermission();

  const visibleCategories = useMemo(
    () => ALL_CATEGORIES.filter((c) => categories[c] > 0),
    [categories],
  );

  const list = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    if (filter === 'all') return notifications;
    return notifications.filter((n) => n.category === filter);
  }, [notifications, filter]);

  const handleAction = (notificationId: string, tab: string) => {
    markRead(notificationId);
    onNavigate(tab);
  };

  const handleRequestPush = async () => {
    const p = await requestPushPermission();
    if (p === 'granted') setPushEnabled(true);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-36 pt-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl gradient-hero text-primary-foreground shadow-colorful">
            <Bell size={19} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                {unread}
              </span>
            )}
          </span>
          <div>
            <h1 className="font-display text-xl font-black tracking-tight text-foreground">{t('notif.center.title')}</h1>
            <p className="text-xs font-semibold text-muted-foreground">
              {unread > 0
                ? `${unread} ${t('notif.center.unread')}`
                : t('notif.center.allRead')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-background/60 px-2.5 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck size={14} />
              {t('notif.center.markAll')}
            </button>
          )}
          <button
            onClick={() => setShowSettings((s) => !s)}
            aria-label={t('notif.center.settings')}
            className={cn(
              'rounded-xl border p-2 transition-colors',
              showSettings ? 'border-forest bg-forest text-primary-foreground' : 'border-border bg-background/60 text-muted-foreground hover:text-foreground',
            )}
          >
            <Settings2 size={16} />
          </button>
        </div>
      </header>

      {/* Status strip */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BellRing size={14} className="text-sky-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">{t('notif.center.unread')}</span>
          </div>
          <p className="mt-1 text-xl font-black text-foreground">{unread}</p>
        </div>
        <button
          onClick={() => setDnd({ ...prefs.dnd, enabled: !prefs.dnd.enabled })}
          className={cn(
            'rounded-2xl border p-3 text-left shadow-card transition-colors',
            inQuietHours ? 'border-indigo-400/60 bg-indigo-500/10' : 'border-border bg-card',
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Moon size={14} className={inQuietHours ? 'text-indigo-500' : ''} />
            <span className="text-[10px] font-black uppercase tracking-wider">DND</span>
          </div>
          <p className={cn('mt-1 text-sm font-black', inQuietHours ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground')}>
            {prefs.dnd.enabled ? t('notif.center.dndOn') : t('notif.center.dndOff')}
          </p>
        </button>
        <div className={cn('rounded-2xl border border-border bg-card p-3 shadow-card', queue > 0 && 'border-orange-400/50')}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <WifiOff size={14} className={queue > 0 ? 'text-orange-500' : ''} />
            <span className="text-[10px] font-black uppercase tracking-wider">{t('notif.center.queue')}</span>
          </div>
          <p className="mt-1 text-xl font-black text-foreground">{queue}</p>
        </div>
      </div>

      {inQuietHours && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <VolumeX size={14} />
          {t('notif.center.quietActive')}
        </div>
      )}
      {queue > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-700 dark:text-orange-300">
          <WifiOff size={14} />
          {interpolate(t('notif.center.offlineNote'), { count: queue })}
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <section className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <Settings2 size={16} className="text-muted-foreground" />
            <h2 className="font-display text-sm font-black text-foreground">{t('notif.center.settings')}</h2>
          </div>

          {/* Delivery */}
          <div>
            <p className="mb-2 text-xs font-bold text-muted-foreground">{t('notif.center.delivery')}</p>
            <div className="grid grid-cols-3 gap-2">
              {(['in-app', 'push', 'both'] as NotifDelivery[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDelivery(d)}
                  className={cn(
                    'rounded-xl border px-2 py-2 text-xs font-bold transition-colors',
                    prefs.delivery === d
                      ? 'border-forest bg-forest text-primary-foreground'
                      : 'border-border bg-background/60 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`notif.center.delivery.${d}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Push */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">{t('notif.center.push')}</p>
              <p className="text-[11px] text-muted-foreground">{t('notif.center.pushHint')}</p>
            </div>
            <Switch
              checked={prefs.pushEnabled && permission === 'granted'}
              onCheckedChange={(on) => {
                if (on) void handleRequestPush();
                else setPushEnabled(false);
              }}
            />
          </div>
          {permission === 'denied' && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              {t('notif.center.permissionDenied')}
            </p>
          )}

          {/* Do Not Disturb */}
          <div className="rounded-xl border border-border bg-background/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Moon size={15} className={prefs.dnd.enabled ? 'text-indigo-500' : 'text-muted-foreground'} />
                <div>
                  <p className="text-sm font-bold text-foreground">{t('notif.center.dnd')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('notif.center.dndHint')}</p>
                </div>
              </div>
              <Switch checked={prefs.dnd.enabled} onCheckedChange={(on) => setDnd({ ...prefs.dnd, enabled: on })} />
            </div>
            {prefs.dnd.enabled && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t('notif.center.from')}</span>
                  <Select
                    value={prefs.dnd.start}
                    onValueChange={(v) => setDnd({ ...prefs.dnd, start: v })}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t('notif.center.to')}</span>
                  <Select
                    value={prefs.dnd.end}
                    onValueChange={(v) => setDnd({ ...prefs.dnd, end: v })}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                  </Select>
                </label>
                <div className="col-span-2 flex items-center justify-between pt-1">
                  <p className="text-xs font-semibold text-muted-foreground">{t('notif.center.allowCritical')}</p>
                  <Switch checked={prefs.dnd.allowCritical} onCheckedChange={(on) => setDnd({ ...prefs.dnd, allowCritical: on })} />
                </div>
              </div>
            )}
          </div>

          {/* Category toggles */}
          <div>
            <p className="mb-2 text-xs font-bold text-muted-foreground">{t('notif.center.categories')}</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const enabled = prefs.categories[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryPref(cat, !enabled)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                      enabled ? 'border-border bg-background/60' : 'border-border bg-muted/40 opacity-50',
                    )}
                  >
                    <Icon size={15} className={enabled ? 'text-forest' : 'text-muted-foreground'} />
                    <span className="text-xs font-bold text-foreground">{t(`notif.category.${cat}`)}</span>
                    {categories[cat] > 0 && <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] font-black text-muted-foreground">{categories[cat]}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <button
              onClick={clearRead}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <Trash2 size={13} />
              {t('notif.center.clearRead')}
            </button>
            <button
              onClick={() => { dismissAll(); onToast?.(t('notif.center.cleared')); }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <BellOff size={13} />
              {t('notif.center.clearAll')}
            </button>
            <button
              onClick={() => { resetNotificationData(); onToast?.(t('notif.center.reseeded')); }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <Sparkles size={13} />
              {t('notif.center.reseeded')}
            </button>
          </div>
        </section>
      )}

      {/* Filter chips */}
      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
            filter === 'all' ? 'bg-forest text-primary-foreground' : 'border border-border bg-card text-muted-foreground',
          )}
        >
          {t('notif.center.filters.all')}
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
            filter === 'unread' ? 'bg-forest text-primary-foreground' : 'border border-border bg-card text-muted-foreground',
          )}
        >
          {t('notif.center.filters.unread')}
          {unread > 0 && <span className="ml-1.5 rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white">{unread}</span>}
        </button>
        {visibleCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(filter === cat ? 'all' : cat)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
              filter === cat ? 'bg-forest text-primary-foreground' : 'border border-border bg-card text-muted-foreground',
            )}
          >
            {t(`notif.category.${cat}`)}
          </button>
        ))}
      </div>

      {/* Pending (scheduled / DND-held) */}
      {pending.length > 0 && (
        <section className="mt-4" aria-label={t('notif.center.scheduled')}>
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            <Moon size={12} className="text-indigo-500" />
            {t('notif.center.scheduledList')}
            <span className="rounded-full bg-indigo-500/15 px-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400">{pending.length}</span>
          </h2>
          <div className="space-y-2.5">
            {pending.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onNavigate={onNavigate}
                onRead={markRead}
                onDismiss={dismissNotification}
              />
            ))}
          </div>
        </section>
      )}

      {/* List */}
      <section className="mt-4 space-y-2.5" aria-label={t('notif.center.title')}>
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
            <BellRing size={36} className="mb-3 text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">{t('notif.center.empty')}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t('notif.center.emptyHint')}</p>
          </div>
        ) : (
          list.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onNavigate={(tab) => handleAction(n.id, tab)}
              onRead={markRead}
              onDismiss={dismissNotification}
            />
          ))
        )}
      </section>

      {visibleCategories.length > 0 && (
        <button
          onClick={() => visibleCategories.forEach((c) => markCategoryRead(c))}
          className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          {t('notif.center.markCategoryRead')}
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
};
