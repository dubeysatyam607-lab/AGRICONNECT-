import type {
  AppNotification,
  DndConfig,
  NotifCategory,
  NotifDelivery,
  NotifPrefs,
  NotifState,
  QueuedPush,
} from './notificationTypes';
import {
  NOTIF_QUEUE_KEY,
  NOTIF_SEED_VERSION,
  NOTIF_STORAGE_KEY,
  NOTIF_MAX_ITEMS,
  NOTIF_TTL_DAYS,
  PUSH_QUEUE_MAX,
} from './notificationTypes';
import { seedNotifications } from './notificationSeed';
import { currentLanguage, resolveKey } from '../../../i18n/translate';

/**
 * Intelligent Notification Store — local-first engine.
 * Persists to `agri_notifications_v1`, handles read/unread, dismiss, categories,
 * Do Not Disturb (holds notifications via smart scheduling), push (Web
 * Notification API) and an offline push queue flushed on reconnect.
 */

let state: NotifState | null = null;
const listeners = new Set<() => void>();

export const uid = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const nowIso = (): string => new Date().toISOString();

const defaultPrefs = (): NotifPrefs => ({
  categories: {
    weather: true,
    mandi: true,
    scheme: true,
    order: true,
    booking: true,
    payment: true,
    ai: true,
    task: true,
    reminder: true,
    system: true,
  },
  delivery: 'both',
  pushEnabled: false,
  dnd: { enabled: false, start: '22:00', end: '06:00', allowCritical: true },
});

export const seedState = (): NotifState => ({
  version: NOTIF_SEED_VERSION,
  items: seedNotifications(),
  prefs: defaultPrefs(),
  queue: [],
});

function load(): NotifState {
  if (state) return state;
  if (typeof window === 'undefined') {
    state = seedState();
    return state;
  }
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as NotifState) : null;
    if (parsed && parsed.version === NOTIF_SEED_VERSION && parsed.prefs && parsed.prefs.categories) {
      state = { ...seedState(), ...parsed, prefs: { ...defaultPrefs(), ...parsed.prefs } };
    } else {
      state = seedState();
    }
  } catch {
    state = seedState();
  }
  return state;
}

function persist(next: NotifState): void {
  state = next;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full — in-memory only */
  }
  listeners.forEach((l) => l());
}

export const emit = (): void => listeners.forEach((l) => l());

export const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getState = (): NotifState => load();

export const resetNotificationData = (): void => {
  persist(seedState());
  try {
    localStorage.removeItem(NOTIF_QUEUE_KEY);
  } catch { /* ignore */ }
};

/* ── time helpers ────────────────────────────────────────────────────────── */

const pad = (n: number): string => String(n).padStart(2, '0');

export const timeAgo = (iso: string, locale: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
};

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map((x) => Number(x) || 0);
  return h * 60 + m;
};

/** True when `now` falls inside the DND window. */
export const isInQuietHours = (dnd: DndConfig, now: Date = new Date()): boolean => {
  if (!dnd.enabled) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(dnd.start);
  const end = toMinutes(dnd.end);
  if (start === end) return true; // whole-day quiet
  if (start < end) return mins >= start && mins < end;
  // overnight window, e.g. 22:00 → 06:00
  return mins >= start || mins < end;
};

/** ISO timestamp when the current DND window ends. */
export const nextQuietEnd = (dnd: DndConfig, now: Date = new Date()): string => {
  const end = toMinutes(dnd.end);
  const d = new Date(now);
  if (toMinutes(dnd.start) < end) {
    // same-day window: end today unless already past it
    d.setHours(Math.floor(end / 60), end % 60, 0, 0);
    if (d.getTime() > now.getTime()) return d.toISOString();
    d.setDate(d.getDate() + 1);
  } else {
    d.setHours(Math.floor(end / 60), end % 60, 0, 0);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  }
  return d.toISOString();
};

/* ── derived selectors ───────────────────────────────────────────────────── */

