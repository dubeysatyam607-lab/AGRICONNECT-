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
    if (!userId || userId === 'anon') {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

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
      if (!profile) {
        return ProfileRemoteDataSource.getDefaultProfile('anon');
      }

      // Ensure all top-level sections are non-null objects
      const personal = profile.personal || {
        fullName: '',
        mobileNumber: '',
        emailAddress: '',
        gender: 'Prefer not to say',
        dateOfBirth: '',
        aadhaarNumber: '',
        isAadhaarVerified: false,
      };
      const location = profile.location || {
        villageOrTehsil: '',
        district: '',
        state: '',
        pinCode: '',
        gpsCoordinates: null,
        isLocationPermissionGranted: false,
        farmCentroidAddress: '',
      };
      const farmSpecs = profile.farmSpecs || {
        totalArea: 0,
        landUnit: 'Acres',
        soilType: 'Alluvial',
        irrigationType: 'Rainfed / Monsoon',
        primaryWaterSource: '',
      };
      const livestock = profile.livestock || {
        cows: 0,
        buffaloes: 0,
        bullocks: 0,
        goatsOrSheep: 0,
        poultry: 0,
      };

      // 1. Resolve actual authenticated user ID
      let effectiveUserId = profile.id;
      if (!effectiveUserId || effectiveUserId === 'anon') {
        const { data: sessionData } = await supabase.auth.getSession();
        effectiveUserId = sessionData?.session?.user?.id || '';
      }

      if (!effectiveUserId || effectiveUserId === 'anon') {
        // Guest user — safely persist locally
        if (typeof window !== 'undefined') {
          localStorage.setItem('profile:anon', JSON.stringify(profile));
        }
        return profile;
      }

      // Update profile with resolved effective ID
      profile.id = effectiveUserId;

      // Store extended fields as JSON
      const extendedProfile = {
        emailAddress: personal.emailAddress || '',
        gender: personal.gender || 'Prefer not to say',
        dateOfBirth: personal.dateOfBirth || '',
        aadhaarNumber: personal.aadhaarNumber || '',
        isAadhaarVerified: personal.isAadhaarVerified ?? false,
        villageOrTehsil: location.villageOrTehsil || '',
        district: location.district || '',
        state: location.state || '',
        pinCode: location.pinCode || '',
        gpsCoordinates: location.gpsCoordinates || null,
        isLocationPermissionGranted: location.isLocationPermissionGranted ?? false,
        farmCentroidAddress: location.farmCentroidAddress || '',
        totalArea: farmSpecs.totalArea ?? 0,
        landUnit: farmSpecs.landUnit || 'Acres',
        soilType: farmSpecs.soilType || 'Alluvial',
        irrigationType: farmSpecs.irrigationType || 'Rainfed / Monsoon',
        primaryWaterSource: farmSpecs.primaryWaterSource || '',
        crops: Array.isArray(profile.crops) ? profile.crops : [],
        machineryOwned: Array.isArray(profile.machineryOwned) ? profile.machineryOwned : [],
        livestock: livestock,
        preferredLanguage: profile.preferredLanguage || 'en',
      };

      const payload = {
        id: effectiveUserId,
        full_name: personal.fullName || '',
        email: personal.emailAddress || null,
        phone: personal.mobileNumber || '',
        location: location.villageOrTehsil || null,
        state: location.state || null,
        district: location.district || null,
        village: location.villageOrTehsil || null,
        farm_location: location.farmCentroidAddress || null,
        primary_crop: profile.crops?.[0] || null,
        farm_size: farmSpecs.totalArea ?? 0,
        soil_type: farmSpecs.soilType || null,
        irrigation_type: farmSpecs.irrigationType || null,
        app_language: profile.preferredLanguage || 'en',
        avatar_url: profile.profilePictureUrl || null,
        onboarding_completed: true,
        extended_profile: JSON.stringify(extendedProfile),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('[ProfileRemoteDataSource] Upsert warning, trying core update:', error.message);
        const { error: fallbackError } = await supabase.from('profiles').upsert({
          id: effectiveUserId,
          full_name: personal.fullName || '',
          phone: personal.mobileNumber || '',
          state: location.state || null,
          district: location.district || null,
          village: location.villageOrTehsil || null,
          primary_crop: profile.crops?.[0] || null,
          farm_size: farmSpecs.totalArea ?? 0,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        if (fallbackError) {
          console.warn('[ProfileRemoteDataSource] Fallback upsert notice:', fallbackError.message);
        }
      }

      // Also update auth user metadata for instantaneous local hydration
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: personal.fullName || '',
            phone: personal.mobileNumber || '',
            village: location.villageOrTehsil || '',
            district: location.district || '',
            state: location.state || '',
          },
        });
      } catch (authMetaErr) {
        // Non-fatal
      }
    } catch (e) {
      console.warn('[ProfileRemoteDataSource] Save profile handled gracefully:', e);
    }
    return profile;
  }
}

export const profileRemoteDataSource = new ProfileRemoteDataSource();
