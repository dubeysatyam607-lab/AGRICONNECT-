import type { IWeatherModuleData } from '@/features/weather/domain/models/WeatherModels';
import type { FarmProfile } from '@/contexts/FarmContext';

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
export function deriveFarmAdvice(profile: FarmProfile, weather: IWeatherModuleData | null): FarmAdvice {
  const crop = profile.crop || 'Soybean';
  const stage = profile.stage || 'Flowering';
  const stageLower = stage.toLowerCase();

  const rainProb = weather?.daily?.[0]?.rainProbability;
  const isRainy = rainProb != null && rainProb >= 40;

  const waterAdvice = isRainy
    ? `Rain ${Math.round(rainProb)}% expected — delay irrigation`
    : 'Irrigate before 4 PM — rain low';

  const heroLine = `${crop} at ${stageLower} stage — ${waterAdvice}.`;
  const cropLabel = `${crop} · ${stageLower} stage`;

  const items: FarmAdviceItem[] = [];

  if (rainProb != null) {
    items.push(
      isRainy
        ? {
            icon: 'rain',
            tone: 'bg-feature-weather/12 text-feature-weather',
            title: `Rain ${Math.round(rainProb)}% expected today`,
            sub: 'Delay pesticide spraying until skies clear',
            tab: 'weather',
          }
        : {
            icon: 'drop',
            tone: 'bg-feature-weather/12 text-feature-weather',
            title: `Rain low today (${Math.round(rainProb)}%)`,
            sub: 'Good window to irrigate before 4 PM',
            tab: 'weather',
          },
    );
  }

  const advisory = weather?.daily?.[0]?.agriAdvisory;
  if (advisory) {
    items.push({
      icon: 'leaf',
      tone: 'bg-feature-doctor/12 text-feature-doctor',
      title: "Today's field advisory",
      sub: advisory,
      tab: 'weather',
    });
  }

  items.push({
    icon: 'market',
    tone: 'bg-feature-mandi/12 text-feature-mandi',
    title: `Mandi rates for ${crop}`,
    sub: 'Open Mandi Bhav for today\'s verified prices near you',
    tab: 'mandi',
  });

  items.push({
    icon: 'scheme',
    tone: 'bg-feature-loans/12 text-feature-loans',
    title: 'Check farm schemes & eligibility',
    sub: 'PM-KISAN, PMKSY and MSP details in the Schemes section',
    tab: 'schemes',
  });

  return { heroLine, cropLabel, waterAdvice, items };
}
