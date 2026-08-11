import type { Language } from '@/contexts/LanguageContext';
import type {
  IFarmerProfile,
  FarmLandUnit,
  IrrigationType,
} from '@/features/profile/domain/models/FarmerProfile';

/**
 * Farm Onboarding — Personalization Data Model.
 * Every answer feeds the AI so the dashboard is ready on day one.
 */

export const ONBOARDING_STORAGE_KEY = 'agri_farm_onboarding_v1';

export interface ILivestockCounts {
  cows: number;
  buffaloes: number;
  goatsOrSheep: number;
  poultry: number;
  bullocks: number;
}

export interface IOnboardingData {
  language: Language;
  fullName: string;
  ageGroup: string;
  state: string;
  district: string;
  village: string;
  farmSize: string;
  landUnit: FarmLandUnit;
  ownership: string;
  primaryCrops: string[];
  secondaryCrops: string[];
  cropStage: string;
  waterSources: string[];
  machinery: string[];
  livestock: ILivestockCounts;
  interests: string[];
  permissions: {
    location: boolean;
    notifications: boolean;
    camera: boolean;
    gallery: boolean;
  };
  /** Furthest onboarding step reached — enables offline resume on revisit. */
  lastStep: number;
  completedAt: string;
}

export const defaultOnboardingData = (language: Language): IOnboardingData => ({
  language,
  fullName: '',
  ageGroup: '',
  state: '',
  district: '',
  village: '',
  farmSize: '',
  landUnit: 'Acres',
  ownership: '',
  primaryCrops: [],
  secondaryCrops: [],
  cropStage: '',
  waterSources: [],
  machinery: [],
  livestock: { cows: 0, buffaloes: 0, goatsOrSheep: 0, poultry: 0, bullocks: 0 },
  interests: [],
  permissions: { location: false, notifications: false, camera: false, gallery: false },
  lastStep: 0,
  completedAt: '',
});

export const AGE_GROUPS = ['Under 18', '18–25', '26–40', '41–60', '60+'];

export const OWNERSHIP_OPTIONS = ['Owned', 'Leased', 'Partly leased'];

export const LAND_UNITS: FarmLandUnit[] = ['Acres', 'Hectares', 'Bigha', 'Guntha', 'Kanal'];

export const FARM_SIZES: { label: string; value: string; unit: FarmLandUnit }[] = [
  { label: 'Small · < 2 ac', value: '1', unit: 'Acres' },
  { label: 'Medium · 2–5 ac', value: '3', unit: 'Acres' },
  { label: 'Large · 5–15 ac', value: '8', unit: 'Acres' },
  { label: 'Very large · 15+ ac', value: '18', unit: 'Acres' },
];

export const CROP_STAGES = [
  'Pre-sowing',
  'Sowing',
  'Vegetative growth',
  'Flowering',
  'Harvesting',
  'Harvested',
];

export const WATER_SOURCES = ['Drip irrigation', 'Canal', 'Rain-fed', 'Borewell', 'Open well'];

export const PRIMARY_CROPS = [
  'Wheat (Gehun)',
  'Paddy / Rice (Dhan)',
  'Cotton (Kapas)',
  'Sugarcane (Ganna)',
  'Mustard (Sarson)',
  'Soyabean',
  'Maize (Makka)',
  'Gram / Chickpea (Chana)',
  'Groundnut (Moongfali)',
  'Potato (Aloo)',
  'Onion (Pyaaz)',
  'Tomato (Tamatar)',
];

export const SECONDARY_CROPS = [
  'Turmeric (Haldi)',
  'Chilli (Mirchi)',
  'Bajra / Pearl Millet',
  'Jowar / Sorghum',
  'Green vegetables',
  'Fodder crops',
  'Fruits / Mango',
  'Pulses (Dal)',
];

export const MACHINERY_OPTIONS = [
  'Tractor',
  'Cultivator',
  'Rotavator',
  'Seed drill / Planter',
  'Sprayer',
  'Thresher',
  'Combine Harvester',
  'Submersible pump',
];

export const LIVESTOCK_OPTIONS: { key: keyof ILivestockCounts; label: string; emoji: string }[] = [
  { key: 'cows', label: 'Cows', emoji: '🐄' },
  { key: 'buffaloes', label: 'Buffaloes', emoji: '🐃' },
  { key: 'goatsOrSheep', label: 'Goats / Sheep', emoji: '🐐' },
  { key: 'poultry', label: 'Poultry', emoji: '🐔' },
  { key: 'bullocks', label: 'Bullocks', emoji: '🐂' },
];

