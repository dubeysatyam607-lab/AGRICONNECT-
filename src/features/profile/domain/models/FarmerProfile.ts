/**
 * Enterprise Farmer Profile Domain Entity.
 * Represents the comprehensive agricultural identity of an Indian farmer across 14 key specifications.
 */

export type FarmLandUnit = 'Acres' | 'Hectares' | 'Bigha' | 'Guntha' | 'Kanal';
export type SoilType = 'Alluvial' | 'Black Cotton' | 'Red & Yellow' | 'Laterite' | 'Saline & Alkaline' | 'Arid & Desert' | 'Peaty & Marshy';
export type IrrigationType = 'Drip Irrigation' | 'Sprinkler System' | 'Tube Well' | 'Canal Irrigation' | 'Rainfed / Monsoon' | 'Open Borewell';
export type GenderType = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export interface IGpsCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: string;
}

export interface IFarmLocation {
  villageOrTehsil: string;
  district: string;
  state: string;
  pinCode: string;
  gpsCoordinates?: IGpsCoordinates;
  isLocationPermissionGranted: boolean;
  farmCentroidAddress?: string;
}

export interface IFarmAgriSpecs {
  totalArea: number;
  landUnit: FarmLandUnit;
  soilType: SoilType;
  irrigationType: IrrigationType;
  primaryWaterSource?: string;
}

export interface ILivestockInventory {
  cows: number;
  buffaloes: number;
  bullocks: number;
  goatsOrSheep: number;
  poultry: number;
}

export interface IFarmerPersonalDetails {
  fullName: string;
  mobileNumber: string;
  emailAddress?: string;
  gender: GenderType;
  dateOfBirth?: string;
  aadhaarNumber?: string; // Optional, stored masked when sent to UI
  isAadhaarVerified: boolean;
}

export interface IFarmerProfile {
  id: string; // Farmer User ID
  personal: IFarmerPersonalDetails;
  location: IFarmLocation;
  farmSpecs: IFarmAgriSpecs;
  crops: string[]; // e.g. ["Wheat", "Paddy (Rice)", "Cotton", "Sugarcane"]
  machineryOwned: string[]; // e.g. ["Tractor", "Harvester", "Rotavator", "Sprayer"]
  livestock: ILivestockInventory;
  preferredLanguage: string; // e.g. "en", "hi", "pa", "mr", "gu"
  profilePictureUrl?: string;
  updatedAt: string;
  createdAt: string;
}

/**
 * Major Indian Crops constants for multi-selection tags.
 */
export const MAJOR_INDIAN_CROPS = [
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
  'Bajra / Pearl Millet',
  'Jowar / Sorghum',
  'Turmeric (Haldi)',
  'Chilli (Mirchi)',
];

/**
 * Farm Machinery constants for multi-selection tags.
 */
export const MAJOR_FARM_MACHINERY = [
  'Tractor (4WD/2WD)',
  'Combine Harvester',
  'Rotavator',
  'Seed Drill / Planter',
  'Cultivator / Tiller',
  'Power Weeder',
  'Thresher',
  'Boom / Knapsack Sprayer',
  'Submersible Pump Set',
  'Laser Land Leveler',
  'Chaff Cutter',
];
