import type { AdvisorInsight, FarmerMemory, InsightReason, InsightSeverity, InsightType } from './advisorTypes';

/**
 * Recommendation Engine.
 * Pure evaluators that turn FarmerMemory into explainable insights. Every
 * insight carries a confidence (0–100) and one or more reasoning reasons so
 * the farmer always understands WHY the advisor is recommending something.
 */

export interface InsightSeed {
  type: InsightType;
  severity: InsightSeverity;
  confidence: number;
  titleKey: string;
  bodyKey: string;
  params?: Record<string, string | number>;
  reasoning: InsightReason[];
  action?: { tab: string; labelKey: string };
  dedupeKey: string;
}

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const clamp = (n: number, lo = 5, hi = 98): number => Math.max(lo, Math.min(hi, Math.round(n)));

const stageWaterIndex = (stage: string): number =>
  ({ Sowing: 40, Germination: 55, Vegetative: 75, Flowering: 90, 'Pod Formation': 85, 'Grain Filling': 60, Harvest: 25 })[stage] ?? 50;

/** base confidence from data richness (0..1) */
const baseConfidence = (m: FarmerMemory): number => 0.45 + m.dataCompleteness / 100 * 0.4;

function buildSeed(m: FarmerMemory, seed: Omit<InsightSeed, 'confidence'> & { strength?: number }): InsightSeed {
  return {
    ...seed,
    confidence: clamp(baseConfidence(m) * 100 * (seed.strength ?? 1)),
  };
}

export function evaluateWeather(m: FarmerMemory): InsightSeed[] {
  const out: InsightSeed[] = [];
  const { weather } = m;
  const rain = weather.rainChance;
  const temp = weather.temp;
  const min = weather.minTemp;
  const max = weather.maxTemp;
  const humidity = weather.humidity;

  if (rain !== null && rain >= 65) {
    out.push(buildSeed(m, {
      type: 'rain',
      severity: rain >= 85 ? 'warning' : 'info',
      titleKey: 'adv.rain.title',
      bodyKey: 'adv.rain.body',
      params: { place: weather.location || m.farmer.village, rain, crop: m.farm.crop },
      strength: rain >= 85 ? 1.15 : 1,
      reasoning: [
        { reasonKey: 'adv.reason.rainChance', params: { rain } },
        ...(humidity !== null && humidity >= 70 ? [{ reasonKey: 'adv.reason.humidity', params: { humidity } }] : []),
      ],
      action: { tab: 'home', labelKey: 'adv.action.weather' },
      dedupeKey: `adv-rain-${todayKey()}`,
    }));
  }

  if ((temp !== null && temp >= 40) || (max !== null && max >= 42)) {
    const heat = Math.max(temp ?? 0, max ?? 0);
    out.push(buildSeed(m, {
      type: 'heat',
      severity: 'critical',
      titleKey: 'adv.heat.title',
      bodyKey: 'adv.heat.body',
      params: { place: weather.location || m.farmer.village, temp: heat, crop: m.farm.crop },
      strength: 1.1,
      reasoning: [
        { reasonKey: 'adv.reason.heatTemp', params: { temp: heat } },
        { reasonKey: 'adv.reason.stageWater', params: { stage: m.farm.stage, index: stageWaterIndex(m.farm.stage) } },
      ],
      action: { tab: 'home', labelKey: 'adv.action.weather' },
      dedupeKey: `adv-heat-${todayKey()}`,
    }));

    // Water recommendation rides along with heat.
    out.push(buildSeed(m, {
      type: 'water',
      severity: 'warning',
      titleKey: 'adv.water.title',
      bodyKey: 'adv.water.body',
      params: { crop: m.farm.crop, area: m.farm.area, stage: m.farm.stage },
      strength: 0.95,
      reasoning: [
        { reasonKey: 'adv.reason.waterStage', params: { stage: m.farm.stage, index: stageWaterIndex(m.farm.stage) } },
        { reasonKey: 'adv.reason.heatSoil', params: { soil: m.farm.soilType } },
      ],
      action: { tab: 'home', labelKey: 'adv.action.weather' },
      dedupeKey: `adv-water-${todayKey()}`,
    }));
  }

  if (min !== null && min <= 4) {
    out.push(buildSeed(m, {
      type: 'frost',
      severity: 'warning',
      titleKey: 'adv.frost.title',
      bodyKey: 'adv.frost.body',
      params: { place: weather.location || m.farmer.village, temp: Math.round(min), crop: m.farm.crop },
      strength: 1,
      reasoning: [
        { reasonKey: 'adv.reason.frostMin', params: { temp: Math.round(min) } },
        { reasonKey: 'adv.reason.stageSensitive', params: { stage: m.farm.stage } },
      ],
      action: { tab: 'home', labelKey: 'adv.action.weather' },
      dedupeKey: `adv-frost-${todayKey()}`,
    }));
  }

  if (rain !== null && rain < 20 && (temp ?? 0) >= 38 && stageWaterIndex(m.farm.stage) >= 75) {
    out.push(buildSeed(m, {
      type: 'drought',
      severity: 'warning',
      titleKey: 'adv.drought.title',
      bodyKey: 'adv.drought.body',
      params: { crop: m.farm.crop, rain, temp: Math.round(temp ?? 0) },
      strength: 0.9,
      reasoning: [
        { reasonKey: 'adv.reason.dryForecast', params: { rain } },
        { reasonKey: 'adv.reason.stageWater', params: { stage: m.farm.stage, index: stageWaterIndex(m.farm.stage) } },
      ],
      action: { tab: 'home', labelKey: 'adv.action.water' },
      dedupeKey: `adv-drought-${todayKey()}`,
    }));
  }

  return out;
}

