import { readCache } from '@/lib/offline-cache';
import type { IWeatherModuleData } from '@/features/weather/domain/models/WeatherModels';
import {
  loadTasks,
  loadFarmExtras,
  type DigitalTask,
} from '@/features/profile/dashboard/domain/digitalProfileStore';
import {
  pushNotification,
  promoteDue,
  pruneOld,
  flushQueuedPush,
} from './notificationStore';

/**
 * Smart Notification Scheduler.
 * Generates personalized notifications from real on-device data: cached
 * weather, mandi prices, planned farm tasks, farm extras, payments, store
 * orders and tractor bookings. All emits are deduped per logical key + day so
 * the scheduler is idempotent and safe to run on every app open / interval.
 */

interface CropPriceLike {
  crop?: string;
  price?: number;
  status?: string;
  change?: string;
  market?: string;
}

interface OrderLike {
  id?: string;
  status?: string;
  paymentStatus?: string;
  placedAt?: string;
}

interface BookingLike {
  id?: string;
  tractorName?: string;
  status?: string;
  createdAt?: string;
}

const todayKey = (): string => new Date().toISOString().slice(0, 10);
const weekKey = (): string => {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
};
const monthKey = (): string => new Date().toISOString().slice(0, 7);

const dayOfYear = (): number => {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
};

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const actionView = (tab: string) => ({ id: 'view', labelKey: 'notif.action.view', tab, variant: 'primary' as const });

/* ── Weather: rain / heat / frost alerts from the cached forecast ────────── */

function generateWeatherAlerts(): void {
  let weather: IWeatherModuleData | null = null;
  try {
    weather = readCache<IWeatherModuleData>('weather:home');
  } catch {
    weather = null;
  }
  if (!weather || !weather.daily || weather.daily.length === 0) return;

  const place = weather.location?.district || weather.location?.name || 'Your district';
  const today = weather.daily[0];

  if (today.rainProbability >= 70) {
    pushNotification({
      category: 'weather',
      severity: 'alert',
      titleKey: 'notif.rain.title',
      bodyKey: 'notif.rain.body',
      params: { place, rain: today.rainProbability },
      dedupeKey: `rain-${todayKey()}`,
      actions: [actionView('home')],
    });
  }
  if ((weather.live?.temp ?? 0) >= 40 || today.maxTemp >= 42) {
    pushNotification({
      category: 'weather',
      severity: 'critical',
      titleKey: 'notif.heat.title',
      bodyKey: 'notif.heat.body',
      params: { place, temp: Math.round(Math.max(weather.live?.temp ?? 0, today.maxTemp)) },
      dedupeKey: `heat-${todayKey()}`,
      actions: [actionView('home')],
    });
  }
  if (today.minTemp <= 4) {
    pushNotification({
      category: 'weather',
      severity: 'alert',
      titleKey: 'notif.frost.title',
      bodyKey: 'notif.frost.body',
      params: { place, temp: Math.round(today.minTemp) },
      dedupeKey: `frost-${todayKey()}`,
      actions: [actionView('home')],
    });
  }
  if (weather.advisoryAlert) {
    pushNotification({
      category: 'weather',
      severity: weather.advisoryAlert.isCritical ? 'critical' : 'alert',
      titleKey: 'notif.weatherUpdate.title',
      bodyKey: 'notif.weatherUpdate.body',
      params: { place },
      dedupeKey: `adv-${todayKey()}`,
      actions: [actionView('home')],
    });
  }
}

/* ── Mandi: notable movers from the cached APMC prices ───────────────────── */

function generateMandiAlerts(): void {
  let cached: CropPriceLike[] | null = null;
  try {
    cached = readCache<CropPriceLike[]>('mandi:prices');
  } catch {
    cached = null;
  }
  const list = cached || [];
  if (list.length === 0) return;

  const movers = list
    .filter((p) => p && p.crop && p.status && (p.status === 'up' || p.status === 'down'))
    .sort((a, b) => Math.abs(Number(b.change?.replace(/[^\d]/g, '') || 0)) - Math.abs(Number(a.change?.replace(/[^\d]/g, '') || 0)))
    .slice(0, 2);

  for (const mover of movers) {
    const up = mover.status === 'up';
    pushNotification({
      category: 'mandi',
      severity: 'alert',
      titleKey: up ? 'notif.mandiUp.title' : 'notif.mandiDown.title',
      bodyKey: up ? 'notif.mandiUp.body' : 'notif.mandiDown.body',
      params: {
        crop: mover.crop!,
        price: (mover.price ?? 0).toLocaleString('en-IN'),
        change: mover.change || (up ? '+' : '-'),
        market: mover.market || 'APMC',
      },
      dedupeKey: `mandi-${mover.crop}-${todayKey()}`,
      actions: [
        actionView('mandi'),
        { id: 'alert', labelKey: 'notif.action.manage', tab: 'price-alerts', variant: 'ghost' },
      ],
    });
  }
}

