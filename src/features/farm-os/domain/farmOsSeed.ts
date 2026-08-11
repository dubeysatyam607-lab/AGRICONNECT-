import type {
  ActiveCrop, CalendarEntry, ExpenseEntry, FarmHealth, FarmOsState, FarmReport,
  FarmTwin, RecommendationItem, SaleEntry, TimelineEvent,
} from './farmOsTypes';
import { FARM_OS_SEED_VERSION } from './farmOsTypes';

const daysAgo = (days: number): string => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const daysAhead = (days: number): string => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const seedFarm = (): FarmTwin[] => [
  {
    id: 'farm1',
    name: 'Main Field',
    areaAcres: 5.2,
    ownership: 'owned',
    village: 'Shivpuri',
    district: 'Indore',
    state: 'Madhya Pradesh',
    soilType: 'Black Soil',
    irrigation: 'drip',
    waterSource: 'Borewell',
    livestock: [{ type: 'Cow', count: 2 }, { type: 'Buffalo', count: 1 }],
    machinery: ['Tractor', 'Rotavator', 'Sprayer'],
    createdAt: daysAgo(400),
  },
  {
    id: 'farm2',
    name: 'Kharif Plot',
    areaAcres: 3.0,
    ownership: 'leased',
    village: 'Mhow',
    district: 'Indore',
    state: 'Madhya Pradesh',
    soilType: 'Sandy Loam',
    irrigation: 'canal',
    waterSource: 'Canal',
    livestock: [],
    machinery: ['Tractor'],
    createdAt: daysAgo(120),
  },
];

const seedCrops = (): ActiveCrop[] => [
  {
    id: 'crop1', farmId: 'farm1', crop: 'Soybean', variety: 'JS-9560',
    stage: 'flowering', sownAt: daysAgo(48), expectedHarvest: daysAhead(45),
    areaAcres: 5.2, targetYieldQ: 12,
  },
  {
    id: 'crop2', farmId: 'farm2', crop: 'Cotton', variety: 'RC-4',
    stage: 'vegetative', sownAt: daysAgo(30), expectedHarvest: daysAhead(90),
    areaAcres: 3.0, targetYieldQ: 9,
  },
];

const seedTimeline = (): TimelineEvent[] => [
  { id: 't1', farmId: 'farm1', crop: 'Soybean', type: 'sowing', date: daysAgo(48), title: 'Sowed Soybean (JS-9560)', detail: 'Seed rate 60 kg/acre', amount: 2600 },
  { id: 't2', farmId: 'farm1', crop: 'Soybean', type: 'fertilizer', date: daysAgo(30), title: 'Applied DAP (50 kg/acre)', detail: 'Basal dose at sowing + top dressing', amount: 1450 },
  { id: 't3', farmId: 'farm1', crop: 'Soybean', type: 'irrigation', date: daysAgo(7), title: 'Drip irrigation cycle', detail: '3 hours, canopy stage', amount: 0 },
  { id: 't4', farmId: 'farm1', crop: 'Soybean', type: 'disease', date: daysAgo(5), title: 'Crop scan — healthy', detail: 'No disease detected by AI scan', amount: 0 },
  { id: 't5', farmId: 'farm1', crop: 'Soybean', type: 'pesticide', date: daysAgo(9), title: 'Preventive fungicide spray', detail: 'Against white rust', amount: 620 },
  { id: 't6', farmId: 'farm1', crop: 'Soybean', type: 'weather', date: daysAgo(3), title: 'Heat wave advisory', detail: '41°C with dry wind', amount: 0 },
  { id: 't7', farmId: 'farm1', type: 'equipment', date: daysAgo(2), title: 'Tractor PTO service', detail: 'Belt replaced', amount: 400 },
  { id: 't8', farmId: 'farm1', type: 'expense', date: daysAgo(1), title: 'Labour for weeding', detail: '4 workers × 2 days', amount: 2400 },
  { id: 't9', farmId: 'farm2', crop: 'Cotton', type: 'sowing', date: daysAgo(30), title: 'Sowed Cotton (RC-4)', detail: 'Seed rate 4 kg/acre', amount: 1900 },
  { id: 't10', farmId: 'farm2', crop: 'Cotton', type: 'irrigation', date: daysAgo(4), title: 'Canal irrigation', detail: 'Full field, 6 hours', amount: 120 },
];