export function evaluateDisease(m: FarmerMemory): InsightSeed[] {
  const out: InsightSeed[] = [];
  const humidity = m.weather.humidity;
  const sensitive = ['Flowering', 'Pod Formation', 'Vegetative', 'Grain Filling'].includes(m.farm.stage);
  const warm = (m.weather.temp ?? 0) >= 25;
  const recentScan = m.activities.scanCount > 0;

  if (humidity !== null && humidity >= 80 && sensitive && warm) {
    out.push(buildSeed(m, {
      type: 'disease',
      severity: 'critical',
      titleKey: 'adv.disease.title',
      bodyKey: 'adv.disease.body',
      params: { crop: m.farm.crop, stage: m.farm.stage, humidity },
      strength: 1.15,
      reasoning: [
        { reasonKey: 'adv.reason.diseaseClimate', params: { humidity, temp: Math.round(m.weather.temp ?? 0) } },
        { reasonKey: 'adv.reason.stageSensitive', params: { stage: m.farm.stage } },
        ...(recentScan ? [{ reasonKey: 'adv.reason.pastScans', params: { count: m.activities.scanCount } }] : []),
      ],
      action: { tab: 'crop-doctor', labelKey: 'adv.action.scan' },
      dedupeKey: `adv-disease-${todayKey()}`,
    }));
  } else if (humidity !== null && humidity >= 70 && sensitive) {
    out.push(buildSeed(m, {
      type: 'disease',
      severity: 'warning',
      titleKey: 'adv.diseaseWatch.title',
      bodyKey: 'adv.diseaseWatch.body',
      params: { crop: m.farm.crop, stage: m.farm.stage, humidity },
      strength: 0.9,
      reasoning: [
        { reasonKey: 'adv.reason.diseaseClimate', params: { humidity, temp: Math.round(m.weather.temp ?? 0) } },
        { reasonKey: 'adv.reason.stageSensitive', params: { stage: m.farm.stage } },
      ],
      action: { tab: 'crop-doctor', labelKey: 'adv.action.scan' },
      dedupeKey: `adv-disease-watch-${todayKey()}`,
    }));
  }

  if (recentScan && m.activities.scanCount >= 2) {
    out.push(buildSeed(m, {
      type: 'general',
      severity: 'info',
      titleKey: 'adv.scanPattern.title',
      bodyKey: 'adv.scanPattern.body',
      params: { count: m.activities.scanCount },
      strength: 0.8,
      reasoning: [
        { reasonKey: 'adv.reason.pastScans', params: { count: m.activities.scanCount } },
        { reasonKey: 'adv.reason.diseaseHistory' },
      ],
      action: { tab: 'crop-doctor', labelKey: 'adv.action.scan' },
      dedupeKey: `adv-scan-pattern-${todayKey()}`,
    }));
  }

  return out;
}

