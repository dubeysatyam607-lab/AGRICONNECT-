import { z } from 'zod';

/**
 * Enterprise Zod Validation Schemas for Farmer Profile Management.
 * Enforces strict formatting for Aadhaar (optional), GPS coordinates, PIN codes, and farm measurements.
 */

// Aadhaar validation: 12 numerical digits or formatted "XXXX-XXXX-1234"
export const aadhaarSchema = z
  .string()
  .trim()
  .optional()
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
  .trim()
  .regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit Indian PIN Code.');

// GPS Coordinates validation
export const gpsCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0),
  timestamp: z.string(),
});

// Farm Area validation: must be > 0 and reasonable for agricultural plots
export const farmAreaSchema = z
  .number({ required_error: 'Farm area is required.' })
  .positive('Farm area must be greater than 0.')
  .max(50000, 'Please enter a realistic farm size.');

// Personal Details validation
export const personalDetailsSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters long.'),
  mobileNumber: z.string().trim().min(10, 'Enter a valid 10-digit mobile number.'),
  emailAddress: z.string().trim().email('Enter a valid email address.').optional().or(z.literal('')),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']),
  dateOfBirth: z.string().optional(),
  aadhaarNumber: aadhaarSchema,
  isAadhaarVerified: z.boolean().default(false),
});

// Master Farmer Profile Schema
export const farmerProfileSchema = z.object({
  id: z.string(),
  personal: personalDetailsSchema,
  location: z.object({
    villageOrTehsil: z.string().trim().min(2, 'Village or Tehsil name is required.'),
    district: z.string().trim().min(2, 'District name is required.'),
    state: z.string().trim().min(2, 'State name is required.'),
    pinCode: pinCodeSchema,
    gpsCoordinates: gpsCoordinatesSchema.optional(),
    isLocationPermissionGranted: z.boolean().default(false),
    farmCentroidAddress: z.string().optional(),
  }),
  farmSpecs: z.object({
    totalArea: farmAreaSchema,
    landUnit: z.enum(['Acres', 'Hectares', 'Bigha', 'Guntha', 'Kanal']),
    soilType: z.enum(['Alluvial', 'Black Cotton', 'Red & Yellow', 'Laterite', 'Saline & Alkaline', 'Arid & Desert', 'Peaty & Marshy']),
    irrigationType: z.enum(['Drip Irrigation', 'Sprinkler System', 'Tube Well', 'Canal Irrigation', 'Rainfed / Monsoon', 'Open Borewell']),
    primaryWaterSource: z.string().optional(),
  }),
  crops: z.array(z.string()).min(1, 'Select at least one crop grown on your farm.'),
  machineryOwned: z.array(z.string()),
  livestock: z.object({
    cows: z.number().int().min(0),
    buffaloes: z.number().int().min(0),
    bullocks: z.number().int().min(0),
    goatsOrSheep: z.number().int().min(0),
    poultry: z.number().int().min(0),
  }),
  preferredLanguage: z.string(),
  profilePictureUrl: z.string().optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
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
