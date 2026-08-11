import { notifyEvent } from '@/features/notifications/notify';
import type {
  AdvisorInsight,
  AdvisorState,
  DailyBrief,
  FarmerMemory,
  InsightSeverity,
  WeeklyReport,
} from './advisorTypes';
import {
  ADVISOR_STORAGE_KEY,
  ADVISOR_SEED_VERSION,
  ADVISOR_MAX_INSIGHTS,
  ADVISOR_MAX_REPORTS,
} from './advisorTypes';
import { buildFarmerMemory, mergeLearning, recordAlertPreference } from './advisorMemory';
import { generateRecommendations } from './recommendationEngine';

/**
 * AI Advisor Store — local-first.
 * Regenerates the personalized daily brief + weekly report from live farmer
 * data, persists AI memory, and mirrors high-severity insights into the
 * notification center so the farmer gets a push-style nudge too.
 */

let state: AdvisorState | null = null;
const listeners = new Set<() => void>();

const weekId = (d = new Date()): string => {
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const seedState = (): AdvisorState => ({
  version: ADVISOR_SEED_VERSION,
  memory: buildFarmerMemory(),
  brief: null,
  insights: [],
  reports: [],
});

function load(): AdvisorState {
  if (state) return state;
  if (typeof window === 'undefined') {
    state = seedState();
    return state;
  }
  try {
    const raw = localStorage.getItem(ADVISOR_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AdvisorState) : null;
    state = parsed && parsed.version === ADVISOR_SEED_VERSION && parsed.memory
      ? parsed
      : seedState();
  } catch {
    state = seedState();
  }
  return state;
}

function persist(next: AdvisorState): void {
  state = next;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADVISOR_STORAGE_KEY, JSON.stringify(next));
  } catch { /* storage full */ }
  listeners.forEach((l) => l());
}

export const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getState = (): AdvisorState => load();

export const resetAdvisorData = (): void => {
  persist(seedState());
};

/* ── insight helpers ─────────────────────────────────────────────────────── */

export const ackInsight = (id: string): void => {
  const s = load();
  persist({ ...s, insights: s.insights.map((i) => (i.id === id ? { ...i, acked: true } : i)) });
};

export const ackAll = (): void => {
  const s = load();
  persist({ ...s, insights: s.insights.map((i) => ({ ...i, acked: true })) });
};

export const getTopInsights = (n: number, severity?: InsightSeverity): AdvisorInsight[] => {
  const s = load();
  const list = s.insights
    .filter((i) => !i.acked)
    .filter((i) => !severity || i.severity === severity)
    .sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2, positive: 3 } as const;
      return sev[a.severity] - sev[b.severity] || b.confidence - a.confidence;
    });
  return list.slice(0, n);
};

/* ── generation ──────────────────────────────────────────────────────────── */

/** Regenerate the daily brief + insights from current farmer data (idempotent). */
export function buildDailyBrief(): DailyBrief {
  const s = load();
  const fresh = mergeLearning(s.memory, buildFarmerMemory());
  const generated = generateRecommendations(fresh);

  // Preserve acks for insights that still exist; drop stale ones.
  const ackedIds = new Set(s.insights.filter((i) => i.acked).map((i) => i.id));
  const insights = generated.map((g) =>
    ackedIds.has(g.id) ? { ...g, acked: true } : g,
  ).slice(0, ADVISOR_MAX_INSIGHTS);

  // Learn: acknowledge actions strengthen future memory.
  const preferred = fresh.learned.preferredAlerts;
  for (const i of insights) {
    if (i.acked && !preferred.includes(i.type)) {
      fresh.learned.preferredAlerts = [...preferred, i.type];
    }
  }

  const brief: DailyBrief = {
    id: todayKey(),
    date: todayKey(),
    location: fresh.weather.location || fresh.farmer.village,
    crop: fresh.farm.crop,
    stage: fresh.farm.stage,
    insights,
  };

  const next: AdvisorState = {
    ...s,
    memory: { ...fresh, learned: { ...fresh.learned, lastBriefDate: todayKey() } },
    brief,
    insights,
  };
  persist(next);

  mirrorHighSeverityInsights(insights);
  return brief;
}