export function evaluateMarket(m: FarmerMemory): InsightSeed[] {
  const out: InsightSeed[] = [];
  const crop = m.farm.crop.toLowerCase();
  const own = m.mandi.find((p) => p.crop.toLowerCase() === crop);
  const mover = [...m.mandi].sort(
    (a, b) => Math.abs(Number(b.change?.replace(/[^\d]/g, '') || 0)) - Math.abs(Number(a.change?.replace(/[^\d]/g, '') || 0)),
  )[0];

  if (own && own.status !== 'stable' && own.price > 0) {
    const up = own.status === 'up';
    out.push(buildSeed(m, {
      type: 'market',
      severity: up ? 'positive' : 'warning',
      titleKey: up ? 'adv.marketUp.title' : 'adv.marketDown.title',
      bodyKey: up ? 'adv.marketUp.body' : 'adv.marketDown.body',
      params: { crop: m.farm.crop, price: own.price.toLocaleString('en-IN'), change: own.change, market: own.market },
      strength: up ? 1.05 : 0.95,
      reasoning: [
        { reasonKey: 'adv.reason.priceMove', params: { crop: m.farm.crop, change: own.change, market: own.market } },
        { reasonKey: 'adv.reason.stageSell', params: { stage: m.farm.stage } },
      ],
      action: { tab: 'mandi', labelKey: 'adv.action.mandi' },
      dedupeKey: `adv-market-${crop}-${todayKey()}`,
    }));
  }

  if (mover && !own) {
    out.push(buildSeed(m, {
      type: 'market',
      severity: 'info',
      titleKey: 'adv.marketWatch.title',
      bodyKey: 'adv.marketWatch.body',
      params: { crop: mover.crop, price: mover.price.toLocaleString('en-IN'), change: mover.change, market: mover.market },
      strength: 0.85,
      reasoning: [
        { reasonKey: 'adv.reason.topMover', params: { crop: mover.crop, change: mover.change } },
        { reasonKey: 'adv.reason.watchCrop', params: { crop: m.farm.crop } },
      ],
      action: { tab: 'mandi', labelKey: 'adv.action.mandi' },
      dedupeKey: `adv-market-watch-${todayKey()}`,
    }));
  }

  return out;
}

