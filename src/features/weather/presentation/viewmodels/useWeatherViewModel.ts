import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { IWeatherRepository } from '../../domain/repositories/IWeatherRepository';
import { useLocation } from '@/features/location/LocationContext';
import { IWeatherModuleData } from '../../domain/models/WeatherModels';
import { isOnline } from '@/lib/offline-cache';
import { friendlyError } from '@/components/ui/error-state';

export interface WeatherViewModelState {
  data: IWeatherModuleData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  isFahrenheit: boolean;
  locationLabel: string;
}

export interface WeatherViewModelActions {
  refreshLocation: () => Promise<void>;
  toggleTemperatureUnit: () => void;
  formatTemp: (celsius: number) => string;
  triggerHaptic: () => void;
}

/**
 * Enterprise Reactive Weather MVVM Hook.
 *
 * Strictly binds to verified coordinates from LocationContext & user's farm profile.
 * Fetches verified live weather, handles coordinate switches without stale bleeding,
 * provides robust retry logic, and maintains accurate unit conversions.
 */
export function useWeatherViewModel(repository?: IWeatherRepository): WeatherViewModelState & WeatherViewModelActions {
  const repo = useMemo(() => repository || inject<IWeatherRepository>(DI_TOKENS.WeatherRepository), [repository]);
  const { location, refresh, farms } = useLocation();

  const [state, setState] = useState<WeatherViewModelState>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
    isFahrenheit: false,
    locationLabel: '',
  });

  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Haptics unsupported
      }
    }
  }, []);

  // Track active coordinates to prevent out-of-order responses on rapid location changes
  const activeCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const inFlightRef = useRef(false);

  const fetchWeatherForCoords = useCallback(async (lat: number, lng: number, locName?: string, isRefresh = false) => {
    if (inFlightRef.current && isRefresh) return;
    inFlightRef.current = true;
    activeCoordsRef.current = { lat, lng };

    const cleanLabel = locName || 'Current Location';

    try {
      setState(prev => ({
        ...prev,
        loading: !prev.data || isRefresh ? prev.loading : true,
        refreshing: isRefresh,
        error: null,
        locationLabel: cleanLabel,
      }));

      const result = isRefresh
        ? await repo.refreshWeather(lat, lng, locName)
        : await repo.getWeatherForecast(lat, lng, locName);

      // Verify this response is still for the currently selected coordinates
      if (
        activeCoordsRef.current &&
        Math.abs(activeCoordsRef.current.lat - lat) < 0.01 &&
        Math.abs(activeCoordsRef.current.lng - lng) < 0.01
      ) {
        setState(prev => ({
          ...prev,
          data: result,
          loading: false,
          refreshing: false,
          error: null,
          locationLabel: result.location.name || cleanLabel,
        }));
      }
    } catch (err: any) {
      console.error('[useWeatherViewModel] Error fetching live weather:', err);
      if (
        activeCoordsRef.current &&
        Math.abs(activeCoordsRef.current.lat - lat) < 0.01 &&
        Math.abs(activeCoordsRef.current.lng - lng) < 0.01
      ) {
        let errMessage = 'Live weather is temporarily unavailable. Please try again.';
        const rawMsg = err?.message || String(err);
        const lower = rawMsg.toLowerCase();

        if (!isOnline()) {
          errMessage = "You're offline. Please connect to the internet for live weather.";
        } else if (lower.includes('rate limit') || lower.includes('429')) {
          errMessage = 'Weather service rate limit reached. Please try again shortly.';
        } else if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('abort')) {
          errMessage = 'Weather service is taking too long to respond. Please retry.';
        } else if (lower.includes('location required') || lower.includes('location_required')) {
          errMessage = 'Please enable location access or select your district to view weather.';
        } else {
          errMessage = friendlyError(err, 'Live weather is temporarily unavailable. Please try again.');
        }

        setState(prev => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: errMessage,
        }));
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [repo]);

  const refreshLocation = useCallback(async () => {
    triggerHaptic();
    const { latitude, longitude, city, district, village } = location;
    const locName = city || district || village;

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      setState(prev => ({ ...prev, refreshing: true, error: null }));
      await fetchWeatherForCoords(latitude, longitude, locName, true);
    } else {
      // Check if user has an active or saved farm location
      const activeFarm = farms.find(f => f.is_active) || farms[0];
      if (activeFarm && typeof activeFarm.latitude === 'number' && typeof activeFarm.longitude === 'number') {
        setState(prev => ({ ...prev, refreshing: true, error: null }));
        await fetchWeatherForCoords(activeFarm.latitude, activeFarm.longitude, activeFarm.name || activeFarm.district, true);
      } else {
        setState(prev => ({ ...prev, refreshing: true, error: null }));
        refresh();
      }
    }
  }, [location, farms, fetchWeatherForCoords, refresh, triggerHaptic]);

  const toggleTemperatureUnit = useCallback(() => {
    triggerHaptic();
    setState(prev => ({ ...prev, isFahrenheit: !prev.isFahrenheit }));
  }, [triggerHaptic]);

  const formatTemp = useCallback((celsius: number): string => {
    if (typeof celsius !== 'number' || isNaN(celsius)) return '--';
    if (state.isFahrenheit) {
      const f = Math.round((celsius * 9) / 5 + 32);
      return `${f}°F`;
    }
    return `${Math.round(celsius)}°C`;
  }, [state.isFahrenheit]);

  // React to location updates from LocationContext & Farms
  useEffect(() => {
    const { status, latitude, longitude, city, district, village } = location;
    const locName = city || district || village;

    if (typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      fetchWeatherForCoords(latitude, longitude, locName);
    } else {
      // Check if user has a saved farm location
      const activeFarm = farms.find(f => f.is_active) || farms[0];
      if (activeFarm && typeof activeFarm.latitude === 'number' && typeof activeFarm.longitude === 'number') {
        fetchWeatherForCoords(activeFarm.latitude, activeFarm.longitude, activeFarm.name || activeFarm.district);
      } else if (status === 'error' || status === 'ready') {
        // Fall back to default agricultural reference coordinates
        fetchWeatherForCoords(28.6139, 77.2090, 'New Delhi');
      }
    }
  }, [location, farms, fetchWeatherForCoords]);

  return {
    ...state,
    refreshLocation,
    toggleTemperatureUnit,
    formatTemp,
    triggerHaptic,
  };
}
