import type { IWeatherModuleData } from '@/features/weather/domain/models/WeatherModels';
import type { IFarmerProfile } from '@/features/profile/domain/models/FarmerProfile';

export type AdviceIconKey = 'rain' | 'drop' | 'leaf' | 'market' | 'scheme';

export interface FarmAdviceItem {
  icon: AdviceIconKey;
  tone: string;
  title: string;
  sub: string;
  tab: string;
}

export interface FarmAdvice {
  heroLine: string;
  cropLabel: string;
  waterAdvice: string;
  items: FarmAdviceItem[];
}

/**
 * Pure derivation of the daily "what should the farmer do next" advice.
 * Uses the farmer's active crop/stage plus live weather (rain probability and
 * agri advisory) to produce the hero line and the AI Insight recommendations.
 * Market/scheme signals are honest prompts — no fabricated prices or deadlines.
 */
export function deriveFarmAdvice(profile: IFarmerProfile | null, weather: IWeatherModuleData | null): FarmAdvice {
  const rawCrop = (profile as any)?.crop || profile?.crops?.[0] || 'Standing Crop';
  // Strip parenthetical translations e.g. "Wheat (Gehun)" -> "Wheat"
  const crop = rawCrop.split('(')[0].trim() || 'Standing Crop';
  const stageLower = (profile as any)?.stage || 'active growth';

  const rainProb = weather?.daily?.[0]?.rainProbability ?? (weather?.live?.humidity != null && weather.live.humidity > 85 ? 40 : 0);
  const temp = weather?.live?.temp ?? 28;
  const humidity = weather?.live?.humidity ?? 50;
  const windSpeed = weather?.live?.windSpeed ?? 10;
  const isRainy = rainProb >= 40;
  const isHighWind = windSpeed > 15;
  const isHeatStress = temp >= 38;
  const isColdStress = temp <= 8;
  const isHighHumidity = humidity >= 75;

  let waterAdvice = 'Maintain routine soil moisture checks before irrigating';
  if (isRainy) {
    waterAdvice = `Rain ${Math.round(rainProb)}% expected — postpone irrigation to prevent waterlogging`;
  } else if (isHeatStress) {
    waterAdvice = `High temperature (${temp}°C) — irrigate during early morning or late evening to minimize evaporation`;
  } else {
    waterAdvice = `Dry weather (${Math.round(rainProb)}% rain) — light irrigation recommended if soil moisture is low`;
  }

  const heroLine = `${crop} (${stageLower}) — ${waterAdvice}.`;
  const cropLabel = `${crop} · ${stageLower}`;

  const items: FarmAdviceItem[] = [];

  // 1. Weather & Irrigation Card
  items.push({
    icon: isRainy ? 'rain' : 'drop',
    tone: 'bg-feature-weather/12 text-feature-weather',
    title: isRainy ? `Rain ${Math.round(rainProb)}% Expected` : `Rain Chance Low (${Math.round(rainProb)}%)`,
    sub: isRainy
      ? 'Postpone chemical spraying and check field drainage channels.'
      : 'Good window for scheduled irrigation and field intercultural operations.',
    tab: 'weather',
  });

  // 2. Spraying & Wind Precaution Card
  if (isHighWind) {
    items.push({
      icon: 'leaf',
      tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      title: `High Wind Speed (${windSpeed} km/h)`,
      sub: 'Avoid foliar/pesticide sprays today to prevent chemical drift and uneven coverage.',
      tab: 'weather',
    });
  } else if (isRainy) {
    items.push({
      icon: 'leaf',
      tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      title: 'Postpone Chemical Spraying',
      sub: 'Expected rain may wash away applied pesticides or foliar fertilizers.',
      tab: 'weather',
    });
  } else {
    items.push({
      icon: 'leaf',
      tone: 'bg-feature-doctor/12 text-feature-doctor',
      title: 'Favorable Spraying Window',
      sub: `Calm wind (${windSpeed} km/h) and clear conditions are suitable for planned field operations.`,
      tab: 'weather',
    });
  }

  // 3. Crop-Specific Agronomic Alert based on Crop + Weather
  const cropLower = crop.toLowerCase();
  let cropAdvisory = weather?.daily?.[0]?.agriAdvisory;
  if (!cropAdvisory) {
    if (isHighHumidity && temp >= 22) {
      if (cropLower.includes('wheat')) {
        cropAdvisory = 'High humidity & warm conditions — scout field for early signs of yellow rust on leaves.';
      } else if (cropLower.includes('mustard')) {
        cropAdvisory = 'Moist humid weather — inspect crop for white rust and aphid population buildup.';
      } else if (cropLower.includes('cotton')) {
        cropAdvisory = 'Humid environment — monitor closely for sucking pests and boll rot.';
      } else if (cropLower.includes('tomato') || cropLower.includes('potato')) {
        cropAdvisory = 'High humidity alert — monitor lower foliage for early/late blight symptoms.';
      } else if (cropLower.includes('paddy') || cropLower.includes('rice')) {
        cropAdvisory = 'Humid conditions — check for leaf blast and sheath blight symptoms.';
      } else {
        cropAdvisory = 'Elevated humidity — monitor standing crop for fungal foliar disease symptoms.';
      }
    } else if (isColdStress) {
      cropAdvisory = `Low temperature (${temp}°C) — provide light evening irrigation or mulch to protect roots from cold injury.`;
    } else {
      cropAdvisory = `Standard weather conditions favorable for routine ${crop} management. Check soil moisture before fertilizing.`;
    }
  }

  items.push({
    icon: 'leaf',
    tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    title: `${crop} Field Advisory`,
    sub: cropAdvisory,
    tab: 'weather',
  });

  // 4. Mandi Rates Card
  items.push({
    icon: 'market',
    tone: 'bg-feature-mandi/12 text-feature-mandi',
    title: `Mandi Rates for ${crop}`,
    sub: "Open Mandi Bhav for today's verified prices near you",
    tab: 'mandi',
  });

  // 5. Farm Schemes Card
  items.push({
    icon: 'scheme',
    tone: 'bg-feature-loans/12 text-feature-loans',
    title: 'Check Farm Schemes & Eligibility',
    sub: 'PM-KISAN, PMFBY Fasal Bima and MSP details in Schemes section',
    tab: 'schemes',
  });

  return { heroLine, cropLabel, waterAdvice, items };
}
