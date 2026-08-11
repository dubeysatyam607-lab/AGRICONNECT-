/**
 * Intelligent Notification System — domain types.
 * Local-first, bilingual (i18n keys + params), deep-linkable, push + in-app.
 */

export type NotifCategory =
  | 'weather'
  | 'mandi'
  | 'scheme'
  | 'order'
  | 'booking'
  | 'payment'
  | 'ai'
  | 'task'
  | 'reminder'
  | 'system';

export type NotifSeverity = 'info' | 'alert' | 'critical';

export type NotifDelivery = 'in-app' | 'push' | 'both';

/** A single tap-through action — deep links to an app tab. */
export interface NotifAction {
  id: string;
  labelKey: string;
  tab: string;
  variant?: 'primary' | 'ghost';
}

export interface AppNotification {
  id: string;
  category: NotifCategory;
  severity: NotifSeverity;
  titleKey: string;
  bodyKey?: string;
  /** Interpolation params for title/body, e.g. { crop, price }. */
  params?: Record<string, string | number>;
  createdAt: string; // ISO
  read: boolean;
  dismissed: boolean;
  delivery: NotifDelivery;
  pushSent: boolean;
  actions: NotifAction[];
  /** Used to avoid re-emitting the same logical event (e.g. "rain-2026-08-06"). */
  dedupeKey?: string;
  /** If set and in the future the item is "scheduled" (held by Do Not Disturb / smart scheduling). */
  scheduledAt?: string;
}

/** Quiet-hours config (24h format "HH:mm"). end <= start means "until midnight". */
export interface DndConfig {
  enabled: boolean;
  start: string; // "22:00"
  end: string;   // "06:00"
  allowCritical: boolean;
}

export interface NotifPrefs {
  categories: Record<NotifCategory, boolean>;
  delivery: NotifDelivery;
  pushEnabled: boolean;
  dnd: DndConfig;
}

export interface QueuedPush {
  id: string;
  titleKey: string;
  bodyKey?: string;
  params?: Record<string, string | number>;
  tag: string;
  createdAt: string;
}

export interface NotifState {
  version: number;
  items: AppNotification[];
  prefs: NotifPrefs;
  queue: QueuedPush[];
}

export const NOTIF_STORAGE_KEY = 'agri_notifications_v1';
export const NOTIF_QUEUE_KEY = 'agri_push_queue_v1';
export const NOTIF_SEED_VERSION = 1;
export const NOTIF_MAX_ITEMS = 60;
export const NOTIF_TTL_DAYS = 7;
export const PUSH_QUEUE_MAX = 20;
