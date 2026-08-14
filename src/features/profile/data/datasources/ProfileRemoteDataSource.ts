import { supabase } from '@/integrations/supabase/client';
import { IFarmerProfile, IGpsCoordinates } from '../../domain/models/FarmerProfile';

/**
 * Enterprise Profile Remote Data Source.
 * Synchronizes with Supabase profiles table. No hardcoded demo/sample data.
 */
export class ProfileRemoteDataSource {
  /**
   * Empty profile scaffold for a new user. All fields are blank — there is
   * deliberately no seeded demo identity; the user populates their own data.
   */
  public static getDefaultProfile(userId: string): IFarmerProfile {
    return {
      id: userId,
      personal: {
        fullName: '',
        mobileNumber: '',
        emailAddress: '',
        gender: '',
        dateOfBirth: '',
        aadhaarNumber: '',
        isAadhaarVerified: false,
      },
      location: {
        villageOrTehsil: '',
        district: '',
        state: '',
        pinCode: '',
        isLocationPermissionGranted: false,
        farmCentroidAddress: '',
        gpsCoordinates: null,
      },
      farmSpecs: {
        totalArea: 0,
        landUnit: 'Acres',
        soilType: '',
        irrigationType: '',
        primaryWaterSource: '',
      },
      crops: [],
      machineryOwned: [],
      livestock: {
        cows: 0,
        buffaloes: 0,
        bullocks: 0,
        goatsOrSheep: 0,
        poultry: 0,
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
