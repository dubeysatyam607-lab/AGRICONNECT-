import type {
  ActiveCrop, CalendarEntry, ExpenseCategory, ExpenseEntry, FarmOsState,
  FarmReport, FarmTwin, RecommendationItem, ReportKind, SaleEntry, TimelineEvent,
  TimelineType,
} from './farmOsTypes';
import { FARM_OS_SEED_VERSION, FARM_OS_STORAGE_KEY } from './farmOsTypes';
import { seedFarmOs } from './farmOsSeed';
import {
  adjustCalendarForWeather,
  buildSmartCalendar,
  computeFinance,
  computeHealth,
  generateRecommendations,
  generateReport,
} from './farmOsEngine';
import { notifyEvent } from '../../notifications/notify';

/**
 * Farm OS — Digital Farm Twin store (local-first).
 * Persists to `agri_farm_os_v1`. Every mutation re-runs the intelligence
 * engine (health, calendar, recommendations) and emits in-app notifications
 * for proactive reminders.
 */

let state: FarmOsState | null = null;
const listeners = new Set<() => void>();

export const uid = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const nowIso = (): string => new Date().toISOString();

export const today = (): string => new Date().toISOString().slice(0, 10);

export const seedState = (): FarmOsState => seedFarmOs();

function load(): FarmOsState {
  if (state) return state;
  if (typeof window === 'undefined') {
    state = seedState();
    return state;
  }
  try {
    const raw = localStorage.getItem(FARM_OS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as FarmOsState) : null;
    if (parsed && parsed.version === FARM_OS_SEED_VERSION && Array.isArray(parsed.farms)) {
      state = { ...seedState(), ...parsed };
    } else {
      state = seedState();
    }
  } catch {
    state = seedState();
  }
  return state;
}

function persist(next: FarmOsState): void {
  state = next;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FARM_OS_STORAGE_KEY, JSON.stringify(next));
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

export const getState = (): FarmOsState => load();

export const resetFarmOsData = (): void => {
  persist(seedState());
};

/* ── derived selectors ───────────────────────────────────────────────────── */

export const getFarm = (id: string, s: FarmOsState = load()): FarmTwin =>
  s.farms.find((f) => f.id === id) ?? s.farms[0];

export const getActiveFarm = (s: FarmOsState = load()): FarmTwin => getFarm(s.activeFarmId, s);

export const getActiveCrop = (s: FarmOsState = load()): ActiveCrop | undefined =>
  s.crops.find((c) => c.farmId === s.activeFarmId && c.stage !== 'harvest');

export const getFarmTimeline = (farmId: string, s: FarmOsState = load()): TimelineEvent[] =>
  s.timeline.filter((e) => e.farmId === farmId).sort((a, b) => b.date.localeCompare(a.date));

export const getFarmHealth = (farmId: string, s: FarmOsState = load()): ReturnType<typeof computeHealth> =>
  computeHealth(farmId, s.weather, s);

export const getFarmCalendar = (farmId: string, s: FarmOsState = load()): CalendarEntry[] =>
  adjustCalendarForWeather(
    buildSmartCalendar(farmId, s).filter((e) => e.date >= today()),
    s.weather,
  ).sort((a, b) => a.date.localeCompare(b.date));

export const getFarmRecommendations = (farmId: string, s: FarmOsState = load()): RecommendationItem[] =>
  generateRecommendations(farmId, s.weather, s.market[getActiveCrop(s)?.crop ?? 'Soybean'] ?? { price: 0, change: 0, status: 'down' }, s);

export const getFarmFinance = (farmId: string, s: FarmOsState = load()): ReturnType<typeof computeFinance> =>
  computeFinance(farmId, s);

export const getFarmReports = (farmId: string, s: FarmOsState = load()): FarmReport[] =>
  s.reports.filter((r) => r.farmId === farmId).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

/* ── multi-farm ──────────────────────────────────────────────────────────── */

export function addFarm(input: Omit<FarmTwin, 'id' | 'createdAt'>): void {
  const s = load();
  const farm: FarmTwin = { ...input, id: uid(), createdAt: nowIso() };
  persist({ ...s, farms: [...s.farms, farm], activeFarmId: farm.id });
  notifyEvent({
    category: 'system',
    titleKey: 'fos.notif.farmAdded.title',
    bodyKey: 'fos.notif.farmAdded.body',
    params: { name: farm.name },
    tab: 'farm-os',
  });
}

export function switchFarm(id: string): void {
  const s = load();
  persist({ ...s, activeFarmId: id });
}

/* ── crop & timeline ─────────────────────────────────────────────────────── */

export function addCrop(input: Omit<ActiveCrop, 'id'>): void {
  const s = load();
  const crop: ActiveCrop = { ...input, id: uid() };
  persist({ ...s, crops: [...s.crops, crop] });
  notifyEvent({
    category: 'task',
    titleKey: 'fos.notif.cropAdded.title',
    bodyKey: 'fos.notif.cropAdded.body',
    params: { crop: crop.crop },
    tab: 'farm-os',
  });
}

export function updateCropStage(cropId: string, stage: ActiveCrop['stage']): void {
  const s = load();
  persist({ ...s, crops: s.crops.map((c) => (c.id === cropId ? { ...c, stage } : c)) });
}

export function logTimelineEvent(input: {
  farmId: string;
  type: TimelineType;
  title: string;
  detail?: string;
  amount?: number;
  crop?: string;
}): void {
  const s = load();
  const event: TimelineEvent = { id: uid(), date: today(), ...input };
  persist({ ...s, timeline: [event, ...s.timeline] });
}

/* ── calendar ────────────────────────────────────────────────────────────── */

export function toggleCalendarEntry(id: string): void {
  const s = load();
  const entry = s.calendar.find((e) => e.id === id);
  if (!entry) return;
  persist({
    ...s,
    calendar: s.calendar.map((e) => (e.id === id ? { ...e, complete: !e.complete } : e)),
  });
  if (!entry.complete) {
    notifyEvent({
      category: 'task',
      severity: 'success',
      titleKey: 'fos.notif.taskDone.title',
      bodyKey: 'fos.notif.taskDone.body',
      params: { title: entry.title },
      tab: 'farm-os',
    });
  }
}

/* ── recommendations ─────────────────────────────────────────────────────── */

export function completeRecommendation(id: string): void {
  const s = load();
  persist({
    ...s,
    recommendations: s.recommendations.map((r) => (r.id === id ? { ...r, done: true } : r)),
  });
}

/* ── finance ─────────────────────────────────────────────────────────────── */

export function addExpense(input: Omit<ExpenseEntry, 'id' | 'farmId' | 'date'> & { date?: string }): void {
  const s = load();
  const expense: ExpenseEntry = { ...input, id: uid(), farmId: s.activeFarmId, date: input.date ?? today() };
  persist({ ...s, expenses: [expense, ...s.expenses] });
}

export function addSale(input: Omit<SaleEntry, 'id' | 'farmId' | 'date'> & { date?: string }): void {
  const s = load();
  const sale: SaleEntry = { ...input, id: uid(), farmId: s.activeFarmId, date: input.date ?? today() };
  persist({ ...s, sales: [sale, ...s.sales] });
}

export const expenseCategoryOrder: ExpenseCategory[] = ['seeds', 'fertilizer', 'pesticide', 'labour', 'machinery', 'transport', 'other'];

/* ── reports ─────────────────────────────────────────────────────────────── */

export function generateFarmReport(kind: ReportKind): FarmReport {
  const s = load();
  const report = generateReport(s.activeFarmId, kind, s);
  persist({ ...s, reports: [report, ...s.reports] });
  return report;
}
