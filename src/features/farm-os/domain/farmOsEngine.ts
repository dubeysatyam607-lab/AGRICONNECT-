import type {
  ActiveCrop, CalendarEntry, ExpenseCategory, FarmHealth, FarmOsState, FarmReport,
  FinanceSnapshot, MarketInput, RecommendationItem, ReportKind, WeatherInput,
} from './farmOsTypes';

const getFarm = (farmId: string, s: FarmOsState) =>
  s.farms.find((f) => f.id === farmId) ?? s.farms[0];

const getActiveCrop = (farmId: string, s: FarmOsState): ActiveCrop | undefined =>
  s.crops.find((c) => c.farmId === farmId && c.stage !== 'harvest');

/**
 * Farm OS — recommendation engine.
 * Produces the Digital Farm Twin's proactive intelligence: health score,
 * smart calendar, personalized recommendations and auto reports, all derived
 * from the farm profile + crop stage + weather + market + history.
 */

const clamp = (n: number, lo = 0, hi = 100): number => Math.min(hi, Math.max(lo, n));

const daysUntil = (iso: string): number =>
  Math.round((new Date(iso).getTime() - Date.now()) / 86400000);

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ── Farm Health Score ───────────────────────────────────────────────────── */

export function computeHealth(
  farmId: string,
  weather: WeatherInput,
  s: FarmOsState,
): FarmHealth {
  const crop = s.crops.find((c) => c.farmId === farmId && c.stage !== 'harvest');
  const events = s.timeline.filter((e) => e.farmId === farmId);
  const calendar = s.calendar.filter((e) => e.farmId === farmId);
  const farm = getFarm(farmId, s);

  const diseaseHits = events.filter((e) => e.type === 'disease').slice(-3);
  const disease = diseaseHits.length === 0 ? 90 : diseaseHits.some((e) => e.title.toLowerCase().includes('detected')) ? 45 : 80;

  const cropHealth = crop ? clamp(100 - disease / 2 + (crop.stage === 'flowering' || crop.stage === 'fruiting' ? 8 : 0)) : 60;

  const weatherScore = clamp(
    100 - Math.max(0, weather.temp - 36) * 4 - Math.max(0, weather.rainChance - 70) * 0.5,
  );

  const irrigationRank = { rainfed: 40, canal: 62, well: 70, sprinkler: 80, drip: 92 };
  const waterScore = clamp(irrigationRank[farm.irrigation] + (events.some((e) => e.type === 'irrigation' && daysUntil(e.date) > -7) ? 5 : 0));

  const total = calendar.length;
  const done = calendar.filter((e) => e.complete).length;
  const tasks = total === 0 ? 75 : Math.round((done / total) * 100);

  const soilBase = farm.soilType === 'Black Soil' ? 74 : 66;
  const soil = clamp(soilBase + (events.some((e) => e.title.toLowerCase().includes('scan') || e.type === 'sowing') ? 4 : -4));

  const factors = { crop: cropHealth, weather: weatherScore, water: waterScore, disease, tasks, soil };
  const score = Math.round(
    factors.crop * 0.3 + factors.weather * 0.15 + factors.water * 0.2 + factors.disease * 0.15 + factors.tasks * 0.1 + factors.soil * 0.1,
  );

  const prev = s.health[farmId]?.score ?? score;
  const trend = prev === score ? [...(s.health[farmId]?.trend ?? []).slice(-6), score] : [...(s.health[farmId]?.trend ?? []).slice(-6), score];
  return { score, trend: trend.slice(-7), factors };
}

/* ── Smart Calendar ──────────────────────────────────────────────────────── */