const dueItems = (s: NotifState): AppNotification[] =>
  s.items
    .filter((n) => !n.dismissed && (!n.scheduledAt || new Date(n.scheduledAt).getTime() <= Date.now()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const getActiveNotifications = (s: NotifState = load()): AppNotification[] => dueItems(s);

export const getPendingNotifications = (s: NotifState = load()): AppNotification[] =>
  s.items
    .filter((n) => !n.dismissed && n.scheduledAt && new Date(n.scheduledAt).getTime() > Date.now())
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));

export const getUnreadCount = (s: NotifState = load()): number =>
  dueItems(s).filter((n) => !n.read).length;

export const getCategoryCounts = (s: NotifState = load()): Record<NotifCategory, number> => {
  const counts: Record<NotifCategory, number> = {
    weather: 0, mandi: 0, scheme: 0, order: 0, booking: 0,
    payment: 0, ai: 0, task: 0, reminder: 0, system: 0,
  };
  for (const n of dueItems(s)) counts[n.category] += 1;
  return counts;
};

/* ── push (Web Notification API) ─────────────────────────────────────────── */

export const pushSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

export const pushPermission = (): NotificationPermission | 'unsupported' =>
  pushSupported() ? Notification.permission : 'unsupported';

export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!pushSupported()) return 'unsupported';
  const p = await Notification.requestPermission();
  if (p === 'granted') flushQueuedPush();
  return p;
};

function showPush(n: AppNotification): boolean {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    const lang = currentLanguage();
    const title = resolveKey(lang, n.titleKey, n.params);
    const body = n.bodyKey ? resolveKey(lang, n.bodyKey, n.params) : undefined;
    const notif = new Notification(title, {
      body,
      tag: n.id,
      icon: '/agriconnect-icon-192.png',
      badge: '/agriconnect-icon-192.png',
    });
    notif.onclick = () => window.focus();
    return true;
  } catch {
    return false;
  }
}

export function enqueueQueuedPush(entry: QueuedPush): void {
  const s = load();
  const queue = [...s.queue, entry].slice(-PUSH_QUEUE_MAX);
  persist({ ...s, queue });
}

export function flushQueuedPush(): void {
  const s = load();
  if (s.queue.length === 0 || !pushSupported() || Notification.permission !== 'granted') return;
  const remaining: QueuedPush[] = [];
  const lang = currentLanguage();
  for (const q of s.queue) {
    try {
      const title = resolveKey(lang, q.titleKey, q.params);
      const body = q.bodyKey ? resolveKey(lang, q.bodyKey, q.params) : undefined;
      const notif = new Notification(title, {
        body,
        tag: q.tag,
        icon: '/agriconnect-icon-192.png',
        badge: '/agriconnect-icon-192.png',
      });
      notif.onclick = () => window.focus();
    } catch {
      remaining.push(q);
    }
  }
  persist({ ...s, queue: remaining });
}

/* ── mutations ───────────────────────────────────────────────────────────── */

export interface PushInput {
  category: NotifCategory;
  severity?: NotifSeverity;
  titleKey: string;
  bodyKey?: string;
  params?: Record<string, string | number>;
  delivery?: NotifDelivery;
  actions: { id: string; labelKey: string; tab: string; variant?: 'primary' | 'ghost' }[];
  dedupeKey?: string;
  /** Ignore Do Not Disturb (always deliver immediately). */
  critical?: boolean;
  scheduleAt?: string;
}