/* ── Schemes: curated deadlines (day-of-month based, checks month window) ── */

interface SchemeDeadline { id: string; nameKey: string; dayOfMonth: number; monthsAhead: number; tab: string }

const SCHEMES: SchemeDeadline[] = [
  { id: 'pmkisan', nameKey: 'notif.schemePmkisan', dayOfMonth: 5, monthsAhead: 1, tab: 'schemes' },
  { id: 'kcc', nameKey: 'notif.schemeKcc', dayOfMonth: 18, monthsAhead: 1, tab: 'loans' },
  { id: 'pmfby', nameKey: 'notif.schemePmfby', dayOfMonth: 10, monthsAhead: 1, tab: 'insurance' },
];

function generateSchemeAlerts(): void {
  const now = new Date();
  for (const scheme of SCHEMES) {
    const target = new Date(now.getFullYear(), now.getMonth() + scheme.monthsAhead, scheme.dayOfMonth);
    const days = Math.ceil((target.getTime() - now.getTime()) / 86400000);
    if (days > 0 && days <= 10) {
      pushNotification({
        category: 'scheme',
        severity: days <= 3 ? 'critical' : 'alert',
        titleKey: 'notif.schemeDeadline.title',
        bodyKey: 'notif.schemeDeadline.body',
        params: { scheme: `i18n:${scheme.nameKey}`, days },
        dedupeKey: `scheme-${scheme.id}-${monthKey()}`,
        actions: [actionView(scheme.tab)],
      });
    }
  }
}

/* ── Farm tasks: planned tasks due within 2 days ─────────────────────────── */

function generateTaskAlerts(): void {
  const tasks: DigitalTask[] = loadTasks();
  if (tasks.length === 0) return;
  const now = new Date();
  const today = todayKey();
  for (const task of tasks) {
    if (task.done || !task.date) continue;
    const days = Math.ceil((new Date(`${task.date}T00:00:00`).getTime() - now.getTime()) / 86400000);
    if (days >= 0 && days <= 2) {
      pushNotification({
        category: 'task',
        severity: days === 0 ? 'critical' : 'alert',
        titleKey: 'notif.taskDue.title',
        bodyKey: days === 0 ? 'notif.taskDueToday.body' : 'notif.taskDue.body',
        params: { task: task.label, days },
        dedupeKey: `task-${task.id}-${today}`,
        actions: [actionView('crop-calendar')],
      });
    }
  }
}

/* ── Farm reminders: harvest window + irrigation/fertilizer/spraying cycle ── */

function generateFarmReminders(): void {
  const extras = loadFarmExtras();

  if (extras.expectedHarvestDate) {
    const days = Math.ceil((new Date(`${extras.expectedHarvestDate}T00:00:00`).getTime() - Date.now()) / 86400000);
    if (days >= 0 && days <= 30) {
      pushNotification({
        category: 'reminder',
        severity: days <= 7 ? 'alert' : 'info',
        titleKey: 'notif.harvest.title',
        bodyKey: 'notif.harvest.body',
        params: { days, date: extras.expectedHarvestDate },
        dedupeKey: `harvest-${weekKey()}`,
        actions: [actionView('crop-calendar')],
      });
    }
  }

  const doy = dayOfYear();
  const type = doy % 10 === 0 ? 'spray' : doy % 7 === 0 ? 'fert' : doy % 3 === 0 ? 'irr' : null;
  if (!type) return;
  const map = {
    irr: { titleKey: 'notif.irrigation.title', bodyKey: 'notif.irrigation.body' },
    fert: { titleKey: 'notif.fertilizer.title', bodyKey: 'notif.fertilizer.body' },
    spray: { titleKey: 'notif.spraying.title', bodyKey: 'notif.spraying.body' },
  }[type];
  pushNotification({
    category: 'reminder',
    severity: 'info',
    titleKey: map.titleKey,
    bodyKey: map.bodyKey,
    params: { crop: 'your crop', day: new Date().toLocaleDateString('en-IN', { weekday: 'long' }) },
    dedupeKey: `${type}-${todayKey()}`,
    actions: [actionView('crop-calendar')],
  });
}

/* ── Payments: status changes from the local ledger ──────────────────────── */

interface PaymentTxnLike {
  id?: string;
  status?: string;
  amount?: number;
  total?: number;
  description?: string;
  initiatedAt?: string;
}

