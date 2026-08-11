import { IWeatherRepository } from '../../domain/repositories/IWeatherRepository';
import { IWeatherModuleData } from '../../domain/models/WeatherModels';
import { WeatherRemoteDataSource, weatherRemoteDataSource } from '../datasources/WeatherRemoteDataSource';
import { secureStorage } from '@/core/storage/SecureStorage';
import { analyticsService } from '@/core/services/AnalyticsService';

const WEATHER_CACHE_KEY = 'agri_weather_module_cache_v1';

/**
 * Enterprise Weather Repository Implementation.
 * Implements SecureStorage offline persistence, background cloud sync, and telemetry logging.
 */
export class WeatherRepositoryImpl implements IWeatherRepository {
  private remoteDataSource: WeatherRemoteDataSource;

  constructor(remoteDataSource?: WeatherRemoteDataSource) {
    this.remoteDataSource = remoteDataSource || weatherRemoteDataSource;
  }

  public async getWeatherForecast(lat?: number, lng?: number, locationName?: string): Promise<IWeatherModuleData> {
    const cacheKey = `${WEATHER_CACHE_KEY}_${lat ? lat.toFixed(2) : 'default'}_${lng ? lng.toFixed(2) : 'default'}`;

    // 1. Try reading from SecureStorage cache for instant 60 FPS loading
    try {
      const raw = await secureStorage.getItem(cacheKey);
      const cached = raw ? JSON.parse(raw) as IWeatherModuleData : null;
      if (cached && cached.live) {
        // Asynchronously synchronize remote weather in background without blocking UI
        this.syncRemoteBackground(lat, lng, locationName, cacheKey);
        return {
          ...cached,
          isOfflineCached: true,
        };
      }
    } catch (e) {
      console.warn('[WeatherRepositoryImpl] Cache read failed:', e);
    }

    // 2. Try fetching live remote weather
    const remoteData = await this.remoteDataSource.fetchRemoteWeather(lat, lng, locationName);
    await secureStorage.setItem(cacheKey, JSON.stringify(remoteData));
    
    analyticsService.logEvent('weather_loaded', {
      location: remoteData.location.name,
      temp: remoteData.live.temp,
      condition: remoteData.live.condition,
    });

    return remoteData;
  }

  public async refreshWeather(lat?: number, lng?: number): Promise<IWeatherModuleData> {
    const cacheKey = `${WEATHER_CACHE_KEY}_${lat ? lat.toFixed(2) : 'default'}_${lng ? lng.toFixed(2) : 'default'}`;
    const remoteData = await this.remoteDataSource.fetchRemoteWeather(lat, lng);
    await secureStorage.setItem(cacheKey, JSON.stringify(remoteData));
    
    analyticsService.logEvent('weather_refreshed', {
      location: remoteData.location.name,
      temp: remoteData.live.temp,
    });

    return remoteData;
  }

  private async syncRemoteBackground(lat?: number, lng?: number, locName?: string, cacheKey?: string): Promise<void> {
    try {
      const remote = await this.remoteDataSource.fetchRemoteWeather(lat, lng, locName);
      if (remote && cacheKey) {
        await secureStorage.setItem(cacheKey, JSON.stringify(remote));
      }
    } catch {
      // Ignore background sync errors
    }
  }
}

export const weatherRepositoryImpl = new WeatherRepositoryImpl();
