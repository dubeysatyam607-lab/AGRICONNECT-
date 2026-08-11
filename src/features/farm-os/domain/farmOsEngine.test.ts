import { describe, it, expect } from 'vitest';
import {
  computeHealth,
  buildSmartCalendar,
  adjustCalendarForWeather,
  generateRecommendations,
  computeFinance,
  generateReport,
} from './farmOsEngine';
import { seedFarmOs } from './farmOsSeed';
import type { WeatherInput } from './farmOsTypes';

const state = () => seedFarmOs();
const FARM = 'farm1';

describe('farmOsEngine', () => {
  it('computeHealth returns bounded scores and all factors', () => {
    const h = computeHealth(FARM, state().weather, state());
    expect(h.score).toBeGreaterThanOrEqual(0);
    expect(h.score).toBeLessThanOrEqual(100);
    for (const v of Object.values(h.factors)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(h.trend.length).toBeGreaterThan(0);
  });

  it('computeHealth penalises extreme heat', () => {
    const s = state();
    const hot: WeatherInput = { ...s.weather, temp: 46, humidity: 10, rainChance: 5 };
    const mild = { ...s.weather, temp: 30, humidity: 60, rainChance: 20 };
    expect(computeHealth(FARM, hot, s).factors.weather).toBeLessThan(computeHealth(FARM, mild, s).factors.weather);
  });

  it('computeHealth detects disease from scan events', () => {
    const s = state();
    s.timeline.push({ id: 't-x', farmId: FARM, type: 'disease', date: '2026-08-01', title: 'Crop scan — detected yellow rust' });
    expect(computeHealth(FARM, s.weather, s).factors.disease).toBe(45);
  });

  it('buildSmartCalendar schedules irrigation cadence for drip', () => {
    const entries = buildSmartCalendar(FARM, state());
    const irrigations = entries.filter((e) => e.type === 'irrigation');
    expect(irrigations.length).toBeGreaterThanOrEqual(3);
    expect(entries.every((e) => e.farmId === FARM)).toBe(true);
    expect(entries.every((e) => e.title.length > 0)).toBe(true);
  });

  it('adjustCalendarForWeather shifts irrigation sooner when hot and spray later when rainy', () => {
    const s = state();
    const cal = buildSmartCalendar(FARM, s);
    const hot: WeatherInput = { ...s.weather, temp: 41, rainChance: 80 };
    const shifted = adjustCalendarForWeather(cal, hot);
    const irr = shifted.find((e) => e.type === 'irrigation')!;
    const origIrr = cal.find((e) => e.id === irr.id)!;
    expect(irr.date <= origIrr.date).toBe(true);
    const spray = shifted.find((e) => e.type === 'spray');
    if (spray) {
      const origSpray = cal.find((e) => e.id === spray.id)!;
      expect(spray.date >= origSpray.date).toBe(true);
    }
  });

  it('generateRecommendations ranks high priority first with high confidence', () => {
    const s = state();
    const recs = generateRecommendations(FARM, s.weather, s.market['Soybean'], s);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].priority).toBe('high');
    expect(recs[0].confidence).toBeGreaterThanOrEqual(recs[recs.length - 1].confidence);
    for (const r of recs) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.body.length).toBeGreaterThan(0);
      expect(r.reasons.length).toBeGreaterThan(0);
    }
  });

  it('generateRecommendations emits heat-stress irrigation rec in hot flowering', () => {
    const s = state();
    const recs = generateRecommendations(FARM, s.weather, s.market['Soybean'], s);
    expect(recs.some((r) => r.category === 'irrigation' && r.priority === 'high')).toBe(true);
  });

  it('computeFinance computes profit, cost/acre and category totals', () => {
    const fin = computeFinance(FARM, state());
    expect(fin.totalExpense).toBeGreaterThan(0);
    expect(fin.revenue).toBeGreaterThan(0);
    expect(fin.costPerAcre).toBeGreaterThan(0);
    expect(fin.marginPct).toBeGreaterThanOrEqual(0);
    expect(Object.keys(fin.byCategory).length).toBe(7);
    const total = Object.values(fin.byCategory).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(fin.totalExpense, 0);
  });

  it('generateReport builds every report kind', () => {
    const s = state();
    for (const kind of ['daily', 'weekly', 'monthly', 'season', 'harvest'] as const) {
      const rep = generateReport(FARM, kind, s);
      expect(rep.kind).toBe(kind);
      expect(rep.summary.length).toBeGreaterThan(0);
      expect(rep.metrics.length).toBeGreaterThan(0);
    }
  });

  it('generateReport daily reflects the top recommendation', () => {
    const rep = generateReport(FARM, 'daily', state());
    expect(rep.metrics.some((m) => m.label === 'Today priority')).toBe(true);
  });
});
