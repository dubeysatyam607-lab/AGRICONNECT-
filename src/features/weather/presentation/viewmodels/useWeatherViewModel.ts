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
}

export interface WeatherViewModelActions {
  refreshLocation: () => Promise<void>;
  toggleTemperatureUnit: () => void;
  formatTemp: (celsius: number) => string;
  triggerHaptic: () => void;
}

/**
 * Enterprise Reactive Weather MVVM Hook.
 * Strictly binds to active coordinates from LocationContext.
 * Fetches verified live weather, handles coordinate switches without stale bleeding,
 * and maintains accurate unit conversions.
 */
export function useWeatherViewModel(repository?: IWeatherRepository): WeatherViewModelState & WeatherViewModelActions {
  const repo = useMemo(() => repository || inject<IWeatherRepository>(DI_TOKENS.WeatherRepository), [repository]);
  const { location, refresh } = useLocation();

  const [state, setState] = useState<WeatherViewModelState>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
    isFahrenheit: false,
  });

  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Haptics not supported by this browser/device – fail silently.
      }
    }
  }, []);

  // Track active coordinates to prevent out-of-order responses on rapid location changes
  const activeCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const fetchWeatherForCoords = useCallback(async (lat: number, lng: number, locName?: string, isRefresh = false) => {
    activeCoordsRef.current = { lat, lng };

    try {
      setState(prev => ({
        ...prev,
        loading: !prev.data || isRefresh ? prev.loading : true,
        refreshing: isRefresh,
        error: null,
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
        }));
      }
    } catch (err: any) {
      console.error('[useWeatherViewModel] Error fetching live weather:', err);
      if (
        activeCoordsRef.current &&
        Math.abs(activeCoordsRef.current.lat - lat) < 0.01 &&
        Math.abs(activeCoordsRef.current.lng - lng) < 0.01
      ) {
        setState(prev => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: isOnline()
            ? friendlyError(err, 'Weather data temporarily unavailable. Please try again.')
            : "You're offline. Please connect to the internet for live weather.",
        }));
      }
    }
  }, [repo]);

  const refreshLocation = useCallback(async () => {
    triggerHaptic();
    const { latitude, longitude, city, district, village } = location;
    const locName = city || district || village;

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      setState(prev => ({ ...prev, refreshing: true }));
      await fetchWeatherForCoords(latitude, longitude, locName, true);
    } else {
      setState(prev => ({ ...prev, refreshing: true }));
      refresh();
    }
  }, [location, fetchWeatherForCoords, refresh, triggerHaptic]);

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

  // React to location updates from LocationContext
  useEffect(() => {
    const { status, latitude, longitude, city, district, village } = location;
    const locName = city || district || village;

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      fetchWeatherForCoords(latitude, longitude, locName);
    } else {
      // Default to central India coordinates so live weather is always available
      fetchWeatherForCoords(28.6139, 77.2090, 'New Delhi');
    }
  }, [location, fetchWeatherForCoords]);

  return {
    ...state,
    refreshLocation,
    toggleTemperatureUnit,
    formatTemp,
    triggerHaptic,
  };
}
