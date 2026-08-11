import { describe, it, expect } from 'vitest';
import { generateRecommendations } from './recommendationEngine';
import type { FarmerMemory, AdvisorInsight } from './advisorTypes';

const makeMemory = (overrides: Partial<FarmerMemory> = {}): FarmerMemory => ({
  farmer: { name: 'Rakesh', village: 'Shivpuri', state: 'Madhya Pradesh' },
  farm: { crop: 'Soybean', variety: 'JS-9560', stage: 'Flowering', area: 5.2, soilType: 'Black Soil' },
  weather: { temp: 39, humidity: 85, rainChance: 20, minTemp: 26, maxTemp: 43, condition: 'Hot & Dry Wind (Loo)', location: 'Shivpuri', advisory: null },
  mandi: [{ crop: 'Soybean', price: 4320, change: '+32', status: 'up', market: 'APMC' }],
  activities: {
    lastChatAt: Date.now(), chatCount: 4, scanCount: 3, orderCount: 2, bookingCount: 1,
    paymentCount: 3, expenseTotal: 20000, incomeTotal: 45000, ledgerEntries: 6,
    taskCount: 5, pendingTasks: 2, unreadNotifications: 3, equipmentCount: 2, harvestDays: 40,
  },
  learned: { patterns: [], preferredAlerts: [], lastBriefDate: null, lastReportWeek: null },
  dataCompleteness: 90,
  ...overrides,
});

const summaryOf = (insights: AdvisorInsight[], type: string): AdvisorInsight | undefined =>
  insights.find((i) => i.type === type);

describe('recommendationEngine', () => {
  it('every recommendation has confidence (0-100) and at least one reasoning reason', () => {
    const insights = generateRecommendations(makeMemory());
    expect(insights.length).toBeGreaterThan(0);
    for (const i of insights) {
      expect(i.confidence).toBeGreaterThanOrEqual(0);
      expect(i.confidence).toBeLessThanOrEqual(100);
      expect(i.reasoning.length).toBeGreaterThan(0);
      expect(i.reasoning[0].reasonKey.startsWith('adv.reason.')).toBe(true);
      expect(i.dedupeKey).toBeTruthy();
      expect(i.action?.tab).toBeTruthy();
    }
  });

  it('de-duplicates insights and orders critical first by severity then confidence', () => {
    const insights = generateRecommendations(makeMemory());
    const keys = insights.map((i) => i.dedupeKey);
    expect(new Set(keys).size).toBe(keys.length);
    const sev = { critical: 0, warning: 1, info: 2, positive: 3 } as const;
    for (let k = 1; k < insights.length; k++) {
      expect(sev[insights[k - 1].severity] <= sev[insights[k].severity]).toBe(true);
    }
  });

  it('emits heat + water + yield + disease risks for hot, humid flowering crop', () => {
    const insights = generateRecommendations(makeMemory());
    expect(summaryOf(insights, 'heat')?.severity).toBe('critical');
    expect(summaryOf(insights, 'water')).toBeTruthy();
    expect(summaryOf(insights, 'yield')).toBeTruthy();
    expect(summaryOf(insights, 'disease')?.severity).toBe('critical');
  });

  it('emits a market sell-window for a rising own-crop price', () => {
    const insights = generateRecommendations(makeMemory());
    const market = summaryOf(insights, 'market');
    expect(market?.severity).toBe('positive');
    expect(market?.titleKey).toBe('adv.marketUp.title');
  });

  it('emits profit and task insights when ledger shows activity and tasks are pending', () => {
    const insights = generateRecommendations(makeMemory());
    expect(summaryOf(insights, 'profit')).toBeTruthy();
    expect(summaryOf(insights, 'task')).toBeTruthy();
  });

  it('raises confidence with richer data', () => {
    const rich = generateRecommendations(makeMemory({ dataCompleteness: 95 }));
    const poor = generateRecommendations(
      makeMemory({
        dataCompleteness: 20,
        mandi: [],
        activities: { ...makeMemory().activities, ledgerEntries: 0, chatCount: 0, scanCount: 0, taskCount: 0, pendingTasks: 0 },
      }),
    );
    const avg = (list: AdvisorInsight[]) => list.reduce((s, i) => s + i.confidence, 0) / list.length;
    expect(avg(rich)).toBeGreaterThan(avg(poor));
  });
});
