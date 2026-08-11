import type { IFarmerProfile } from '../../domain/models/FarmerProfile';

/**
 * Digital Farmer Profile — local-first store.
 * Extends the existing on-device data (IFarmerProfile, FarmContext, onboarding,
 * tractor bookings, farm ledger, today tasks) with the extra state the profile
 * control panel manages: farm extras, equipment registry, planned tasks,
 * activities, invoices, and notification preferences.
 */

export type EquipmentStatus = 'Owned' | 'Leased' | 'For Rent';
export type EquipmentCondition = 'Excellent' | 'Good' | 'Fair' | 'Needs Repair';

export interface DigitalEquipment {
  id: string;
  name: string;
  category: string;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  since: string;
  notes?: string;
}

export type TaskSource = 'planned' | 'ai' | 'legacy';

export interface DigitalTask {
  id: string;
  label: string;
  date: string; // yyyy-mm-dd
  done: boolean;
  source: TaskSource;
}

export type ActivityKind = 'scan' | 'chat' | 'weather' | 'article' | 'scheme' | 'bookmark';

export interface DigitalActivity {
  id: string;
  kind: ActivityKind;
  title: string;
  date: string;
  meta?: string;
}

export interface Invoice {
  id: string;
  title: string;
  amount: number;
  date: string;
  paid: boolean;
}

export interface NotificationPrefs {
  weather: boolean;
  market: boolean;
  scheme: boolean;
  booking: boolean;
  ai: boolean;
}

export interface FarmExtras {
  farmName: string;
  ownership: string;
  expectedHarvestDate: string; // yyyy-mm-dd
}

const KEYS = {
  equipment: 'agri_digital_equipment_v1',
  tasks: 'agri_digital_tasks_v1',
  activity: 'agri_digital_activity_v1',
  invoices: 'agri_digital_invoices_v1',
  notif: 'agri_digital_notif_v1',
  farmExtras: 'agri_digital_farm_v1',
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full — fail silently */
  }
}

export const uid = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isoDaysFromNow = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

/* ── Farm extras ─────────────────────────────────────────────────────────── */

const seedFarmExtras = (): FarmExtras => ({
  farmName: 'My Farm',
  ownership: 'Owned',
  expectedHarvestDate: isoDaysFromNow(45),
});

export const loadFarmExtras = (): FarmExtras => load<FarmExtras>(KEYS.farmExtras, seedFarmExtras());
export const saveFarmExtras = (extras: FarmExtras): void => save(KEYS.farmExtras, extras);

/* ── Equipment registry ──────────────────────────────────────────────────── */

export const seedEquipment = (profile: IFarmerProfile | null): DigitalEquipment[] => {
  const owned = profile?.machineryOwned ?? [];
  if (owned.length === 0) {
    return [
      { id: uid(), name: 'Mahindra 575 DI', category: 'Tractor', status: 'Owned', condition: 'Good', since: '2019', notes: '45 HP, 2WD — used for all field operations.' },
      { id: uid(), name: 'Rotavator 4FT', category: 'Rotavator', status: 'For Rent', condition: 'Good', since: '2021' },
    ];
  }
  return owned.map((m) => ({
    id: uid(),
    name: m,
    category: m.split(' ')[0] ?? 'Equipment',
    status: 'Owned' as const,
    condition: 'Good' as const,
    since: '2021',
  }));
};

export const loadEquipment = (profile: IFarmerProfile | null): DigitalEquipment[] =>
  load<DigitalEquipment[]>(KEYS.equipment, seedEquipment(profile));
export const saveEquipment = (items: DigitalEquipment[]): void => save(KEYS.equipment, items);

/* ── Planned / AI tasks (today's live tasks come from cropTimelineData) ──── */