/** Push warning/critical insights into the notification center. */
function mirrorHighSeverityInsights(insights: AdvisorInsight[]): void {
  for (const i of insights) {
    if (i.severity !== 'warning' && i.severity !== 'critical') continue;
    if (i.acked) continue;
    try {
      notifyEvent({
        category: 'ai',
        severity: i.severity === 'critical' ? 'alert' : 'info',
        titleKey: i.titleKey,
        bodyKey: i.bodyKey,
        params: i.params,
        tab: i.action?.tab ?? 'advisor',
        dedupeKey: `notify-${i.dedupeKey}`,
      });
    } catch { /* notification system unavailable */ }
  }
}

/** Build (or refresh) the weekly report for the current ISO week. */
export function ensureWeeklyReport(): WeeklyReport | null {
  const s = load();
  const wId = weekId();
  const existing = s.reports.find((r) => r.id === wId);
  if (existing) return existing;

  const memory = buildFarmerMemory();
  const { incomeTotal, expenseTotal, ledgerEntries, pendingTasks, taskCount, orderCount, bookingCount, chatCount } = memory.activities;
  const net = incomeTotal - expenseTotal;
  const confidence = 45 + Math.round(memory.dataCompleteness / 100 * 45);

  const report: WeeklyReport = {
    id: wId,
    start: wId,
    end: wId,
    summaryKey: 'adv.report.summary',
    summaryParams: { crop: memory.farm.crop, area: memory.farm.area, village: memory.farmer.village },
    sections: [
      {
        titleKey: 'adv.report.performance',
        bodyKey: ledgerEntries > 0 ? 'adv.report.performanceBody' : 'adv.report.performanceEmpty',
        params: ledgerEntries > 0
          ? { income: incomeTotal.toLocaleString('en-IN'), expense: expenseTotal.toLocaleString('en-IN'), net: net.toLocaleString('en-IN') }
          : undefined,
        confidence: ledgerEntries > 0 ? confidence : 40,
      },
      {
        titleKey: 'adv.report.weather',
        bodyKey: 'adv.report.weatherBody',
        params: {
          temp: Math.round(memory.weather.temp ?? 0),
          rain: memory.weather.rainChance ?? 0,
          condition: memory.weather.condition || '—',
        },
        confidence: memory.weather.temp !== null ? confidence : 45,
      },
      {
        titleKey: 'adv.report.market',
        bodyKey: memory.mandi.length > 0 ? 'adv.report.marketBody' : 'adv.report.marketEmpty',
        params: memory.mandi[0] ? { crop: memory.mandi[0].crop, price: memory.mandi[0].price.toLocaleString('en-IN') } : undefined,
        confidence: memory.mandi.length > 0 ? confidence : 40,
      },
      {
        titleKey: 'adv.report.activity',
        bodyKey: 'adv.report.activityBody',
        params: {
          chatCount,
          scans: memory.activities.scanCount,
          orders: orderCount,
          bookings: bookingCount,
          pending: pendingTasks,
          doneShare: taskCount > 0 ? Math.round((1 - pendingTasks / taskCount) * 100) : 0,
        },
        confidence: confidence,
      },
    ],
    recommendations: generateRecommendations(memory).slice(0, 4),
  };

  persist({
    ...s,
    reports: [report, ...s.reports.filter((r) => r.id !== wId)].slice(0, ADVISOR_MAX_REPORTS),
    memory: { ...s.memory, learned: { ...s.memory.learned, lastReportWeek: wId } },
  });
  return report;
}

export const clearAdvisorMemory = (): void => {
  const s = load();
  persist({ ...s, memory: { ...buildFarmerMemory(), learned: { patterns: [], preferredAlerts: [], lastBriefDate: null, lastReportWeek: null } } });
};

/** Record a learned pattern — called when the farmer engages with an insight. */
export const markEngaged = (type: string): void => {
  const s = load();
  const memory = recordAlertPreference(s.memory, type);
  persist({ ...s, memory });
};

export const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
