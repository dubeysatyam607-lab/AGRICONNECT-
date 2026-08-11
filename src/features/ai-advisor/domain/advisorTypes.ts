/**
 * Personalized AI Farming Advisor — domain types.
 * The advisor learns a FarmerMemory from all on-device activity and produces
 * explainable recommendations (insights) with confidence + reasoning.
 */

export type InsightType =
  | 'rain'
  | 'heat'
  | 'frost'
  | 'drought'
  | 'disease'
  | 'market'
  | 'yield'
  | 'water'
  | 'profit'
  | 'task'
  | 'harvest'
  | 'scheme'
  | 'general';

export type InsightSeverity = 'positive' | 'info' | 'warning' | 'critical';

export interface InsightReason {
  reasonKey: string;
  params?: Record<string, string | number>;
}

export interface AdvisorInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  /** 0–100 — how sure the advisor is. Higher with richer farmer data. */
  confidence: number;
  titleKey: string;
  bodyKey: string;
  params?: Record<string, string | number>;
  /** Why the advisor says this — always present so every call is explainable. */
  reasoning: InsightReason[];
  /** Deep link the farmer can act on. */
  action?: { tab: string; labelKey: string };
  /** De-dupes across days (e.g. `rain-2026-08-06`). */
  dedupeKey: string;
  createdAt: string;
  acked: boolean;
}

export interface FarmerMemory {
  farmer: { name: string; village: string; state: string };
  farm: {
    crop: string;
    variety: string;
    stage: string;
    area: number;
    soilType: string;
  };
  weather: {
    temp: number | null;
    humidity: number | null;
    rainChance: number | null;
    minTemp: number | null;
    maxTemp: number | null;
    condition: string;
    location: string;
    advisory: string | null;
  };
  mandi: Array<{
    crop: string;
    price: number;
    change: string;
    status: string;
    market: string;
  }>;
  activities: {
    lastChatAt: number | null;
    chatCount: number;
    scanCount: number;
    orderCount: number;
    bookingCount: number;
    paymentCount: number;
    expenseTotal: number;
    incomeTotal: number;
    ledgerEntries: number;
    taskCount: number;
    pendingTasks: number;
    unreadNotifications: number;
    equipmentCount: number;
    harvestDays: number | null;
  };
  /** Persistent learning the advisor accumulates across sessions. */
  learned: {
    patterns: string[];
    preferredAlerts: string[];
    lastBriefDate: string | null;
    lastReportWeek: string | null;
  };
  /** 0–100 measure of how much personalized data the advisor has. */
  dataCompleteness: number;
}

export interface DailyBrief {
  id: string; // yyyy-mm-dd
  date: string;
  location: string;
  crop: string;
  stage: string;
  insights: AdvisorInsight[];
}

export interface WeeklyReport {
  id: string; // yyyy-Www
  start: string;
  end: string;
  summaryKey: string;
  summaryParams?: Record<string, string | number>;
  sections: Array<{
    titleKey: string;
    bodyKey: string;
    params?: Record<string, string | number>;
    confidence: number;
  }>;
  recommendations: AdvisorInsight[];
}

export interface AdvisorState {
  version: number;
  memory: FarmerMemory;
  brief: DailyBrief | null;
  insights: AdvisorInsight[];
  reports: WeeklyReport[];
}

export const ADVISOR_STORAGE_KEY = 'agri_advisor_v1';
export const ADVISOR_SEED_VERSION = 1;
export const ADVISOR_MAX_INSIGHTS = 40;
export const ADVISOR_MAX_REPORTS = 8;
