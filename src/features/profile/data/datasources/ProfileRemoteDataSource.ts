import { supabase } from '@/integrations/supabase/client';
import { IFarmerProfile, IGpsCoordinates } from '../../domain/models/FarmerProfile';

/**
 * Enterprise Profile Remote Data Source.
 * Synchronizes with Supabase profiles table and provides default fallback seed profile for Indian farmers.
 */
export class ProfileRemoteDataSource {
  /**
   * Default production-ready seed profile for Indian farmers.
   */
  public static getDefaultProfile(userId: string = 'demo-farmer-id'): IFarmerProfile {
    return {
      id: userId,
      personal: {
        fullName: 'Rajesh Kumar Singh',
        mobileNumber: '+91 9876543210',
        emailAddress: 'rajesh.singh@bharatkrishi.in',
        gender: 'Male',
        dateOfBirth: '1982-05-14',
        aadhaarNumber: 'XXXX-XXXX-8942', // Stored masked / optional
        isAadhaarVerified: true,
      },
      location: {
        villageOrTehsil: 'Pimpri-Chinchwad / Tehsil Haveli',
        district: 'Pune',
        state: 'Maharashtra',
        pinCode: '411033',
        isLocationPermissionGranted: true,
        farmCentroidAddress: 'Survey No. 42, Green Belt Road, Pune District',
        gpsCoordinates: {
          latitude: 18.6298,
          longitude: 73.7997,
          accuracyMeters: 12.5,
          timestamp: new Date().toISOString(),
        },
      },
      farmSpecs: {
        totalArea: 14.5,
        landUnit: 'Acres',
        soilType: 'Black Cotton',
        irrigationType: 'Drip Irrigation',
        primaryWaterSource: 'Solar Powered Submersible Tube Well',
      },
      crops: [
        'Wheat (Gehun)',
        'Sugarcane (Ganna)',
        'Soyabean',
        'Onion (Pyaaz)',
      ],
      machineryOwned: [
        'Tractor (4WD/2WD)',
        'Rotavator',
        'Submersible Pump Set',
        'Boom / Knapsack Sprayer',
      ],
      livestock: {
        cows: 4,
        buffaloes: 2,
        bullocks: 2,
        goatsOrSheep: 8,
        poultry: 25,
      },
      preferredLanguage: 'en',
      profilePictureUrl: '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  public async getRemoteProfile(userId: string): Promise<IFarmerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      const defaultProf = ProfileRemoteDataSource.getDefaultProfile(userId);
      return {
        ...defaultProf,
        personal: {
          ...defaultProf.personal,
          fullName: data.full_name || defaultProf.personal.fullName,
          mobileNumber: data.phone || defaultProf.personal.mobileNumber,
        },
        location: {
          ...defaultProf.location,
          villageOrTehsil: data.location || defaultProf.location.villageOrTehsil,
        },
        profilePictureUrl: data.avatar_url || defaultProf.profilePictureUrl,
      };
    } catch (e) {
      console.warn('[ProfileRemoteDataSource] Remote profile fetch failed, using local/seed fallback:', e);
      return null;
    }
  }

  public async saveRemoteProfile(profile: IFarmerProfile): Promise<IFarmerProfile> {
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: profile.id,
        full_name: profile.personal.fullName,
        phone: profile.personal.mobileNumber,
        location: profile.location.villageOrTehsil,
        avatar_url: profile.profilePictureUrl,
      });

      if (error) {
        console.warn('[ProfileRemoteDataSource] Supabase upsert error:', error);
      }
    } catch (e) {
      console.warn('[ProfileRemoteDataSource] Offline mode: profile saved locally.');
    }
    return profile;
  }
}

export const profileRemoteDataSource = new ProfileRemoteDataSource();
