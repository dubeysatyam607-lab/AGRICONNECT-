import { describe, it, expect } from 'vitest';
import {
  seedState,
  resetFarmOsData,
  addFarm,
  switchFarm,
  addCrop,
  logTimelineEvent,
  toggleCalendarEntry,
  completeRecommendation,
  addExpense,
  addSale,
  generateFarmReport,
  getActiveFarm,
  getActiveCrop,
  getFarmHealth,
  getFarmCalendar,
  getFarmRecommendations,
  getFarmFinance,
  getFarmReports,
  getFarm,
  getState,
} from './farmOsStore';
import { getActiveNotifications } from '../../notifications/domain/notificationStore';

const seedOs = () => {
  resetFarmOsData();
  return seedState();
};

describe('farmOsStore', () => {
  it('seeds a complete farm-os state', () => {
    const s = seedOs();
    expect(s.farms.length).toBeGreaterThanOrEqual(2);
    expect(s.crops.length).toBeGreaterThanOrEqual(2);
    expect(s.timeline.length).toBeGreaterThanOrEqual(10);
    expect(s.calendar.length).toBeGreaterThanOrEqual(7);
    expect(s.recommendations.length).toBeGreaterThanOrEqual(5);
    expect(s.expenses.length).toBeGreaterThanOrEqual(9);
    expect(s.sales.length).toBeGreaterThanOrEqual(1);
    expect(s.version).toBe(1);
    expect(s.weather.temp).toBeGreaterThan(0);
  });

  it('getFarm falls back to the first farm for unknown ids', () => {
    seedOs();
    expect(getFarm('nope').id).toBe(getActiveFarm().id);
  });

  it('addFarm creates a twin, activates it and notifies', () => {
    seedOs();
    const before = getState().farms.length;
    addFarm({
      name: 'Test Plot',
      areaAcres: 2,
      ownership: 'owned',
      village: 'Nanded',
      district: 'Nanded',
      state: 'Maharashtra',
      soilType: 'Loamy',
      irrigation: 'drip',
      waterSource: 'Borewell',
      livestock: [],
      machinery: [],
    });
    const s = getState();
    expect(s.farms.length).toBe(before + 1);
    expect(getActiveFarm(s).name).toBe('Test Plot');
    const notifs = getActiveNotifications();
    expect(notifs.some((n) => n.titleKey === 'fos.notif.farmAdded.title')).toBe(true);
  });

  it('switchFarm changes the active twin', () => {
    seedOs();
    const s = getState();
    const other = s.farms.find((f) => f.id !== s.activeFarmId)!;
    switchFarm(other.id);
    expect(getActiveFarm().id).toBe(other.id);
  });

  it('addCrop tracks a new crop and notifies', () => {
    seedOs();
    const s = getState();
    addCrop({
      farmId: s.activeFarmId,
      crop: 'Wheat',
      variety: 'GW-322',
      stage: 'sowing',
      sownAt: '2026-11-05',
      expectedHarvest: '2027-03-05',
      areaAcres: 2,
      targetYieldQ: 28,
    });
    expect(getState().crops.some((c) => c.crop === 'Wheat' && c.variety === 'GW-322')).toBe(true);
    expect(getActiveNotifications().some((n) => n.titleKey === 'fos.notif.cropAdded.title')).toBe(true);
  });

  it('logTimelineEvent prepends to the timeline', () => {
    seedOs();
    const farmId = getActiveFarm().id;
    const before = getState().timeline.length;
    logTimelineEvent({ farmId, type: 'irrigation', title: 'Drip run 2h', amount: 40 });
    const s = getState();
    expect(s.timeline.length).toBe(before + 1);
    expect(s.timeline[0].type).toBe('irrigation');
    expect(s.timeline[0].amount).toBe(40);
  });

  it('toggleCalendarEntry completes a task and notifies', () => {
    seedOs();
    const entry = getState().calendar[0];
    toggleCalendarEntry(entry.id);
    expect(getState().calendar.find((e) => e.id === entry.id)?.complete).toBe(true);
    expect(getActiveNotifications().some((n) => n.titleKey === 'fos.notif.taskDone.title')).toBe(true);
  });

  it('completeRecommendation marks done', () => {
    seedOs();
    const rec = getState().recommendations[0];
    completeRecommendation(rec.id);
    expect(getState().recommendations.find((r) => r.id === rec.id)?.done).toBe(true);
  });

  it('addExpense and addSale feed the finance snapshot', () => {
    seedOs();
    const farmId = getActiveFarm().id;
    addExpense({ label: 'Urea', category: 'fertilizer', amount: 600 });
    addSale({ crop: 'Soybean', qty: 10, pricePerUnit: 4320, amount: 43200 });
    const fin = getFarmFinance(farmId);
    expect(fin.totalExpense).toBeGreaterThan(0);
    expect(fin.revenue).toBeGreaterThan(0);
    expect(fin.profit).toBeGreaterThan(0);
    expect(fin.byCategory.fertilizer).toBeGreaterThan(0);
  });

  it('generateFarmReport persists a report', () => {
    seedOs();
    const farmId = getActiveFarm().id;
    const before = getState().reports.length;
    const rep = generateFarmReport('daily');
    expect(getState().reports.length).toBe(before + 1);
    expect(rep.kind).toBe('daily');
    expect(rep.summary.length).toBeGreaterThan(0);
    expect(getFarmReports(farmId).length).toBeGreaterThan(0);
  });

  it('derived selectors return live intelligence', () => {
    seedOs();
    const farmId = getActiveFarm().id;
    expect(getFarmHealth(farmId).score).toBeGreaterThanOrEqual(0);
    expect(getFarmHealth(farmId).score).toBeLessThanOrEqual(100);
    expect(getFarmHealth(farmId).factors.crop).toBeGreaterThanOrEqual(0);
    expect(getFarmCalendar(farmId).length).toBeGreaterThan(0);
    const recs = getFarmRecommendations(farmId);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].confidence).toBeGreaterThan(0);
    expect(recs[0].reasons.length).toBeGreaterThan(0);
  });
});