function generatePaymentAlerts(): void {
  const parsed = readLocal<{ transactions?: PaymentTxnLike[] }>('agri_payments_v1', {});
  const txns = (parsed.transactions || []).filter(Boolean).slice(0, 12);
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

  for (const txn of txns) {
    if (!txn.id || !txn.status) continue;
    const when = txn.initiatedAt ? new Date(txn.initiatedAt).getTime() : Date.now();
    if (when < threeDaysAgo) continue;
    const amount = txn.total ?? txn.amount ?? 0;
    const amountStr = `₹${amount.toLocaleString('en-IN')}`;
    const status = String(txn.status).toLowerCase();

    if (status.includes('refund')) {
      pushNotification({
        category: 'payment',
        severity: 'info',
        titleKey: 'notif.refundProcessed.title',
        bodyKey: 'notif.refundProcessed.body',
        params: { amount: amountStr },
        dedupeKey: `pay-refund-${txn.id}`,
        actions: [actionView('wallet')],
      });
    } else if (status === 'success' || status === 'paid') {
      pushNotification({
        category: 'payment',
        severity: 'info',
        titleKey: 'notif.paymentSuccess.title',
        bodyKey: 'notif.paymentSuccess.body',
        params: { amount: amountStr },
        dedupeKey: `pay-success-${txn.id}`,
        actions: [actionView('wallet')],
      });
    } else if (status === 'failed') {
      pushNotification({
        category: 'payment',
        severity: 'critical',
        titleKey: 'notif.paymentFailed.title',
        bodyKey: 'notif.paymentFailed.body',
        params: { amount: amountStr },
        dedupeKey: `pay-failed-${txn.id}`,
        actions: [
          { id: 'retry', labelKey: 'notif.action.retry', tab: 'wallet', variant: 'primary' },
          actionView('wallet'),
        ],
      });
    }
  }
}

/* ── Store orders: shipping / delivered status ───────────────────────────── */

function generateOrderAlerts(): void {
  const orders: OrderLike[] = readLocal<OrderLike[]>('agri_orders', []);
  if (orders.length === 0) return;
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  for (const order of orders) {
    if (!order.id || !order.status) continue;
    const when = order.placedAt ? new Date(order.placedAt).getTime() : Date.now();
    if (when < threeDaysAgo) continue;
    const status = String(order.status).toLowerCase();
    const orderNo = String(order.id);
    if (status.includes('ship')) {
      pushNotification({
        category: 'order',
        severity: 'info',
        titleKey: 'notif.orderShipped.title',
        bodyKey: 'notif.orderShipped.body',
        params: { order: orderNo },
        dedupeKey: `order-${order.id}`,
        actions: [actionView('store')],
      });
    } else if (status.includes('deliver')) {
      pushNotification({
        category: 'order',
        severity: 'info',
        titleKey: 'notif.orderDelivered.title',
        bodyKey: 'notif.orderDelivered.body',
        params: { order: orderNo },
        dedupeKey: `order-${order.id}`,
        actions: [actionView('store')],
      });
    }
  }
}

/* ── Tractor bookings: confirmation + reminder ───────────────────────────── */

function generateBookingAlerts(): void {
  const bookings: BookingLike[] = readLocal<BookingLike[]>('tractor_bookings', []);
  if (bookings.length === 0) return;
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  for (const booking of bookings) {
    if (!booking.id || !booking.status) continue;
    const when = booking.createdAt ? new Date(booking.createdAt).getTime() : Date.now();
    if (when < threeDaysAgo) continue;
    const status = String(booking.status).toLowerCase();
    const name = booking.tractorName || 'Tractor';
    if (status.includes('confirm') || status.includes('approved') || status.includes('active')) {
      pushNotification({
        category: 'booking',
        severity: 'info',
        titleKey: 'notif.bookingConfirmed.title',
        bodyKey: 'notif.bookingConfirmed.body',
        params: { tractor: name },
        dedupeKey: `booking-${booking.id}`,
        actions: [actionView('tractors')],
      });
    }
  }
}

/* ── Run everything ──────────────────────────────────────────────────────── */

export function runNotificationScheduler(): void {
  if (typeof window === 'undefined') return;
  try { pruneOld(); } catch { /* noop */ }
  try { promoteDue(); } catch { /* noop */ }
  try { generateWeatherAlerts(); } catch { /* noop */ }
  try { generateMandiAlerts(); } catch { /* noop */ }
  try { generateSchemeAlerts(); } catch { /* noop */ }
  try { generateTaskAlerts(); } catch { /* noop */ }
  try { generateFarmReminders(); } catch { /* noop */ }
  try { generatePaymentAlerts(); } catch { /* noop */ }
  try { generateOrderAlerts(); } catch { /* noop */ }
  try { generateBookingAlerts(); } catch { /* noop */ }
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) flushQueuedPush();
  } catch { /* noop */ }
}