const seedTasks = (): DigitalTask[] => [
  { id: uid(), label: 'Fertilizer dose — second split of urea', date: isoDaysFromNow(1), done: false, source: 'ai' },
  { id: uid(), label: 'Field inspection for pest attack', date: isoDaysFromNow(3), done: false, source: 'ai' },
  { id: uid(), label: 'Visit APMC to check current mandi rates', date: isoDaysFromNow(6), done: false, source: 'planned' },
  { id: uid(), label: 'Renew PM-KISAN application status check', date: isoDaysFromNow(9), done: false, source: 'planned' },
  { id: uid(), label: 'Drainage check before forecast rain', date: isoDaysFromNow(-2), done: true, source: 'ai' },
  { id: uid(), label: 'Weed control round on the east plot', date: isoDaysFromNow(-5), done: true, source: 'planned' },
];

export const loadTasks = (): DigitalTask[] => load<DigitalTask[]>(KEYS.tasks, seedTasks());
export const saveTasks = (tasks: DigitalTask[]): void => save(KEYS.tasks, tasks);

/* ── Activities log ──────────────────────────────────────────────────────── */

const seedActivities = (): DigitalActivity[] => [
  { id: uid(), kind: 'scan', title: 'Leaf scan — soybean rust detected', date: isoDaysFromNow(-1), meta: 'Crop Doctor' },
  { id: uid(), kind: 'chat', title: 'Asked Kisan AI about urea dosage', date: isoDaysFromNow(-2), meta: 'Kisan AI' },
  { id: uid(), kind: 'weather', title: 'Heavy rain alert for your district', date: isoDaysFromNow(-3), meta: 'Weather' },
  { id: uid(), kind: 'scheme', title: 'Saved PM-KISAN instalment tracker', date: isoDaysFromNow(-5), meta: 'Schemes' },
  { id: uid(), kind: 'bookmark', title: 'Bookmarked John Deere 5310', date: isoDaysFromNow(-6), meta: 'Tractor Market' },
];

export const loadActivities = (): DigitalActivity[] =>
  load<DigitalActivity[]>(KEYS.activity, seedActivities());
export const saveActivities = (items: DigitalActivity[]): void => save(KEYS.activity, items);
export const pushActivity = (item: Omit<DigitalActivity, 'id' | 'date'>): void => {
  const next = [{ ...item, id: uid(), date: new Date().toISOString().split('T')[0] }, ...loadActivities()].slice(0, 20);
  saveActivities(next);
};

/* ── Invoices / payment history ──────────────────────────────────────────── */

const seedInvoices = (): Invoice[] => [
  { id: uid(), title: 'Tractor rental — Mahindra 575 DI', amount: 2600, date: isoDaysFromNow(-4), paid: true },
  { id: uid(), title: 'Agri Store order #A-1142', amount: 1890, date: isoDaysFromNow(-9), paid: true },
  { id: uid(), title: 'Transport booking — tractor trolley', amount: 1450, date: isoDaysFromNow(-14), paid: true },
  { id: uid(), title: 'Crop insurance premium — PMFBY', amount: 5400, date: isoDaysFromNow(-20), paid: false },
];

export const loadInvoices = (): Invoice[] => load<Invoice[]>(KEYS.invoices, seedInvoices());
export const saveInvoices = (items: Invoice[]): void => save(KEYS.invoices, items);

/* ── Notification preferences ────────────────────────────────────────────── */

const DEFAULT_NOTIF: NotificationPrefs = { weather: true, market: true, scheme: true, booking: true, ai: true };

const seedNotif = (): NotificationPrefs => {
  try {
    const legacy = JSON.parse(localStorage.getItem('agri_notif_prefs') || '{}') as Record<string, boolean>;
    return {
      ...DEFAULT_NOTIF,
      weather: typeof legacy.weatherAlerts === 'boolean' ? legacy.weatherAlerts : true,
      market: typeof legacy.priceAlerts === 'boolean' ? legacy.priceAlerts : true,
    };
  } catch {
    return DEFAULT_NOTIF;
  }
};

export const loadNotifPrefs = (): NotificationPrefs => load<NotificationPrefs>(KEYS.notif, seedNotif());
export const saveNotifPrefs = (prefs: NotificationPrefs): void => save(KEYS.notif, prefs);
