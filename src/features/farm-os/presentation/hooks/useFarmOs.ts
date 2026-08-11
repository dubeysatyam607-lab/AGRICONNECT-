import { useSyncExternalStore, useMemo } from 'react';
import {
  addCrop,
  addExpense,
  addFarm,
  addSale,
  completeRecommendation,
  generateFarmReport,
  getActiveFarm,
  getActiveCrop,
  getFarmCalendar,
  getFarmFinance,
  getFarmHealth,
  getFarmRecommendations,
  getFarmReports,
  getFarmTimeline,
  getState,
  logTimelineEvent,
  subscribe,
  switchFarm,
  toggleCalendarEntry,
} from '../../domain/farmOsStore';
import type {
  ActiveCrop, CalendarEntry, ExpenseCategory, FarmReport, FarmOsState,
  FarmTwin, RecommendationItem, ReportKind, TimelineEvent, TimelineType,
} from '../../domain/farmOsTypes';

export interface UseFarmOsResult {
  state: FarmOsState;
  activeFarm: FarmTwin;
  activeCrop: ActiveCrop | undefined;
  health: ReturnType<typeof getFarmHealth>;
  timeline: TimelineEvent[];
  calendar: CalendarEntry[];
  recommendations: RecommendationItem[];
  finance: ReturnType<typeof getFarmFinance>;
  reports: FarmReport[];
  actions: {
    addFarm: (input: Omit<FarmTwin, 'id' | 'createdAt'>) => void;
    switchFarm: (id: string) => void;
    addCrop: (input: Omit<ActiveCrop, 'id'>) => void;
    logTimelineEvent: (input: { farmId: string; type: TimelineType; title: string; detail?: string; amount?: number; crop?: string }) => void;
    toggleCalendarEntry: (id: string) => void;
    completeRecommendation: (id: string) => void;
    addExpense: (input: { label: string; category: ExpenseCategory; amount: number; date?: string }) => void;
    addSale: (input: { crop: string; qty: number; pricePerUnit: number; amount: number; date?: string }) => void;
    generateReport: (kind: ReportKind) => FarmReport;
  };
}

export function useFarmOs(): UseFarmOsResult {
  const state = useSyncExternalStore(subscribe, getState, getState);
  const activeFarm = getActiveFarm(state);
  const activeCrop = getActiveCrop(state);

  return useMemo(
    () => ({
      state,
      activeFarm,
      activeCrop,
      health: getFarmHealth(activeFarm.id, state),
      timeline: getFarmTimeline(activeFarm.id, state),
      calendar: getFarmCalendar(activeFarm.id, state),
      recommendations: getFarmRecommendations(activeFarm.id, state),
      finance: getFarmFinance(activeFarm.id, state),
      reports: getFarmReports(activeFarm.id, state),
      actions: {
        addFarm,
        switchFarm,
        addCrop,
        logTimelineEvent,
        toggleCalendarEntry,
        completeRecommendation,
        addExpense,
        addSale,
        generateReport: generateFarmReport,
      },
    }),
    [state, activeFarm, activeCrop],
  );
}
