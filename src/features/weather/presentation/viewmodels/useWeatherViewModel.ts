import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { IWeatherRepository } from '../../domain/repositories/IWeatherRepository';
import { useLocation } from '@/features/location/LocationContext';
import { IWeatherModuleData } from '../../domain/models/WeatherModels';
import { readStaleCache, writeCache, isOnline } from '@/lib/offline-cache';
import { friendlyError } from '@/components/ui/error-state';

const CACHE_KEY = 'weather:home';

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
 * Manages weather state, location tracking, unit conversions, and background sync.
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

  const didPreloadRef = useRef(false);
  const fetchWeatherForCoords = useCallback(async (lat?: number, lng?: number, locName?: string, isRefresh = false) => {
    // Serve cached forecast instantly on cold start (even when stale), once per mount
    if (!didPreloadRef.current && !isRefresh) {
      didPreloadRef.current = true;
      const cached = readStaleCache<IWeatherModuleData>(CACHE_KEY);
      if (cached) {
        setState(prev => (prev.data ? prev : { ...prev, data: cached, loading: false, error: null }));
      }
    }

    try {
      setState(prev => ({ ...prev, loading: !prev.data && !isRefresh, refreshing: isRefresh, error: null }));
      
      const result = isRefresh 
        ? await repo.refreshWeather(lat, lng) 
        : await repo.getWeatherForecast(lat, lng, locName);

      writeCache(CACHE_KEY, result);
      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        refreshing: false,
        error: null,
      }));
    } catch (err: any) {
      console.error('[useWeatherViewModel] Error fetching weather:', err);
      const stale = readStaleCache<IWeatherModuleData>(CACHE_KEY);
      setState(prev => ({
        ...prev,
        data: prev.data || stale,
        loading: false,
        refreshing: false,
        error: prev.data || stale
          ? null
          : isOnline()
            ? friendlyError(err, "Couldn't fetch today's weather")
            : "You're offline. Showing saved weather.",
      }));
    }
  }, [repo]);

  const refreshLocation = useCallback(async () => {
    triggerHaptic();
    setState(prev => ({ ...prev, refreshing: true }));
    // Trigger GPS refresh via LocationContext; results handled in useEffect
    refresh();
  }, [refresh, triggerHaptic]);

  const toggleTemperatureUnit = useCallback(() => {
    triggerHaptic();
    setState(prev => ({ ...prev, isFahrenheit: !prev.isFahrenheit }));
  }, [triggerHaptic]);

  const formatTemp = useCallback((celsius: number): string => {
    if (state.isFahrenheit) {
      const f = Math.round((celsius * 9) / 5 + 32);
      return `${f}°F`;
    }
    return `${Math.round(celsius)}°C`;
  }, [state.isFahrenheit]);

  // React to location updates from LocationContext
  useEffect(() => {
    const { status, latitude, longitude, city, error } = location;
    if (status === 'ready' && latitude && longitude) {
      fetchWeatherForCoords(latitude, longitude, city);
    } else if (status === 'error') {
      setState(prev => ({
        ...prev,
        data: prev.data || readStaleCache<IWeatherModuleData>(CACHE_KEY),
        loading: false,
        refreshing: false,
        error: error || 'Location unavailable. Please allow location access or choose your location manually.',
      }));
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
