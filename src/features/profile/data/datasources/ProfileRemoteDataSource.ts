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

      // Parse extended_profile JSON column for all additional fields
      let extended: Record<string, any> = {};
      try {
        extended = data.extended_profile ? JSON.parse(data.extended_profile) : {};
      } catch { /* corrupt JSON — use defaults */ }

      return {
        ...defaultProf,
        personal: {
          ...defaultProf.personal,
          fullName: data.full_name || defaultProf.personal.fullName,
          mobileNumber: data.phone || defaultProf.personal.mobileNumber,
          emailAddress: data.email || extended.emailAddress || defaultProf.personal.emailAddress,
          gender: extended.gender || defaultProf.personal.gender,
          dateOfBirth: extended.dateOfBirth || defaultProf.personal.dateOfBirth,
          aadhaarNumber: extended.aadhaarNumber || defaultProf.personal.aadhaarNumber,
          isAadhaarVerified: extended.isAadhaarVerified ?? false,
        },
        location: {
          ...defaultProf.location,
          villageOrTehsil: data.village || data.location || extended.villageOrTehsil || defaultProf.location.villageOrTehsil,
          district: data.district || extended.district || defaultProf.location.district,
          state: data.state || extended.state || defaultProf.location.state,
          pinCode: extended.pinCode || defaultProf.location.pinCode,
          gpsCoordinates: extended.gpsCoordinates || defaultProf.location.gpsCoordinates,
          isLocationPermissionGranted: extended.isLocationPermissionGranted ?? false,
          farmCentroidAddress: data.farm_location || extended.farmCentroidAddress || defaultProf.location.farmCentroidAddress,
        },
        farmSpecs: {
          ...defaultProf.farmSpecs,
          totalArea: (data.farm_size !== null && data.farm_size !== undefined) ? Number(data.farm_size) : (extended.totalArea ?? 0),
          landUnit: extended.landUnit || defaultProf.farmSpecs.landUnit,
          soilType: data.soil_type || extended.soilType || defaultProf.farmSpecs.soilType,
          irrigationType: data.irrigation_type || extended.irrigationType || defaultProf.farmSpecs.irrigationType,
          primaryWaterSource: extended.primaryWaterSource || defaultProf.farmSpecs.primaryWaterSource,
        },
        crops: (Array.isArray(extended.crops) && extended.crops.length > 0)
          ? extended.crops
          : (data.primary_crop ? [data.primary_crop, ...(data.additional_crops || [])] : []),
        machineryOwned: Array.isArray(extended.machineryOwned) ? extended.machineryOwned : [],
        livestock: {
          ...defaultProf.livestock,
          ...(extended.livestock || {}),
        },
        preferredLanguage: data.app_language || extended.preferredLanguage || 'en',
        profilePictureUrl: data.avatar_url || defaultProf.profilePictureUrl,
      };
    } catch (e) {
      console.warn('[ProfileRemoteDataSource] Remote profile fetch failed, using local/seed fallback:', e);
      return null;
    }
  }

  public async saveRemoteProfile(profile: IFarmerProfile): Promise<IFarmerProfile> {
    try {
      // Store extended fields as JSON in a dedicated column
      const extendedProfile = {
        emailAddress: profile.personal.emailAddress,
        gender: profile.personal.gender,
        dateOfBirth: profile.personal.dateOfBirth,
        aadhaarNumber: profile.personal.aadhaarNumber,
        isAadhaarVerified: profile.personal.isAadhaarVerified,
        villageOrTehsil: profile.location.villageOrTehsil,
        district: profile.location.district,
        state: profile.location.state,
        pinCode: profile.location.pinCode,
        gpsCoordinates: profile.location.gpsCoordinates,
        isLocationPermissionGranted: profile.location.isLocationPermissionGranted,
        farmCentroidAddress: profile.location.farmCentroidAddress,
        totalArea: profile.farmSpecs.totalArea,
        landUnit: profile.farmSpecs.landUnit,
        soilType: profile.farmSpecs.soilType,
        irrigationType: profile.farmSpecs.irrigationType,
        primaryWaterSource: profile.farmSpecs.primaryWaterSource,
        crops: profile.crops,
        machineryOwned: profile.machineryOwned,
        livestock: profile.livestock,
        preferredLanguage: profile.preferredLanguage,
      };

      const { error } = await supabase.from('profiles').upsert({
        id: profile.id,
        full_name: profile.personal.fullName,
        email: profile.personal.emailAddress || null,
        phone: profile.personal.mobileNumber,
        location: profile.location.villageOrTehsil,
        state: profile.location.state || null,
        district: profile.location.district || null,
        village: profile.location.villageOrTehsil || null,
        farm_location: profile.location.farmCentroidAddress || null,
        primary_crop: profile.crops?.[0] || null,
        farm_size: profile.farmSpecs.totalArea || 0,
        soil_type: profile.farmSpecs.soilType || null,
        irrigation_type: profile.farmSpecs.irrigationType || null,
        app_language: profile.preferredLanguage || 'en',
        avatar_url: profile.profilePictureUrl,
        onboarding_completed: true,
        extended_profile: JSON.stringify(extendedProfile),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[ProfileRemoteDataSource] Supabase upsert error:', error.message);
        throw new Error(`Failed to save profile: ${error.message}`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Failed to save')) throw e;
      console.error('[ProfileRemoteDataSource] Network error, profile saved locally only');
    }
    return profile;
  }
}

export const profileRemoteDataSource = new ProfileRemoteDataSource();