export const INTEREST_OPTIONS = [
  { id: 'schemes', label: 'Government Schemes', emoji: '🏛️' },
  { id: 'market', label: 'Marketplace', emoji: '🛒' },
  { id: 'weather', label: 'Weather Alerts', emoji: '⛅' },
  { id: 'mandi', label: 'Mandi Prices', emoji: '📈' },
  { id: 'protection', label: 'Crop Protection', emoji: '🛡️' },
  { id: 'organic', label: 'Organic Farming', emoji: '🌿' },
  { id: 'equipment', label: 'Equipment Rental', emoji: '🚜' },
];

export const PERMISSION_OPTIONS = [
  {
    id: 'location' as const,
    title: 'Location',
    emoji: '📍',
    why: 'To show mandi prices, weather and schemes for your exact village — not the whole district.',
  },
  {
    id: 'notifications' as const,
    title: 'Notifications',
    emoji: '🔔',
    why: 'To alert you the moment mandi prices cross your target, or when rain/heat warnings hit your fields.',
  },
  {
    id: 'camera' as const,
    title: 'Camera',
    emoji: '📷',
    why: 'So Crop Doctor can diagnose a sick leaf from a photo, and you can upload your harvest photos.',
  },
  {
    id: 'gallery' as const,
    title: 'Gallery',
    emoji: '🖼️',
    why: 'To attach photos of your farm, receipts and documents when claiming schemes or selling produce.',
  },
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana', 'Karnataka',
  'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'West Bengal',
];

/* ── Persistence ─────────────────────────────────────────────────────────── */

export const saveOnboardingData = (data: IOnboardingData) => {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage full — fail silently */
  }
};

export const loadOnboardingData = (fallbackLanguage: Language): IOnboardingData => {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return defaultOnboardingData(fallbackLanguage);
    const parsed = JSON.parse(raw) as Partial<IOnboardingData>;
    return { ...defaultOnboardingData(fallbackLanguage), ...parsed };
  } catch {
    return defaultOnboardingData(fallbackLanguage);
  }
};

