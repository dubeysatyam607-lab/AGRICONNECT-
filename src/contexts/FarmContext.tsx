import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CropStage =
  | 'Sowing'
  | 'Germination'
  | 'Vegetative'
  | 'Flowering'
  | 'Pod Formation'
  | 'Grain Filling'
  | 'Harvest';

export interface FarmProfile {
  crop: string;
  variety: string;
  stage: CropStage;
  farmArea: number;
  soilType: string;
}

export const COMMON_CROPS = [
  'Soybean', 'Wheat', 'Cotton', 'Onion', 'Tomato', 'Potato',
  'Mustard', 'Rice', 'Maize', 'Sugarcane', 'Chilli', 'Groundnut',
] as const;

export const CROP_STAGES: CropStage[] = [
  'Sowing', 'Germination', 'Vegetative', 'Flowering', 'Pod Formation', 'Grain Filling', 'Harvest',
];

const STORAGE_KEY = 'agri_farm_profile';

export const DEFAULT_FARM_PROFILE: FarmProfile = {
  crop: 'Soybean',
  variety: 'JS-9560',
  stage: 'Flowering',
  farmArea: 5.2,
  soilType: 'Black Soil',
};

interface FarmContextType {
  profile: FarmProfile;
  updateProfile: (patch: Partial<FarmProfile>) => void;
  resetProfile: () => void;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

const loadProfile = (): FarmProfile => {
  if (typeof window === 'undefined') return DEFAULT_FARM_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FARM_PROFILE;
    const parsed = JSON.parse(raw) as Partial<FarmProfile>;
    return { ...DEFAULT_FARM_PROFILE, ...parsed };
  } catch {
    return DEFAULT_FARM_PROFILE;
  }
};

export const FarmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<FarmProfile>(loadProfile);

  const updateProfile = (patch: Partial<FarmProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage full */ }
      }
      return next;
    });
  };

  const resetProfile = () => {
    setProfile(DEFAULT_FARM_PROFILE);
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
  };

  return (
    <FarmContext.Provider value={{ profile, updateProfile, resetProfile }}>
      {children}
    </FarmContext.Provider>
  );
};

const defaultFarmContext: FarmContextType = {
  profile: DEFAULT_FARM_PROFILE,
  updateProfile: () => {},
  resetProfile: () => {},
};

export const useFarm = () => {
  const context = useContext(FarmContext);
  return context || defaultFarmContext;
};