export function pushNotification(input: PushInput): AppNotification | null {
  const s = load();
  const category = input.category;

  if (s.prefs.categories[category] === false) return null;

  if (input.dedupeKey) {
    const existing = s.items.some(
      (n) => n.dedupeKey === input.dedupeKey && n.createdAt.startsWith(new Date().toISOString().slice(0, 10)),
    );
    if (existing) return null;
  }

  const critical = input.critical || input.severity === 'critical';
  let scheduledAt = input.scheduleAt;
  if (!scheduledAt && s.prefs.dnd.enabled && isInQuietHours(s.prefs.dnd) && !(critical && s.prefs.dnd.allowCritical)) {
    scheduledAt = nextQuietEnd(s.prefs.dnd);
  }

  const severity = input.severity ?? 'info';
  const delivery = input.delivery ?? s.prefs.delivery;

  const notification: AppNotification = {
    id: uid(),
    category,
    severity,
    titleKey: input.titleKey,
    bodyKey: input.bodyKey,
    params: input.params,
    createdAt: nowIso(),
    read: false,
    dismissed: false,
    delivery,
    pushSent: false,
    actions: input.actions,
    dedupeKey: input.dedupeKey,
    scheduledAt,
  };

  // Deliver push now if due, enabled, and permitted; otherwise queue it.
  const wantsPush = delivery !== 'in-app' && s.prefs.pushEnabled;
  if (wantsPush && !scheduledAt) {
    if (showPush(notification)) notification.pushSent = true;
    else enqueueQueuedPush({
      id: notification.id,
      titleKey: notification.titleKey,
      bodyKey: notification.bodyKey,
      params: notification.params,
      tag: notification.id,
      createdAt: notification.createdAt,
    });
  }

  const next: NotifState = { ...s, items: [notification, ...s.items].slice(0, NOTIF_MAX_ITEMS) };
  persist(next);
  return notification;
}

export const markRead = (id: string): void => {
  const s = load();
  persist({ ...s, items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) });
};

export const markAllRead = (): void => {
  const s = load();
  persist({ ...s, items: s.items.map((n) => ({ ...n, read: true })) });
};

export const markCategoryRead = (category: NotifCategory): void => {
  const s = load();
  persist({ ...s, items: s.items.map((n) => (n.category === category ? { ...n, read: true } : n)) });
};

export const dismissNotification = (id: string): void => {
  const s = load();
  persist({ ...s, items: s.items.filter((n) => n.id !== id) });
};

/** Remove notifications already read — keeps unread ones. */
export const clearRead = (): void => {
  const s = load();
  persist({ ...s, items: s.items.filter((n) => !n.read) });
};

export const dismissAll = (): void => {
  const s = load();
  persist({ ...s, items: [] });
};

export const clearAll = (): void => {
  const s = load();
  persist({ ...s, items: [] });
};

export const setCategoryPref = (category: NotifCategory, enabled: boolean): void => {
  const s = load();
  persist({ ...s, prefs: { ...s.prefs, categories: { ...s.prefs.categories, [category]: enabled } } });
};

export const setDelivery = (delivery: NotifDelivery): void => {
  const s = load();
  persist({ ...s, prefs: { ...s.prefs, delivery } });
};

export const setPushEnabled = (enabled: boolean): void => {
  const s = load();
  persist({ ...s, prefs: { ...s.prefs, pushEnabled: enabled } });
};

export const setDnd = (dnd: DndConfig): void => {
  const s = load();
  persist({ ...s, prefs: { ...s.prefs, dnd } });
};

/** Promote due scheduled notifications (called by the scheduler). */
export function promoteDue(): number {
  const s = load();
  const now = Date.now();
  let promoted = 0;
  const items = s.items.map((n) => {
    if (n.scheduledAt && new Date(n.scheduledAt).getTime() <= now) {
      promoted += 1;
      const { scheduledAt, ...rest } = n;
      void scheduledAt;
      return rest;
    }
    return n;
  });
  if (promoted > 0) persist({ ...s, items });
  return promoted;
}

/** Remove old read/dismissed notifications beyond the TTL. */
export function pruneOld(): number {
  const s = load();
  const cutoff = Date.now() - NOTIF_TTL_DAYS * 24 * 60 * 60 * 1000;
  const items = s.items.filter((n) => new Date(n.createdAt).getTime() >= cutoff || !n.read);
  const removed = s.items.length - items.length;
  if (removed > 0) persist({ ...s, items });
  return removed;
}
