import { z } from 'zod';
import { FarmLandUnit, SoilType, IrrigationType, GenderType } from './FarmerProfile';

/**
 * Enterprise Resilient Zod Validation Schemas for Farmer Profile Management.
 * Protects against null, undefined, or malformed data while ensuring clean defaults.
 */

// Aadhaar validation: 12 numerical digits or formatted "XXXX-XXXX-1234"
export const aadhaarSchema = z
  .string()
  .nullish()
  .transform((val) => val?.trim() || '')
  .refine(
    (val) => {
      if (!val || val === '') return true;
      const digitsOnly = val.replace(/\D/g, '');
      return digitsOnly.length === 12;
    },
    { message: 'Aadhaar number must contain exactly 12 numerical digits.' }
  );

// PIN Code validation: 6 numerical digits for Indian postal codes
export const pinCodeSchema = z
  .string()
  .nullish()
  .transform((val) => val?.trim() || '')
  .refine(
    (val) => !val || /^[1-9][0-9]{5}$/.test(val),
    { message: 'Enter a valid 6-digit Indian PIN Code.' }
  );

// GPS Coordinates validation
export const gpsCoordinatesSchema = z
  .object({
    latitude: z.number().min(-90).max(90).nullish().transform((v) => v ?? 0),
    longitude: z.number().min(-180).max(180).nullish().transform((v) => v ?? 0),
    accuracyMeters: z.number().min(0).nullish().transform((v) => v ?? 0),
    timestamp: z.string().nullish().transform((v) => v || new Date().toISOString()),
  })
  .nullish();

// Farm Area validation
export const farmAreaSchema = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : Math.max(0, Math.min(num, 50000));
  });

// Personal Details validation
export const personalDetailsSchema = z
  .object({
    fullName: z.string().nullish().transform((val) => val?.trim() || ''),
    mobileNumber: z.string().nullish().transform((val) => val?.trim() || ''),
    emailAddress: z.string().nullish().transform((val) => val?.trim() || ''),
    gender: z
      .string()
      .nullish()
      .transform((val): GenderType => {
        if (val === 'Male' || val === 'Female' || val === 'Other') return val;
        return 'Prefer not to say';
      }),
    dateOfBirth: z.string().nullish().transform((val) => val?.trim() || ''),
    aadhaarNumber: aadhaarSchema,
    isAadhaarVerified: z.boolean().nullish().transform((val) => Boolean(val)),
  })
  .nullish()
  .transform((val) => ({
    fullName: val?.fullName?.trim() || '',
    mobileNumber: val?.mobileNumber?.trim() || '',
    emailAddress: val?.emailAddress?.trim() || '',
    gender: (val?.gender || 'Prefer not to say') as GenderType,
    dateOfBirth: val?.dateOfBirth?.trim() || '',
    aadhaarNumber: val?.aadhaarNumber?.trim() || '',
    isAadhaarVerified: Boolean(val?.isAadhaarVerified),
  }));

