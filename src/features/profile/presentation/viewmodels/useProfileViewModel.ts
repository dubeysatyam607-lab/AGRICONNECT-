import { useState, useEffect, useCallback, useRef } from 'react';
import { IFarmerProfile, IGpsCoordinates } from '../../domain/models/FarmerProfile';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { GetFarmerProfileUseCase } from '../../domain/usecases/GetFarmerProfileUseCase';
import { UpdateFarmerProfileUseCase } from '../../domain/usecases/UpdateFarmerProfileUseCase';
import { CaptureGpsFarmMapUseCase } from '../../domain/usecases/CaptureGpsFarmMapUseCase';
import { ErrorHandler } from '@/core/errors/ErrorHandler';
import { snackbarService } from '@/core/services/SnackbarService';
import { useLanguage } from '@/contexts/LanguageContext';
import { readStaleCache, writeCache } from '@/lib/offline-cache';

export interface IProfileViewModelState {
  profile: IFarmerProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  isGpsLocating: boolean;
  error: string | null;
}

export interface IProfileViewModelActions {
  fetchProfile: (userId?: string) => Promise<void>;
  saveProfile: (updatedProfile: IFarmerProfile) => Promise<boolean>;
  updateProfileField: <K extends keyof IFarmerProfile>(key: K, value: IFarmerProfile[K]) => void;
  updateNestedField: (section: 'personal' | 'location' | 'farmSpecs' | 'livestock', field: string, value: any) => void;
  captureGpsLocation: () => Promise<boolean>;
  uploadAvatar: (dataUrl: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Enterprise Profile ViewModel.
 * Connects domain profile operations, live GPS geolocation, and real-time state updates to UI components.
 */
export function useProfileViewModel(initialUserId?: string): [IProfileViewModelState, IProfileViewModelActions] {
  const [state, setState] = useState<IProfileViewModelState>({
    profile: null,
    isLoading: true,
    isSaving: false,
    isGpsLocating: false,
    error: null,
  });

  const getProfileUseCase = inject<GetFarmerProfileUseCase>(DI_TOKENS.GetFarmerProfileUseCase);
  const updateProfileUseCase = inject<UpdateFarmerProfileUseCase>(DI_TOKENS.UpdateFarmerProfileUseCase);
  const captureGpsUseCase = inject<CaptureGpsFarmMapUseCase>(DI_TOKENS.CaptureGpsFarmMapUseCase);

  const { language } = useLanguage() || {};

  const didPreloadRef = useRef(false);

  const fetchProfile = useCallback(async (userId?: string): Promise<void> => {
    const uid = userId || initialUserId;
    const cacheKey = uid ? `profile:${uid}` : 'profile:anon';

    if (!didPreloadRef.current) {
      didPreloadRef.current = true;
      const cached = readStaleCache<IFarmerProfile>(cacheKey);
      if (cached) {
        setState((prev) => (prev.profile ? prev : { ...prev, profile: cached, isLoading: false }));
      }
    }

    setState((prev) => ({ ...prev, isLoading: !prev.profile, error: null }));
    try {
      const data = await getProfileUseCase.execute(uid);
      writeCache(cacheKey, data);
      setState((prev) => ({ ...prev, profile: data, isLoading: false, error: null }));
    } catch (e: any) {
      const stale = readStaleCache<IFarmerProfile>(cacheKey);
      if (stale) {
        setState((prev) => ({ ...prev, profile: stale, isLoading: false, error: null }));
        return;
      }
      const appEx = ErrorHandler.handle(e);
      setState((prev) => ({ ...prev, isLoading: false, error: appEx.toUserFriendlyMessage() }));
      snackbarService.error(appEx.toUserFriendlyMessage(), 'Failed to Load Profile');
    }
  }, [getProfileUseCase, initialUserId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(async (updatedProfile: IFarmerProfile): Promise<boolean> => {
    setState((prev) => ({ ...prev, isSaving: true, error: null }));
    try {
      const saved = await updateProfileUseCase.execute(updatedProfile);
      writeCache(initialUserId ? `profile:${initialUserId}` : 'profile:anon', saved);
      setState((prev) => ({ ...prev, profile: saved, isSaving: false }));
      snackbarService.success('Profile updated successfully! Synced across devices.');
      return true;
    } catch (e: any) {
      const appEx = ErrorHandler.handle(e);
      setState((prev) => ({ ...prev, isSaving: false, error: appEx.toUserFriendlyMessage() }));
      snackbarService.error(appEx.toUserFriendlyMessage(), 'Profile Save Failed');
      return false;
    }
  }, [updateProfileUseCase]);

  const updateProfileField = useCallback(<K extends keyof IFarmerProfile>(key: K, value: IFarmerProfile[K]) => {
    setState((prev) => {
      if (!prev.profile) return prev;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          [key]: value,
        },
      };
    });
  }, []);

  const updateNestedField = useCallback((section: 'personal' | 'location' | 'farmSpecs' | 'livestock', field: string, value: any) => {
    setState((prev) => {
      if (!prev.profile) return prev;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          [section]: {
            ...prev.profile[section],
            [field]: value,
          },
        },
      };
    });
  }, []);

  const captureGpsLocation = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isGpsLocating: true, error: null }));
    try {
      const coords: IGpsCoordinates = await captureGpsUseCase.execute();
      setState((prev) => {
        if (!prev.profile) return { ...prev, isGpsLocating: false };
        return {
          ...prev,
          isGpsLocating: false,
          profile: {
            ...prev.profile,
            location: {
              ...prev.profile.location,
              isLocationPermissionGranted: true,
              gpsCoordinates: coords,
            },
          },
        };
      });
      snackbarService.success(`GPS coordinates captured! Accuracy: ±${coords.accuracyMeters}m`);
      return true;
    } catch (e: any) {
      setState((prev) => ({ ...prev, isGpsLocating: false }));
      snackbarService.error(e.message || 'Failed to detect GPS coordinates. Make sure location permissions are allowed.', 'GPS Error');
      return false;
    }
  }, [captureGpsUseCase]);

  const uploadAvatar = useCallback(async (dataUrl: string): Promise<void> => {
    updateProfileField('profilePictureUrl', dataUrl);
    snackbarService.info('Profile picture updated. Click Save to confirm.');
  }, [updateProfileField]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return [
    state,
    {
      fetchProfile,
      saveProfile,
      updateProfileField,
      updateNestedField,
      captureGpsLocation,
      uploadAvatar,
      clearError,
    },
  ];
}
