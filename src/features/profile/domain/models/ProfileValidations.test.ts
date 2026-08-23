import { describe, it, expect } from 'vitest';
import { farmerProfileSchema } from './ProfileValidations';
import { updateFarmerProfileUseCase } from '../usecases/UpdateFarmerProfileUseCase';

describe('ProfileValidations Resilience Tests', () => {
  it('should successfully parse and normalize null profile without throwing expected object received null', () => {
    const result = farmerProfileSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.personal.fullName).toBe('');
      expect(result.data.location.state).toBe('');
      expect(result.data.farmSpecs.totalArea).toBe(0);
      expect(result.data.livestock.cows).toBe(0);
      expect(Array.isArray(result.data.crops)).toBe(true);
    }
  });

  it('should successfully handle profile with null sub-objects (personal, location, farmSpecs, livestock)', () => {
    const brokenProfile: any = {
      id: 'test-user-123',
      personal: null,
      location: null,
      farmSpecs: null,
      crops: null,
      machineryOwned: null,
      livestock: null,
    };

    const result = farmerProfileSchema.safeParse(brokenProfile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('test-user-123');
      expect(result.data.personal.fullName).toBe('');
      expect(result.data.location.district).toBe('');
      expect(result.data.farmSpecs.landUnit).toBe('Acres');
      expect(result.data.livestock.buffaloes).toBe(0);
    }
  });

  it('should successfully handle null or empty values within personal and location fields', () => {
    const partialProfile: any = {
      id: 'usr_abc',
      personal: {
        fullName: 'Ram Lal',
        mobileNumber: null,
        emailAddress: null,
        gender: null,
        dateOfBirth: null,
        aadhaarNumber: null,
        isAadhaarVerified: null,
      },
      location: {
        villageOrTehsil: null,
        district: null,
        state: null,
        pinCode: null,
        gpsCoordinates: null,
        isLocationPermissionGranted: null,
      },
      farmSpecs: {
        totalArea: null,
        landUnit: null,
        soilType: null,
        irrigationType: null,
      },
    };

    const result = farmerProfileSchema.safeParse(partialProfile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.personal.fullName).toBe('Ram Lal');
      expect(result.data.personal.gender).toBe('Prefer not to say');
      expect(result.data.personal.isAadhaarVerified).toBe(false);
      expect(result.data.location.gpsCoordinates).toBeNull();
      expect(result.data.farmSpecs.totalArea).toBe(0);
    }
  });

  it('UpdateFarmerProfileUseCase handles null or partial input seamlessly', async () => {
    const mockRepo: any = {
      updateProfile: async (prof: any) => prof,
    };
    const useCase = new (updateFarmerProfileUseCase.constructor as any)(mockRepo);
    const saved = await useCase.execute(null);
    expect(saved).toBeDefined();
    expect(saved.id).toBe('anon');
    expect(saved.personal.gender).toBe('Prefer not to say');
  });
});