export function buildSmartCalendar(
  farmId: string,
  s: FarmOsState,
): CalendarEntry[] {
  const crop = s.crops.find((c) => c.farmId === farmId && c.stage !== 'harvest');
  if (!crop) return [];
  const farm = getFarm(farmId, s);
  const existing = s.calendar.filter((e) => e.farmId === farmId && !e.autoAdjust);

  const entries: CalendarEntry[] = [...existing];

  const irrigationEvery = farm.irrigation === 'drip' ? 7 : farm.irrigation === 'sprinkler' ? 5 : farm.irrigation === 'canal' ? 10 : 8;
  const lastIrrigation = s.timeline
    .filter((e) => e.farmId === farmId && e.type === 'irrigation')
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  let next = lastIrrigation ? addDays(lastIrrigation.date, irrigationEvery) : addDays(crop.sownAt, irrigationEvery);
  for (let i = 0; i < 3; i += 1) {
    if (daysUntil(next) < 0) { next = addDays(next, irrigationEvery); continue; }
    entries.push({ id: `cal-irr-${i}-${farmId}`, farmId, date: next, title: `Irrigation — ${farm.irrigation}`, type: 'irrigation', complete: false, autoAdjust: true });
    next = addDays(next, irrigationEvery);
  }

  if (crop.stage === 'flowering' || crop.stage === 'fruiting') {
    entries.push({ id: `cal-spray-${farmId}`, farmId, date: addDays(new Date().toISOString().slice(0, 10), 3), title: 'Foliar micronutrient spray', type: 'spray', complete: false, autoAdjust: true });
  }

  if (crop.stage === 'fruiting' || crop.stage === 'maturity') {
    entries.push({ id: `cal-harv-${farmId}`, farmId, date: crop.expectedHarvest, title: `Expected harvest — ${crop.crop}`, type: 'harvest', complete: false });
    const bookBy = addDays(crop.expectedHarvest, -14);
    if (daysUntil(bookBy) >= 0) {
      entries.push({ id: `cal-eq-${farmId}`, farmId, date: bookBy, title: `Book harvester / transport for ${crop.crop}`, type: 'equipment', complete: false });
    }
  }

  entries.push({ id: `cal-mkt-${farmId}`, farmId, date: addDays(new Date().toISOString().slice(0, 10), 5), title: `${crop.crop} price check — APMC`, type: 'scheme', complete: false });

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

/** If a weather risk appears, shift high-risk calendar tasks sooner. */
export function adjustCalendarForWeather(
  calendar: CalendarEntry[],
  weather: WeatherInput,
): CalendarEntry[] {
  const hot = weather.temp >= 38;
  const rain = weather.rainChance >= 70;
  return calendar.map((e) => {
    if (!hot && !rain) return e;
    if (e.type === 'irrigation' && hot) {
      const shifted = addDays(e.date, -1);
      return { ...e, date: shifted < new Date().toISOString().slice(0, 10) ? e.date : shifted, autoAdjust: true };
    }
    if (e.type === 'spray' && rain) {
      const shifted = addDays(e.date, 2);
      return { ...e, date: shifted, autoAdjust: true };
    }
    return e;
  });
}

/* ── Recommendations ─────────────────────────────────────────────────────── */

export function generateRecommendations(
  farmId: string,
  weather: WeatherInput,
  market: MarketInput,
  s: FarmOsState,
): RecommendationItem[] {
  const crop = s.crops.find((c) => c.farmId === farmId && c.stage !== 'harvest');
  const existing = s.recommendations.filter((r) => r.farmId === farmId && !r.done);
  if (!crop) return existing;
  const farm = getFarm(farmId, s);
  const recs: RecommendationItem[] = [];

  const push = (r: Omit<RecommendationItem, 'id' | 'farmId' | 'done'>) => {
    recs.push({ ...r, id: `rec-${recs.length}-${farmId}`, farmId, done: false });
  };

  if (weather.temp >= 38 && (crop.stage === 'flowering' || crop.stage === 'fruiting')) {
    push({
      category: 'irrigation', priority: 'high',
      title: 'Irrigate this evening — heat stress risk',
      body: `${crop.crop} at ${crop.stage} is heat-sensitive. A ${weather.temp}°C day is expected; evening irrigation protects flowers and pods.`,
      benefit: 'Prevents flower/pod drop, +8% yield',
      confidence: 92,
      reasons: [`${crop.stage} stage is heat-sensitive`, `${weather.temp}°C expected`, 'Soil moisture below optimum'],
      due: new Date().toISOString().slice(0, 10),
    });
  }

  if ((crop.stage === 'vegetative' || crop.stage === 'flowering') && !recs.some((r) => r.category === 'fertilizer')) {
    push({
      category: 'fertilizer', priority: crop.stage === 'vegetative' ? 'high' : 'medium',
      title: crop.stage === 'vegetative' ? 'Top-dress with Urea (40 kg/acre)' : 'Apply micronutrient foliar spray',
      body: crop.stage === 'vegetative'
        ? `${crop.crop} is building canopy — nitrogen now gives the best response before flowering.`
        : 'Boron and zinc at flowering boosts pod set and grain filling.',
      benefit: crop.stage === 'vegetative' ? '+10% vegetative vigour' : '+6% pod setting',
      confidence: crop.stage === 'vegetative' ? 88 : 84,
      reasons: ['Crop at ' + crop.stage, 'Soil test shows nutrient gap'],
      due: addDays(new Date().toISOString().slice(0, 10), 3),
    });
  }

  if (weather.humidity >= 80 && crop.stage !== 'sowing') {
    push({
      category: 'pesticide', priority: 'high',
      title: 'Spray for fungal disease — humid conditions',
      body: `${weather.humidity}% humidity plus ${crop.crop} at ${crop.stage} favours fungal attack. Preventive spray is cheaper than the cure.`,
      benefit: 'Protects against white rust / blight',
      confidence: 86,
      reasons: [`Humidity ${weather.humidity}%`, 'Warm nights favour disease'],
      due: addDays(new Date().toISOString().slice(0, 10), 2),
    });
  }

  if (daysUntil(crop.expectedHarvest) <= 60 && daysUntil(crop.expectedHarvest) > 10) {
    push({
      category: 'market', priority: 'medium',
      title: `Plan ${crop.crop} sell window`,
      body: market.status === 'up'
        ? `${crop.crop} moved up ₹${market.change} today. Prices usually peak 1–2 weeks before peak arrivals.`
        : `Prices softened ₹${Math.abs(market.change)} today — consider holding 2 weeks for recovery.`,
      benefit: market.status === 'up' ? 'Sell window could add ~₹1,200/quintal' : 'Avoid selling at the dip',
      confidence: 76,
      reasons: [`Price ${market.status === 'up' ? 'up' : 'down'} ₹${Math.abs(market.change)} today`, `Harvest in ~${daysUntil(crop.expectedHarvest)} days`],
      due: addDays(new Date().toISOString().slice(0, 10), 5),
    });
  }

  if (daysUntil(crop.expectedHarvest) <= 14 && daysUntil(crop.expectedHarvest) >= 0) {
    push({
      category: 'harvest', priority: 'high',
      title: `Get ready — harvest ${crop.crop} in ${daysUntil(crop.expectedHarvest)} days`,
      body: 'Book harvester and transport now; labour and machines fill fast in peak season.',
      benefit: 'Avoid 15–25% machine surcharge in peak',
      confidence: 90,
      reasons: [`Harvest window: ${crop.expectedHarvest}`, 'Equipment books out fast'],
      due: addDays(crop.expectedHarvest, -10),
    });
  }

  if (farm.areaAcres <= 10) {
    push({
      category: 'scheme', priority: 'low',
      title: 'PM-KISAN installment — check eligibility',
      body: `Your ${farm.areaAcres}-acre farm is within the small-farm limit. KCC-linked accounts get ₹6,000/year.`,
      benefit: '₹6,000/year direct support',
      confidence: 88,
      reasons: [`Farm size ${farm.areaAcres} acres`, 'KCC details on file'],
      due: addDays(new Date().toISOString().slice(0, 10), 7),
    });
  }

  const combined = [...recs, ...existing].slice(0, 6);
  const order = { high: 0, medium: 1, low: 2 };
  return combined.sort((a, b) => order[a.priority] - order[b.priority] || b.confidence - a.confidence);
}

/* ── Finance ─────────────────────────────────────────────────────────────── */

export function computeFinance(farmId: string, s: FarmOsState): FinanceSnapshot {
  const farm = getFarm(farmId, s);
  const expenses = s.expenses.filter((e) => e.farmId === farmId);
  const sales = s.sales.filter((e) => e.farmId === farmId);

  const byCategory = {} as Record<ExpenseCategory, number>;
  let totalExpense = 0;
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    totalExpense += e.amount;
  }
  for (const c of ['seeds', 'fertilizer', 'pesticide', 'labour', 'machinery', 'transport', 'other'] as ExpenseCategory[]) {
    byCategory[c] = byCategory[c] ?? 0;
  }

  const revenue = sales.reduce((a, b) => a + b.qty * b.pricePerUnit, 0);
  const profit = revenue - totalExpense;
  const costPerAcre = totalExpense / farm.areaAcres;
  const yieldPerAcre = revenue > 0 && farm.areaAcres > 0 ? (sales[0]?.qty ?? 0) / farm.areaAcres : 0;
  const marginPct = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  return { totalExpense, revenue, profit, costPerAcre, yieldPerAcre, byCategory, marginPct };
}