const seedCalendar = (): CalendarEntry[] => [
  { id: 'ca1', farmId: 'farm1', date: daysAhead(0), title: 'Irrigation — drip 3h', type: 'irrigation', complete: false },
  { id: 'ca2', farmId: 'farm1', date: daysAhead(3), title: 'Foliar spray — micronutrients', type: 'spray', complete: false },
  { id: 'ca3', farmId: 'farm1', date: daysAhead(5), title: 'Soybean price check — APMC', type: 'scheme', complete: false },
  { id: 'ca4', farmId: 'farm1', date: daysAhead(14), title: 'Book harvester for Soybean', type: 'equipment', complete: false },
  { id: 'ca5', farmId: 'farm1', date: daysAhead(45), title: 'Expected harvest — Soybean', type: 'harvest', complete: false },
  { id: 'ca6', farmId: 'farm2', date: daysAhead(2), title: 'Irrigation — canal 5h', type: 'irrigation', complete: false },
  { id: 'ca7', farmId: 'farm2', date: daysAhead(10), title: 'Weed control spray', type: 'spray', complete: false },
];

const seedHealth = (): Record<string, FarmHealth> => ({
  farm1: {
    score: 82,
    trend: [74, 76, 78, 79, 81, 80, 82],
    factors: { crop: 88, weather: 70, water: 90, disease: 95, tasks: 78, soil: 72 },
  },
  farm2: {
    score: 71,
    trend: [68, 69, 70, 69, 71, 70, 71],
    factors: { crop: 76, weather: 65, water: 62, disease: 80, tasks: 60, soil: 74 },
  },
});

const seedRecommendations = (): RecommendationItem[] => [
  {
    id: 'r1', farmId: 'farm1', category: 'irrigation', priority: 'high',
    title: 'Irrigate tonight before heat peak',
    body: 'Your Soybean is at flowering and a 41°C day is expected. Evening drip irrigation protects flowers from heat stress.',
    benefit: 'Prevents flower drop, +8% yield potential',
    confidence: 92,
    reasons: ['Flowering stage is heat-sensitive', 'High temperature expected today', 'Soil moisture below optimum'],
    due: daysAhead(0), done: false,
  },
  {
    id: 'r2', farmId: 'farm1', category: 'fertilizer', priority: 'medium',
    title: 'Apply micronutrient foliar spray',
    body: 'Boron and zinc foliar spray at flowering boosts pod setting in soybean.',
    benefit: '+6% pod setting, stronger grains',
    confidence: 84,
    reasons: ['Flowering stage', 'Soil test shows low boron'],
    due: daysAhead(3), done: false,
  },
  {
    id: 'r3', farmId: 'farm1', category: 'market', priority: 'medium',
    title: 'Watch Soybean price — best sell window opening',
    body: 'APMC soybean moved up ₹45 today. Prices typically peak 2 weeks before harvest.',
    benefit: 'Sell window could add ₹1,200/quintal',
    confidence: 76,
    reasons: ['Price up ₹45 today', 'Harvest in ~45 days'],
    due: daysAhead(5), done: false,
  },
  {
    id: 'r4', farmId: 'farm1', category: 'scheme', priority: 'low',
    title: 'PM-KISAN installment — check eligibility',
    body: 'The 17th installment window is open. Your 5.2-acre farm likely qualifies.',
    benefit: '₹6,000/year direct support',
    confidence: 88,
    reasons: ['Farm size under 2 ha limit', 'KCC details updated'],
    due: daysAhead(7), done: false,
  },
  {
    id: 'r5', farmId: 'farm2', category: 'irrigation', priority: 'high',
    title: 'Canal irrigation needed — dry patch forming',
    body: 'Cotton at vegetative stage needs 6h canal water within 2 days. Sandy loam dries fast.',
    benefit: 'Prevents stunted growth',
    confidence: 89,
    reasons: ['Sandy loam drains quickly', 'No rain in 12 days'],
    due: daysAhead(2), done: false,
  },
];

