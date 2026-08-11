/**
 * Farm OS — Digital Farm Twin domain types.
 * The heart of AgriConnect: one Digital Farm Twin per farm with live profile,
 * AI timeline, recommendations, smart calendar, health score, finance and
 * auto-generated reports — from sowing to selling.
 */

export type Ownership = 'owned' | 'leased' | 'shared';

export type Irrigation = 'rainfed' | 'drip' | 'sprinkler' | 'canal' | 'well';

export type CropStage = 'sowing' | 'vegetative' | 'flowering' | 'fruiting' | 'maturity' | 'harvest';

export type TimelineType =
  | 'sowing'
  | 'irrigation'
  | 'fertilizer'
  | 'pesticide'
  | 'disease'
  | 'weather'
  | 'equipment'
  | 'expense'
  | 'harvest'
  | 'sale';

export type RecCategory =
  | 'irrigation'
  | 'fertilizer'
  | 'pesticide'
  | 'harvest'
  | 'market'
  | 'scheme'
  | 'weather'
  | 'soil'
  | 'task';

export type RecPriority = 'high' | 'medium' | 'low';

export type CalendarType = 'irrigation' | 'fertilizer' | 'spray' | 'harvest' | 'equipment' | 'scheme';

export type ReportKind = 'daily' | 'weekly' | 'monthly' | 'season' | 'harvest';

export type ExpenseCategory = 'seeds' | 'fertilizer' | 'pesticide' | 'labour' | 'machinery' | 'transport' | 'other';

export interface FarmTwin {
  id: string;
  name: string;
  areaAcres: number;
  ownership: Ownership;
  village: string;
  district: string;
  state: string;
  soilType: string;
  irrigation: Irrigation;
  waterSource: string;
  livestock: { type: string; count: number }[];
  machinery: string[];
  createdAt: string;
}

export interface ActiveCrop {
  id: string;
  farmId: string;
  crop: string;
  variety: string;
  stage: CropStage;
  sownAt: string;
  expectedHarvest: string;
  areaAcres: number;
  targetYieldQ: number;
}

export interface TimelineEvent {
  id: string;
  farmId: string;
  crop?: string;
  type: TimelineType;
  date: string;
  title: string;
  detail?: string;
  amount?: number;
}

export interface HealthFactors {
  crop: number;
  weather: number;
  water: number;
  disease: number;
  tasks: number;
  soil: number;
}

export interface FarmHealth {
  score: number;
  trend: number[];
  factors: HealthFactors;
}

export interface RecommendationItem {
  id: string;
  farmId: string;
  category: RecCategory;
  priority: RecPriority;
  title: string;
  body: string;
  benefit?: string;
  confidence: number;
  reasons: string[];
  due?: string;
  done: boolean;
}

export interface CalendarEntry {
  id: string;
  farmId: string;
  date: string;
  title: string;
  type: CalendarType;
  complete: boolean;
  autoAdjust?: boolean;
}

export interface ExpenseEntry {
  id: string;
  farmId: string;
  category: ExpenseCategory;
  label: string;
  amount: number;
  date: string;
  crop?: string;
}

export interface SaleEntry {
  id: string;
  farmId: string;
  crop: string;
  qty: number;
  unit: string;
  pricePerUnit: number;
  date: string;
}

export interface ReportMetric {
  label: string;
  value: string;
}

export interface FarmReport {
  id: string;
  farmId: string;
  kind: ReportKind;
  title: string;
  summary: string;
  metrics: ReportMetric[];
  generatedAt: string;
}

export interface WeatherInput {
  temp: number;
  humidity: number;
  rainChance: number;
  minTemp: number;
  maxTemp: number;
  condition: string;
}

export interface MarketInput {
  price: number;
  change: number;
  status: 'up' | 'down';
}

export interface FinanceSnapshot {
  totalExpense: number;
  revenue: number;
  profit: number;
  costPerAcre: number;
  yieldPerAcre: number;
  byCategory: Record<ExpenseCategory, number>;
  marginPct: number;
}

export interface FarmOsState {
  version: number;
  activeFarmId: string;
  farms: FarmTwin[];
  crops: ActiveCrop[];
  timeline: TimelineEvent[];
  health: Record<string, FarmHealth>;
  recommendations: RecommendationItem[];
  calendar: CalendarEntry[];
  expenses: ExpenseEntry[];
  sales: SaleEntry[];
  reports: FarmReport[];
  weather: WeatherInput;
  market: Record<string, MarketInput>;
}

export const FARM_OS_STORAGE_KEY = 'agri_farm_os_v1';
export const FARM_OS_SEED_VERSION = 1;