/* ── Reports ─────────────────────────────────────────────────────────────── */

export function generateReport(
  farmId: string,
  kind: ReportKind,
  s: FarmOsState,
): FarmReport {
  const crop = s.crops.find((c) => c.farmId === farmId);
  const finance = computeFinance(farmId, s);
  const health = computeHealth(farmId, s.weather, s);
  const weekExpense = s.expenses
    .filter((e) => e.farmId === farmId && Date.now() - new Date(e.date).getTime() < 7 * 86400000)
    .reduce((a, b) => a + b.amount, 0);

  const metric = (label: string, value: string) => ({ label, value });

  if (kind === 'daily') {
    const top = generateRecommendations(farmId, s.weather, s.market[crop?.crop ?? 'Soybean'] ?? { price: 0, change: 0, status: 'down' }, s)[0];
    return {
      id: `rep-daily-${farmId}-${new Date().toISOString().slice(0, 10)}`, farmId, kind,
      title: `Daily Summary — ${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}`,
      summary: top
        ? `Priority today: ${top.title}. Confidence ${top.confidence}%. ${crop ? crop.crop : 'Your farm'} health ${health.score}/100.`
        : `Farm health ${health.score}/100. No urgent actions — keep the schedule.`,
      metrics: [
        metric('Health score', `${health.score}/100`),
        metric('Today priority', top ? top.category : 'None'),
        metric('Weather', `${s.weather.temp}°C · ${s.weather.rainChance}% rain`),
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  if (kind === 'weekly') {
    return {
      id: `rep-weekly-${farmId}-${new Date().toISOString().slice(0, 10)}`, farmId, kind,
      title: `Weekly Report — ${crop?.crop ?? 'Farm'}`,
      summary: `Health ${health.score}/100 (${health.trend.length > 1 ? health.trend[health.trend.length - 1] - health.trend[health.trend.length - 2] >= 0 ? '+' : '' : ''}${health.trend.length > 1 ? health.trend[health.trend.length - 1] - health.trend[health.trend.length - 2] : 0} this week). Week spend ₹${weekExpense.toLocaleString('en-IN')}.`,
      metrics: [
        metric('Crop stage', crop?.stage ?? '—'),
        metric('Week spend', `₹${weekExpense.toLocaleString('en-IN')}`),
        metric('Tasks done', `${s.calendar.filter((e) => e.farmId === farmId && e.complete).length}/${s.calendar.filter((e) => e.farmId === farmId).length}`),
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  if (kind === 'monthly') {
    return {
      id: `rep-monthly-${farmId}-${new Date().toISOString().slice(0, 7)}`, farmId, kind,
      title: 'Monthly Performance Report',
      summary: `Total input spend ₹${finance.totalExpense.toLocaleString('en-IN')} (₹${Math.round(finance.costPerAcre)}/acre). ${finance.profit >= 0 ? 'Net margin positive.' : 'Reviewing input costs would help margins.'}`,
      metrics: [
        metric('Total expense', `₹${finance.totalExpense.toLocaleString('en-IN')}`),
        metric('Cost / acre', `₹${Math.round(finance.costPerAcre).toLocaleString('en-IN')}`),
        metric('Health', `${health.score}/100`),
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  if (kind === 'season') {
    const events = s.timeline.filter((e) => e.farmId === farmId);
    return {
      id: `rep-season-${farmId}-${new Date().toISOString().slice(0, 7)}`, farmId, kind,
      title: `Season Summary — ${crop?.crop ?? 'Farm'}`,
      summary: `${events.length} recorded activities from sowing (${crop?.sownAt ?? '—'}) to now. Health ${health.score}/100, water status ${health.factors.water}/100.`,
      metrics: [
        metric('Activities logged', String(events.length)),
        metric('Water score', `${health.factors.water}/100`),
        metric('Disease risk', `${health.factors.disease}/100`),
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  const sales = s.sales.filter((e) => e.farmId === farmId);
  return {
    id: `rep-harvest-${farmId}-${new Date().toISOString().slice(0, 10)}`, farmId, kind,
    title: 'Harvest Summary',
    summary: sales.length
      ? `${sales.length} sale${sales.length > 1 ? 's' : ''} totalling ₹${finance.revenue.toLocaleString('en-IN')}. Profit ₹${finance.profit.toLocaleString('en-IN')} (${finance.marginPct}% margin).`
      : 'No sales recorded yet this season. Log your harvest yield and sales for an automated summary.',
    metrics: [
      metric('Revenue', `₹${finance.revenue.toLocaleString('en-IN')}`),
      metric('Profit', `₹${finance.profit.toLocaleString('en-IN')}`),
      metric('Margin', `${finance.marginPct}%`),
    ],
    generatedAt: new Date().toISOString(),
  };
}

/* ── Selectors (exported for the store / hook) ───────────────────────────── */

export const activeCropOf = (s: FarmOsState): ActiveCrop | undefined =>
  getActiveCrop(s.activeFarmId, s);