export const hasOnboardingData = () => {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

/* ── Map onboarding answers → the enterprise Farmer Profile ─────────────── */

export const buildFarmerProfile = (data: IOnboardingData, userId: string): IFarmerProfile => {
  const water = data.waterSources[0] ?? '';
  const irrigationType: IrrigationType =
    water === 'Drip irrigation' ? 'Drip Irrigation'
    : water === 'Canal' ? 'Canal Irrigation'
    : water === 'Borewell' ? 'Open Borewell'
    : 'Rainfed / Monsoon';

  return {
    id: userId,
    personal: {
      fullName: data.fullName || 'Guest Farmer',
      mobileNumber: '',
      gender: 'Prefer not to say',
      isAadhaarVerified: false,
    },
    location: {
      villageOrTehsil: data.village,
      district: data.district,
      state: data.state,
      pinCode: '',
      isLocationPermissionGranted: data.permissions.location,
    },
    farmSpecs: {
      totalArea: Number(data.farmSize) || 0,
      landUnit: data.landUnit,
      soilType: 'Alluvial',
      irrigationType,
    },
    crops: [...data.primaryCrops, ...data.secondaryCrops],
    machineryOwned: data.machinery,
    livestock: data.livestock,
    preferredLanguage: data.language,
    profilePictureUrl: undefined,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
};

/* ── First-day AI Recommendations ────────────────────────────────────────── */

export interface IRecommendations {
  weather: { emoji: string; temp: string; title: string; detail: string };
  mandi: { crop: string; price: string; market: string; note: string };
  schemes: { title: string; detail: string }[];
  tasks: string[];
}

const CROP_PRICES: Record<string, number> = {
  'Wheat (Gehun)': 2425,
  'Paddy / Rice (Dhan)': 2300,
  'Cotton (Kapas)': 7200,
  'Sugarcane (Ganna)': 380,
  'Mustard (Sarson)': 5650,
  'Soyabean': 4600,
  'Maize (Makka)': 2090,
  'Gram / Chickpea (Chana)': 5440,
  'Groundnut (Moongfali)': 5800,
  'Potato (Aloo)': 1450,
  'Onion (Pyaaz)': 2100,
  'Tomato (Tamatar)': 1200,
  'Turmeric (Haldi)': 9500,
  'Chilli (Mirchi)': 8500,
};

/** Task copy is stored as i18n keys so the same logic renders in every language. */
const STAGE_TASK_KEYS: Record<string, string[]> = {
  'Pre-sowing': ['rec.task.pre0', 'rec.task.pre1', 'rec.task.pre2'],
  'Sowing': ['rec.task.sow0', 'rec.task.sow1', 'rec.task.sow2'],
  'Vegetative growth': ['rec.task.veg0', 'rec.task.veg1', 'rec.task.veg2'],
  'Flowering': ['rec.task.flo0', 'rec.task.flo1', 'rec.task.flo2'],
  'Harvesting': ['rec.task.har0', 'rec.task.har1', 'rec.task.har2'],
  'Harvested': ['rec.task.done0', 'rec.task.done1', 'rec.task.done2'],
};

const defaultTaskKeys = ['rec.task.default0', 'rec.task.default1', 'rec.task.default2'];

type RecommendT = (key: string) => string;
const identity = (key: string): string => key;

export const generateRecommendations = (data: IOnboardingData, t: RecommendT = identity): IRecommendations => {
  const month = new Date().getMonth(); // 0 = Jan
  const season = month >= 2 && month <= 4 ? 'summer' : month >= 5 && month <= 8 ? 'monsoon' : 'winter';

  const NORTH = ['Punjab', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Bihar'];
  const SOUTH = ['Tamil Nadu', 'Karnataka', 'Telangana', 'Andhra Pradesh', 'Kerala'];
  const region = SOUTH.includes(data.state) ? 'south' : NORTH.includes(data.state) ? 'north' : 'central';

  let temp = 24;
  if (season === 'summer') temp = region === 'south' ? 36 : 39;
  if (season === 'monsoon') temp = region === 'south' ? 30 : 28;
  if (season === 'winter') temp = region === 'north' ? 14 : region === 'south' ? 27 : 20;

  const weatherEmoji = season === 'monsoon' ? '🌧️' : season === 'summer' ? '☀️' : '⛅';
  const weatherTitle = season === 'monsoon'
    ? t('rec.weather.monsoon')
    : season === 'summer'
      ? t('rec.weather.summer')
      : t('rec.weather.winter');
  const humidityPct = season === 'monsoon' ? 78 : season === 'summer' ? 42 : 55;
  const rainKey = season === 'monsoon' ? 'rec.weather.rainMonsoon' : season === 'summer' ? 'rec.weather.rainSummer' : 'rec.weather.rainWinter';

  const primaryCrop = data.primaryCrops[0] ?? 'Wheat (Gehun)';
  const price = CROP_PRICES[primaryCrop] ?? 3000;
  const market = data.district ? `${data.district} APMC` : 'Nearest APMC';
  const variety = Math.round(price * (0.96 + (data.primaryCrops.length % 5) * 0.01));

  const schemes: { title: string; detail: string }[] = [];
  schemes.push({ title: t('rec.scheme.pmkisan'), detail: t('rec.scheme.pmkisanD') });
  if (data.waterSources.includes('Drip irrigation')) {
    schemes.push({ title: t('rec.scheme.kusum'), detail: t('rec.scheme.kusumD') });
  }
  if (data.interests.includes('protection') || data.interests.includes('weather')) {
    schemes.push({ title: t('rec.scheme.fasalBima'), detail: t('rec.scheme.fasalBimaD') });
  }
  if (data.interests.includes('organic')) {
    schemes.push({ title: t('rec.scheme.pkvy'), detail: t('rec.scheme.pkvyD') });
  }
  schemes.push({ title: t('rec.scheme.kcc'), detail: t('rec.scheme.kccD') });
  if (data.farmSize && Number(data.farmSize) >= 8) {
    schemes.push({ title: t('rec.scheme.mech'), detail: t('rec.scheme.mechD') });
  }

  const tasks = (STAGE_TASK_KEYS[data.cropStage] ?? defaultTaskKeys).map((k) => t(k));

  return {
    weather: {
      emoji: weatherEmoji,
      temp: `${temp}°C`,
      title: weatherTitle,
      detail: t('rec.weather.detail')
        .replace('{village}', data.village || t('onb.ai.farmer'))
        .replace('{humidity}', t('rec.weather.humidity').replace('{pct}', String(humidityPct)))
        .replace('{rain}', t(rainKey)),
    },
    mandi: {
      crop: t(`opt:${primaryCrop}`),
      price: `₹${variety.toLocaleString('en-IN')}`,
      market,
      note: t('rec.mandi.note').replace('{district}', data.district || 'Nearest'),
    },
    schemes: schemes.slice(0, 4),
    tasks,
  };
};