export function evaluateYield(m: FarmerMemory): InsightSeed[] {
  const out: InsightSeed[] = [];
  const stage = m.farm.stage;
  const heatRisk = (m.weather.temp ?? 0) >= 38 || (m.weather.maxTemp ?? 0) >= 40;

  if ((stage === 'Flowering' || stage === 'Pod Formation') && heatRisk) {
    out.push(buildSeed(m, {
      type: 'yield',
      severity: 'warning',
      titleKey: 'adv.yield.title',
      bodyKey: 'adv.yield.body',
      params: { crop: m.farm.crop, stage },
      strength: 1.05,
      reasoning: [
        { reasonKey: 'adv.reason.flowerDrop', params: { stage } },
        { reasonKey: 'adv.reason.heatYield', params: { temp: Math.round(m.weather.temp ?? 0) } },
      ],
      action: { tab: 'home', labelKey: 'adv.action.water' },
      dedupeKey: `adv-yield-${todayKey()}`,
    }));
  }

  if (m.activities.harvestDays !== null && m.activities.harvestDays <= 30 && m.activities.harvestDays >= 0) {
    out.push(buildSeed(m, {
      type: 'harvest',
      severity: m.activities.harvestDays <= 7 ? 'warning' : 'info',
      titleKey: 'adv.harvest.title',
      bodyKey: 'adv.harvest.body',
      params: { crop: m.farm.crop, days: m.activities.harvestDays },
      strength: 0.95,
      reasoning: [
        { reasonKey: 'adv.reason.harvestWindow', params: { days: m.activities.harvestDays } },
        { reasonKey: 'adv.reason.harvestBook' },
      ],
      action: { tab: 'tractors', labelKey: 'adv.action.book' },
      dedupeKey: `adv-harvest-${todayKey()}`,
    }));
  }

  return out;
}

export function evaluateProfit(m: FarmerMemory): InsightSeed[] {
  const out: InsightSeed[] = [];
  const { incomeTotal, expenseTotal, ledgerEntries } = m.activities;
  if (ledgerEntries === 0) return out;

  const net = incomeTotal - expenseTotal;
  if (net < 0) {
    out.push(buildSeed(m, {
      type: 'profit',
      severity: 'critical',
      titleKey: 'adv.profitLoss.title',
      bodyKey: 'adv.profitLoss.body',
      params: { loss: Math.abs(net).toLocaleString('en-IN'), expense: expenseTotal.toLocaleString('en-IN') },
      strength: 1,
      reasoning: [
        { reasonKey: 'adv.reason.ledgerGap', params: { income: incomeTotal.toLocaleString('en-IN'), expense: expenseTotal.toLocaleString('en-IN') } },
        { reasonKey: 'adv.reason.costReview' },
      ],
      action: { tab: 'analytics', labelKey: 'adv.action.ledger' },
      dedupeKey: `adv-profit-loss-${todayKey()}`,
    }));
  } else {
    out.push(buildSeed(m, {
      type: 'profit',
      severity: 'positive',
      titleKey: 'adv.profitHealthy.title',
      bodyKey: 'adv.profitHealthy.body',
      params: { net: net.toLocaleString('en-IN'), income: incomeTotal.toLocaleString('en-IN') },
      strength: 0.9,
      reasoning: [
        { reasonKey: 'adv.reason.ledgerMargin', params: { net: net.toLocaleString('en-IN'), income: incomeTotal.toLocaleString('en-IN') } },
        { reasonKey: 'adv.reason.ploughBack', params: { crop: m.farm.crop } },
      ],
      action: { tab: 'analytics', labelKey: 'adv.action.ledger' },
      dedupeKey: `adv-profit-${todayKey()}`,
    }));
  }

  return out;
}

export function evaluateTasks(m: FarmerMemory): InsightSeed[] {
  const out: InsightSeed[] = [];
  if (m.activities.pendingTasks === 0) return out;

  const rainSoon = m.weather.rainChance !== null && m.weather.rainChance >= 65;
  const taskCount = m.activities.pendingTasks;
  const completedShare = m.activities.taskCount > 0
    ? Math.round((1 - m.activities.pendingTasks / m.activities.taskCount) * 100)
    : 0;

  out.push(buildSeed(m, {
    type: 'task',
    severity: rainSoon ? 'warning' : 'info',
    titleKey: 'adv.tasks.title',
    bodyKey: rainSoon ? 'adv.tasks.rainBody' : 'adv.tasks.body',
    params: { pending: taskCount, crop: m.farm.crop, rain: m.weather.rainChance ?? 0, done: completedShare },
    strength: 0.95,
    reasoning: [
      { reasonKey: 'adv.reason.tasksPending', params: { pending: taskCount, done: completedShare } },
      ...(rainSoon ? [{ reasonKey: 'adv.reason.tasksRain', params: { rain: m.weather.rainChance ?? 0 } }] : []),
    ],
    action: { tab: 'profile', labelKey: 'adv.action.tasks' },
    dedupeKey: `adv-tasks-${todayKey()}`,
  }));

  return out;
}