// Master Farmer Profile Schema
export const farmerProfileSchema = z
  .object({
    id: z.string().nullish().transform((val) => val || 'anon'),
    personal: personalDetailsSchema,
    location: z
      .object({
        villageOrTehsil: z.string().nullish().transform((val) => val?.trim() || ''),
        district: z.string().nullish().transform((val) => val?.trim() || ''),
        state: z.string().nullish().transform((val) => val?.trim() || ''),
        pinCode: pinCodeSchema,
        gpsCoordinates: gpsCoordinatesSchema,
        isLocationPermissionGranted: z.boolean().nullish().transform((val) => Boolean(val)),
        farmCentroidAddress: z.string().nullish().transform((val) => val?.trim() || ''),
      })
      .nullish()
      .transform((val) => ({
        villageOrTehsil: val?.villageOrTehsil || '',
        district: val?.district || '',
        state: val?.state || '',
        pinCode: val?.pinCode || '',
        gpsCoordinates: val?.gpsCoordinates || null,
        isLocationPermissionGranted: Boolean(val?.isLocationPermissionGranted),
        farmCentroidAddress: val?.farmCentroidAddress || '',
      })),
    farmSpecs: z
      .object({
        totalArea: farmAreaSchema,
        landUnit: z.string().nullish().transform((val): FarmLandUnit => (val as FarmLandUnit) || 'Acres'),
        soilType: z.string().nullish().transform((val): SoilType => (val as SoilType) || ('Alluvial' as SoilType)),
        irrigationType: z.string().nullish().transform((val): IrrigationType => (val as IrrigationType) || ('Rainfed / Monsoon' as IrrigationType)),
        primaryWaterSource: z.string().nullish().transform((val) => val?.trim() || ''),
      })
      .nullish()
      .transform((val) => ({
        totalArea: val?.totalArea ?? 0,
        landUnit: (val?.landUnit || 'Acres') as FarmLandUnit,
        soilType: (val?.soilType || 'Alluvial') as SoilType,
        irrigationType: (val?.irrigationType || 'Rainfed / Monsoon') as IrrigationType,
        primaryWaterSource: val?.primaryWaterSource || '',
      })),
    crops: z
      .array(z.string())
      .nullish()
      .transform((val) => (Array.isArray(val) ? val.filter(Boolean) : [])),
    machineryOwned: z
      .array(z.string())
      .nullish()
      .transform((val) => (Array.isArray(val) ? val.filter(Boolean) : [])),
    livestock: z
      .object({
        cows: z.number().nullish().transform((v) => Math.max(0, Number(v) || 0)),
        buffaloes: z.number().nullish().transform((v) => Math.max(0, Number(v) || 0)),
        bullocks: z.number().nullish().transform((v) => Math.max(0, Number(v) || 0)),
        goatsOrSheep: z.number().nullish().transform((v) => Math.max(0, Number(v) || 0)),
        poultry: z.number().nullish().transform((v) => Math.max(0, Number(v) || 0)),
      })
      .nullish()
      .transform((val) => ({
        cows: Math.max(0, Number(val?.cows) || 0),
        buffaloes: Math.max(0, Number(val?.buffaloes) || 0),
        bullocks: Math.max(0, Number(val?.bullocks) || 0),
        goatsOrSheep: Math.max(0, Number(val?.goatsOrSheep) || 0),
        poultry: Math.max(0, Number(val?.poultry) || 0),
      })),
    preferredLanguage: z.string().nullish().transform((val) => val || 'en'),
    profilePictureUrl: z.string().nullish().transform((val) => val || ''),
    updatedAt: z.string().nullish().transform((val) => val || new Date().toISOString()),
    createdAt: z.string().nullish().transform((val) => val || new Date().toISOString()),
  })
  .nullish()
  .transform((val) => {
    const fallback = {
      id: val?.id || 'anon',
      personal: val?.personal || {
        fullName: '',
        mobileNumber: '',
        emailAddress: '',
        gender: 'Prefer not to say' as GenderType,
        dateOfBirth: '',
        aadhaarNumber: '',
        isAadhaarVerified: false,
      },
      location: val?.location || {
        villageOrTehsil: '',
        district: '',
        state: '',
        pinCode: '',
        gpsCoordinates: null,
        isLocationPermissionGranted: false,
        farmCentroidAddress: '',
      },
      farmSpecs: val?.farmSpecs || {
        totalArea: 0,
        landUnit: 'Acres' as FarmLandUnit,
        soilType: 'Alluvial' as SoilType,
        irrigationType: 'Rainfed / Monsoon' as IrrigationType,
        primaryWaterSource: '',
      },
      crops: val?.crops || [],
      machineryOwned: val?.machineryOwned || [],
      livestock: val?.livestock || {
        cows: 0,
        buffaloes: 0,
        bullocks: 0,
        goatsOrSheep: 0,
        poultry: 0,
      },
      preferredLanguage: val?.preferredLanguage || 'en',
      profilePictureUrl: val?.profilePictureUrl || '',
      updatedAt: val?.updatedAt || new Date().toISOString(),
      createdAt: val?.createdAt || new Date().toISOString(),
    };
    return fallback;
  });

/**
 * Utility: Mask Aadhaar number for privacy (returns XXXX-XXXX-1234).
 */
export function maskAadhaar(aadhaar?: string): string {
  if (!aadhaar) return '';
  const digits = aadhaar.replace(/\D/g, '');
  if (digits.length < 4) return aadhaar;
  const last4 = digits.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