const seedExpenses = (): ExpenseEntry[] => [
  { id: 'e1', farmId: 'farm1', category: 'seeds', label: 'Soybean seed (JS-9560)', amount: 2600, date: daysAgo(48), crop: 'Soybean' },
  { id: 'e2', farmId: 'farm1', category: 'fertilizer', label: 'DAP 250 kg', amount: 1450, date: daysAgo(40), crop: 'Soybean' },
  { id: 'e3', farmId: 'farm1', category: 'fertilizer', label: 'Urea 100 kg', amount: 680, date: daysAgo(25), crop: 'Soybean' },
  { id: 'e4', farmId: 'farm1', category: 'pesticide', label: 'Fungicide spray', amount: 620, date: daysAgo(9), crop: 'Soybean' },
  { id: 'e5', farmId: 'farm1', category: 'labour', label: 'Weeding labour', amount: 2400, date: daysAgo(1), crop: 'Soybean' },
  { id: 'e6', farmId: 'farm1', category: 'machinery', label: 'Tractor service', amount: 400, date: daysAgo(2) },
  { id: 'e7', farmId: 'farm2', category: 'seeds', label: 'Cotton seed (RC-4)', amount: 1900, date: daysAgo(30), crop: 'Cotton' },
  { id: 'e8', farmId: 'farm2', category: 'labour', label: 'Planting labour', amount: 1600, date: daysAgo(29), crop: 'Cotton' },
  { id: 'e9', farmId: 'farm2', category: 'transport', label: 'Input transport', amount: 350, date: daysAgo(28) },
];

const seedSales = (): SaleEntry[] => [
  { id: 's1', farmId: 'farm1', crop: 'Wheat (last season)', qty: 38, unit: 'quintal', pricePerUnit: 2450, date: daysAgo(90) },
];

const seedReports = (): FarmReport[] => [
  {
    id: 'rep1', farmId: 'farm1', kind: 'daily',
    title: 'Daily Summary — Today',
    summary: 'Priority: irrigate tonight before the 41°C heat peak. Micronutrient spray due in 3 days. Soybean flowering looks healthy from your last scan.',
    metrics: [
      { label: 'Health score', value: '82/100' },
      { label: 'Today priority', value: 'Irrigation' },
      { label: 'Weather', value: '41°C · 12% rain' },
    ],
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'rep2', farmId: 'farm1', kind: 'weekly',
    title: 'Weekly Farm Report — Soybean',
    summary: 'Healthy week. One preventive spray completed, drip irrigation on schedule. Total spend this week ₹3,020. No disease signs in your scan.',
    metrics: [
      { label: 'Crop stage', value: 'Flowering' },
      { label: 'Week spend', value: '₹3,020' },
      { label: 'Health trend', value: '+8 points' },
    ],
    generatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export function seedFarmOs(): FarmOsState {
  return {
    version: FARM_OS_SEED_VERSION,
    activeFarmId: 'farm1',
    farms: seedFarm(),
    crops: seedCrops(),
    timeline: seedTimeline(),
    health: seedHealth(),
    recommendations: seedRecommendations(),
    calendar: seedCalendar(),
    expenses: seedExpenses(),
    sales: seedSales(),
    reports: seedReports(),
    weather: { temp: 41, humidity: 32, rainChance: 12, minTemp: 26, maxTemp: 43, condition: 'Hot & Dry Wind (Loo)' },
    market: { Soybean: { price: 4320, change: 45, status: 'up' } },
  };
}
