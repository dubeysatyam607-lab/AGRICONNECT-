import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { IWeatherRepository } from '../../domain/repositories/IWeatherRepository';
import { useLocation } from '@/features/location/LocationContext';
import { IWeatherModuleData } from '../../domain/models/WeatherModels';
import { isOnline } from '@/lib/offline-cache';

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

const WEATHER_REFRESH_MS = 15 * 60 * 1000;

/**
 * Maps thrown errors to clear, user-facing copy — never exposes internals.
 */
export function weatherErrorCopy(err: unknown): string {
  const fallback = 'Weather data temporarily unavailable. Please try again.';
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('offline') || lower.includes('network') || lower.includes('failed to fetch') || lower.includes('fetch failed')) {
    return 'Unable to connect to the weather service.';
  }
  if (lower.includes('taking too long') || lower.includes('timed out') || lower.includes('timeout') || lower.includes('aborted') || lower.includes('operation was aborted')) {
    return 'Weather service is taking too long to respond. Please try again.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Weather service rate limit reached. Please try again shortly.';
  }
  if (lower.includes('401') || lower.includes('403') || lower.includes('authentication') || lower.includes('unauthorized')) {
    return 'Weather service authentication failed.';
  }
  if (lower.includes('404') || lower.includes('could not be found') || lower.includes('incomplete forecast')) {
    return 'Weather data could not be found for this location.';
  }
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('unavailable')) {
    return 'Weather service is temporarily unavailable.';
  }
  if (lower.includes('location required') || lower.includes('location coordinates') || lower.includes('invalid coordinates') || lower.includes('valid latitude')) {
    return 'Location required. Please allow location access or choose your location manually.';
  }
  if (lower.includes('400') || lower.includes('bad request')) {
    return 'Weather service rejected the request. Please try again.';
  }
  return fallback;
}

/**
 * Enterprise Reactive Weather MVVM Hook.
 * Strictly binds to active coordinates from LocationContext.
 * Fetches verified live weather, handles coordinate switches without stale bleeding,
 * and maintains accurate unit conversions. NEVER falls back to a default city.
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
      // On a location change (not a refresh), the previous city's weather MUST NOT
      // remain visible while the new location loads.
      if (!isRefresh) {
        setState(prev => ({
          ...prev,
          data: null,
          loading: true,
          refreshing: false,
          error: null,
        }));
      } else {
        setState(prev => ({ ...prev, refreshing: true, error: null }));
      }

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
            ? weatherErrorCopy(err)
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
      // No coordinates yet — request GPS and show a locating state.
      setState(prev => ({ ...prev, loading: true, refreshing: true, error: null }));
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
    const { status, latitude, longitude, city, district, village, error } = location;
    const locName = city || district || village;

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      fetchWeatherForCoords(latitude, longitude, locName);
    } else if (status === 'loading') {
      // GPS is still resolving — keep the locating state.
      setState(prev => ({ ...prev, data: null, loading: true, refreshing: false, error: null }));
    } else if (status === 'idle') {
      // Location provider hasn't attempted detection yet — stay loading briefly.
      setState(prev => ({ ...prev, data: null, loading: true, error: null }));
    } else {
      // No coordinates available (denied GPS, no saved/farm location).
      // NEVER silently fetch a default city — ask the user instead.
      setState(prev => ({
        ...prev,
        data: null,
        loading: false,
        refreshing: false,
        error: error || 'Location required. Please allow location access or choose your location manually.',
      }));
    }
  }, [location, fetchWeatherForCoords]);

  // Periodic refresh so weather never goes stale; skip while a request is in flight
  // to prevent duplicate concurrent calls.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const { latitude, longitude, city, district, village } = location;
      if (state.loading || state.refreshing) return;
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        fetchWeatherForCoords(latitude, longitude, city || district || village, true);
      }
    }, WEATHER_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [location, state.loading, state.refreshing, fetchWeatherForCoords]);

  return {
    ...state,
    refreshLocation,
    toggleTemperatureUnit,
    formatTemp,
    triggerHaptic,
  };
}