export function evaluateSchemes(m: FarmerMemory): InsightSeed[] {
  const out: InsightSeed[] = [];
  const now = new Date();
  const schemes = [
    { id: 'pmkisan', name: 'PM-KISAN', day: 5, tab: 'schemes' },
    { id: 'kcc', name: 'KCC', day: 18, tab: 'loans' },
    { id: 'pmfby', name: 'PM Fasal Bima', day: 10, tab: 'insurance' },
  ];
  for (const s of schemes) {
    const target = new Date(now.getFullYear(), now.getMonth() + 1, s.day);
    const days = Math.ceil((target.getTime() - now.getTime()) / 86400000);
    if (days > 0 && days <= 10) {
      out.push(buildSeed(m, {
        type: 'scheme',
        severity: days <= 3 ? 'warning' : 'info',
        titleKey: 'adv.scheme.title',
        bodyKey: 'adv.scheme.body',
        params: { scheme: `i18n:adv.scheme.${s.id}`, days },
        strength: 0.9,
        reasoning: [
          { reasonKey: 'adv.reason.schemeDeadline', params: { scheme: s.name, days } },
          { reasonKey: 'adv.reason.schemeEligible', params: { crop: m.farm.crop } },
        ],
        action: { tab: s.tab, labelKey: 'adv.action.apply' },
        dedupeKey: `adv-scheme-${s.id}-${todayKey()}`,
      }));
    }
  }
  return out;
}

export function evaluateGeneral(m: FarmerMemory): InsightSeed[] {
  // Personalized daily summary — the "dedicated advisor" touch.
  const insights = [m.weather.temp, m.weather.rainChance, m.mandi.length, m.activities.pendingTasks]
    .filter((v): v is number => v !== null && v !== undefined);

  return [buildSeed(m, {
    type: 'general',
    severity: 'info',
    titleKey: 'adv.summary.title',
    bodyKey: 'adv.summary.body',
    params: {
      crop: m.farm.crop,
      stage: m.farm.stage,
      area: m.farm.area,
      village: m.farmer.village,
      soil: m.farm.soilType,
    },
    strength: 0.8 + Math.min(0.2, m.dataCompleteness / 100 * 0.2),
    reasoning: [
      { reasonKey: 'adv.reason.farmProfile', params: { crop: m.farm.crop, stage: m.farm.stage, area: m.farm.area } },
      ...(insights.length >= 3 ? [{ reasonKey: 'adv.reason.multiSource' }] : []),
    ],
    action: { tab: 'ai-chat', labelKey: 'adv.action.ask' },
    dedupeKey: `adv-summary-${todayKey()}`,
  })];
}

/** Runs every evaluator and returns fresh, de-duplicated insights. */
export function generateRecommendations(m: FarmerMemory): AdvisorInsight[] {
  const seeds = [
    ...evaluateWeather(m),
    ...evaluateDisease(m),
    ...evaluateMarket(m),
    ...evaluateYield(m),
    ...evaluateProfit(m),
    ...evaluateTasks(m),
    ...evaluateSchemes(m),
    ...evaluateGeneral(m),
  ];

  const seen = new Set<string>();
  const insights: AdvisorInsight[] = [];
  for (const seed of seeds) {
    if (seen.has(seed.dedupeKey)) continue;
    seen.add(seed.dedupeKey);
    insights.push({
      ...seed,
      id: `${seed.dedupeKey}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      acked: false,
    });
  }
  return insights.sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2, positive: 3 } as Record<InsightSeverity, number>;
    return sev[a.severity] - sev[b.severity] || b.confidence - a.confidence;
  });
}
