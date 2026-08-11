import type { IOnboardingData } from '@/features/auth/presentation/onboarding/onboardingData';
import { generateRecommendations } from '@/features/auth/presentation/onboarding/onboardingData';
import { interpolate } from '@/i18n/journey';

export interface CropData {
  id: string;
  name: string;
  nameHi: string;
  duration: number;
  irrigationDays: number[];
  fertilizationDays: number[];
  harvestDay: number;
}

export const TIMELINE_CROPS: CropData[] = [
  { id: 'wheat', name: 'Wheat', nameHi: 'गेहूं', duration: 120, irrigationDays: [21, 42, 60, 80, 100], fertilizationDays: [0, 21, 45], harvestDay: 120 },
  { id: 'rice', name: 'Rice', nameHi: 'धान', duration: 150, irrigationDays: [0, 14, 28, 42, 56, 70, 84, 98, 112, 126], fertilizationDays: [0, 21, 45, 70], harvestDay: 150 },
  { id: 'cotton', name: 'Cotton', nameHi: 'कपास', duration: 180, irrigationDays: [20, 40, 60, 80, 100, 120, 140, 160], fertilizationDays: [0, 30, 60, 90], harvestDay: 180 },
  { id: 'mustard', name: 'Mustard', nameHi: 'सरसों', duration: 110, irrigationDays: [25, 50, 75], fertilizationDays: [0, 25], harvestDay: 110 },
  { id: 'potato', name: 'Potato', nameHi: 'आलू', duration: 90, irrigationDays: [7, 21, 35, 50, 65], fertilizationDays: [0, 30, 50], harvestDay: 90 },
  { id: 'maize', name: 'Maize', nameHi: 'मक्का', duration: 90, irrigationDays: [14, 28, 45, 60, 75], fertilizationDays: [0, 25, 50], harvestDay: 90 },
  { id: 'soybean', name: 'Soybean', nameHi: 'सोयाबीन', duration: 100, irrigationDays: [20, 40, 60, 80], fertilizationDays: [0, 30, 60], harvestDay: 100 },
  { id: 'onion', name: 'Onion', nameHi: 'प्याज', duration: 100, irrigationDays: [7, 21, 35, 50, 65, 80], fertilizationDays: [0, 30, 60], harvestDay: 100 },
];

const CROP_LABEL_TO_TIMELINE_ID: Record<string, string> = {
  'Wheat (Gehun)': 'wheat',
  'Paddy / Rice (Dhan)': 'rice',
  'Cotton (Kapas)': 'cotton',
  'Mustard (Sarson)': 'mustard',
  'Potato (Aloo)': 'potato',
  'Maize (Makka)': 'maize',
  'Soyabean': 'soybean',
  'Onion (Pyaaz)': 'onion',
};

const TIMELINE_TO_SEASON_NAME: Record<string, string> = {
  wheat: 'Wheat',
  rice: 'Rice',
  cotton: 'Cotton',
  mustard: 'Mustard',
  potato: 'Potato',
  maize: 'Maize',
  soybean: 'Soybean',
  onion: 'Onion',
};

/** Timeline crop ids for the farmer's onboarding crop choices (deduped). */
export const getFarmerTimelineCropIds = (data: IOnboardingData): string[] =>
  Array.from(
    new Set(
      [...data.primaryCrops, ...data.secondaryCrops]
        .map((c) => CROP_LABEL_TO_TIMELINE_ID[c])
        .filter((id): id is string => Boolean(id)),
    ),
  );

/** Season-guide crop names (e.g. "Wheat", "Maize") for the farmer's crops. */
export const getFarmerSeasonCropNames = (data: IOnboardingData): string[] =>
  getFarmerTimelineCropIds(data)
    .map((id) => TIMELINE_TO_SEASON_NAME[id])
    .filter(Boolean);

export interface IGeneratedTask {
  id: string;
  label: string;
  done: boolean;
}

type TaskT = (key: string) => string;
const identity = (key: string): string => key;

/**
 * Day-one tasks derived from the farmer's onboarding answers: the first
 * irrigation & fertilization of their primary crop, stage-aware AI advice,
 * and a mandi check for that crop. Returns [] when no crop maps to a
 * timeline schedule (callers fall back to generic tasks).
 */
export const buildFarmerTasks = (data: IOnboardingData, t: TaskT = identity): IGeneratedTask[] => {
  const ids = getFarmerTimelineCropIds(data);
  if (ids.length === 0) return [];

  const crop = TIMELINE_CROPS.find((c) => c.id === ids[0]);
  const cropLabel = data.primaryCrops[0]?.split(' (')[0] ?? crop?.name ?? 'crop';

  const seen = new Set<string>();
  const tasks: IGeneratedTask[] = [];
  const push = (task: IGeneratedTask) => {
    if (seen.has(task.label)) return;
    seen.add(task.label);
    tasks.push(task);
  };

  if (crop) {
    const firstIrrigation = crop.irrigationDays.find((d) => d > 0);
    const firstFertilization = crop.fertilizationDays.find((d) => d > 0);
    if (firstIrrigation != null) {
      push({ id: `${crop.id}-irrigation`, label: interpolate(t('tasks.irrigate'), { crop: cropLabel, day: firstIrrigation }), done: false });
    }
    if (firstFertilization != null) {
      push({ id: `${crop.id}-fertilization`, label: interpolate(t('tasks.fertilize'), { crop: cropLabel, day: firstFertilization }), done: false });
    }
  }

  generateRecommendations(data, t).tasks.forEach((label, i) => {
    push({ id: `stage-${i}`, label, done: false });
  });

  push({ id: 'mandi', label: interpolate(t('tasks.mandiCheck'), { crop: cropLabel }), done: false });

  return tasks.slice(0, 5);
};
