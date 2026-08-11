import { readCache } from '@/lib/offline-cache';
import type { IWeatherModuleData } from '@/features/weather/domain/models/WeatherModels';
import {
  loadTasks,
  loadFarmExtras,
  loadEquipment,
  loadActivities,
} from '@/features/profile/dashboard/domain/digitalProfileStore';
import type { FarmerMemory } from './advisorTypes';

/**
 * Builds the advisor's FarmerMemory from everything the app knows about the
 * farmer: profile (farm + auth), weather cache, mandi cache, farm ledger,
 * past AI chats, store orders, tractor bookings, payments, tasks, equipment,
 * activity log and the notification center.
 */

interface ChatSessionLike { timestamp?: number }

interface LedgerEntry { id?: string; type?: string; amount?: number }

interface OrderLike { id?: string }
interface BookingLike { id?: string }
interface PaymentLike { id?: string }

interface NotificationLike { read?: boolean }

const dayMs = 24 * 60 * 60 * 1000;

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const readAuthMeta = (): { name: string; village: string; state: string } => {
  let name = '';
  let village = '';
  let state = '';
  try {
    const meta = readLocal<Record<string, unknown>>('agri_auth_meta', {});
    if (meta && Object.keys(meta).length > 0) {
      name = String(meta.full_name || '');
      village = String(meta.village || '');
      state = String(meta.state || '');
    }
  } catch { /* noop */ }
  // Fallback from the legacy supabase session holder used across the app
  try {
    const u = readLocal<Record<string, unknown>>('agri_user', {});
    name = name || String(u?.user_metadata?.full_name || '');
    village = village || String(u?.user_metadata?.village || '');
  } catch { /* noop */ }
  return {
    name: name || 'Farmer',
    village: village || 'Shivpuri',
    state: state || 'Madhya Pradesh',
  };
};

export function buildFarmerMemory(): FarmerMemory {
  const farmProfile = readLocal<{
    crop?: string; variety?: string; stage?: string; farmArea?: number; soilType?: string;
  }>('agri_farm_profile', {});

  let weather: IWeatherModuleData | null = null;
  try { weather = readCache<IWeatherModuleData>('weather:home'); } catch { weather = null; }

  const mandi = readLocal<Array<{ crop?: string; price?: number; change?: string; status?: string; market?: string }>>('agri_mandi_snapshot', []);

  const ledger = readLocal<LedgerEntry[]>('farm_ledger', []);
  const sessions = readLocal<ChatSessionLike[]>('kisan_chat_sessions', []);
  const orders = readLocal<OrderLike[]>('agri_orders', []);
  const bookings = readLocal<BookingLike[]>('tractor_bookings', []);
  const payments = readLocal<{ transactions?: PaymentLike[] }>('agri_payments_v1', {});
  const notifications = readLocal<{ items?: NotificationLike[] }>('agri_notifications_v1', {});

  const tasks = loadTasks();
  const extras = loadFarmExtras();
  const equipment = loadEquipment(null);
  const activities = loadActivities();

  const incomeTotal = ledger.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expenseTotal = ledger.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const lastChatAt = sessions
    .map((s) => Number(s.timestamp) || 0)
    .filter(Boolean)
    .sort((a, b) => b - a)[0] ?? null;

  const scanCount = activities.filter((a) => a.kind === 'scan').length;
  const chatCount = sessions.length;
  const pendingTasks = tasks.filter((t) => !t.done).length;

  const harvestDays = extras.expectedHarvestDate
    ? Math.ceil((new Date(`${extras.expectedHarvestDate}T00:00:00`).getTime() - Date.now()) / dayMs)
    : null;

  const crop = farmProfile.crop || 'Soybean';
  const stage = farmProfile.stage || 'Flowering';
  const area = farmProfile.farmArea || 5.2;

  // Data completeness — drives confidence across every recommendation.
  const checks = [
    !!farmProfile.crop && !!farmProfile.stage,
    !!weather && !!weather.daily && weather.daily.length > 0,
    weather?.live != null,
    mandi.length > 0,
    ledger.length > 0,
    sessions.length > 0,
    tasks.length > 0,
    orders.length + bookings.length + (payments?.transactions?.length ?? 0) > 0,
    notifications?.items?.length ? true : false,
  ].filter(Boolean).length;
  const dataCompleteness = Math.round((checks / 9) * 100);

  return {
    farmer: readAuthMeta(),
    farm: {
      crop,
      variety: farmProfile.variety || 'JS-9560',
      stage,
      area,
      soilType: farmProfile.soilType || 'Black Soil',
    },
    weather: {
      temp: weather?.live?.temp ?? null,
      humidity: weather?.live?.humidity ?? null,
      rainChance: weather?.daily?.[0]?.rainProbability ?? null,
      minTemp: weather?.daily?.[0]?.minTemp ?? null,
      maxTemp: weather?.daily?.[0]?.maxTemp ?? null,
      condition: weather?.live?.condition ?? '',
      location: weather?.location?.district || weather?.location?.name || '',
      advisory: weather?.advisoryAlert?.message || null,
    },
    mandi: mandi
      .filter((m) => m && m.crop)
      .slice(0, 20)
      .map((m) => ({
        crop: m.crop!,
        price: Number(m.price) || 0,
        change: m.change || (m.status === 'up' ? '+' : m.status === 'down' ? '-' : '0'),
        status: m.status || 'stable',
        market: m.market || 'APMC',
      })),
    activities: {
      lastChatAt,
      chatCount,
      scanCount,
      orderCount: orders.length,
      bookingCount: bookings.length,
      paymentCount: payments?.transactions?.length ?? 0,
      expenseTotal,
      incomeTotal,
      ledgerEntries: ledger.length,
      taskCount: tasks.length,
      pendingTasks,
      unreadNotifications: (notifications?.items ?? []).filter((n) => !n.read).length,
      equipmentCount: equipment.length,
      harvestDays,
    },
    learned: {
      patterns: [],
      preferredAlerts: [],
      lastBriefDate: null,
      lastReportWeek: null,
    },
    dataCompleteness,
  };
}

/** Keeps persisted learning across regenerations. */
export function mergeLearning(prev: FarmerMemory | null, fresh: FarmerMemory): FarmerMemory {
  if (!prev) return fresh;
  return {
    ...fresh,
    learned: prev.learned,
  };
}

export function learnPattern(prev: FarmerMemory, patternKey: string): FarmerMemory {
  const patterns = prev.learned.patterns.includes(patternKey)
    ? prev.learned.patterns
    : [...prev.learned.patterns, patternKey];
  return { ...prev, learned: { ...prev.learned, patterns } };
}

export function recordAlertPreference(prev: FarmerMemory, typeKey: string): FarmerMemory {
  const preferredAlerts = prev.learned.preferredAlerts.includes(typeKey)
    ? prev.learned.preferredAlerts
    : [...prev.learned.preferredAlerts, typeKey];
  return { ...prev, learned: { ...prev.learned, preferredAlerts } };
}
