import { IWeatherRepository } from '../../domain/repositories/IWeatherRepository';
import { IWeatherModuleData } from '../../domain/models/WeatherModels';
import { WeatherRemoteDataSource, weatherRemoteDataSource } from '../datasources/WeatherRemoteDataSource';
import { secureStorage } from '@/core/storage/SecureStorage';
import { analyticsService } from '@/core/services/AnalyticsService';
import { writeCache } from '@/lib/offline-cache';

const WEATHER_CACHE_KEY_PREFIX = 'agri_weather_v2';
const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

/**
 * Enterprise Weather Repository Implementation.
 * Implements coordinate-based SecureStorage persistence, sensible 15-min TTL caching,
 * offline fallback, and telemetry logging.
 */
export class WeatherRepositoryImpl implements IWeatherRepository {
  private remoteDataSource: WeatherRemoteDataSource;

  constructor(remoteDataSource?: WeatherRemoteDataSource) {
    this.remoteDataSource = remoteDataSource || weatherRemoteDataSource;
  }

  private getCacheKey(lat?: number, lng?: number): string {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return `${WEATHER_CACHE_KEY_PREFIX}_unknown`;
    }
    return `${WEATHER_CACHE_KEY_PREFIX}_${lat.toFixed(2)}_${lng.toFixed(2)}`;
  }

  public async getWeatherForecast(lat?: number, lng?: number, locationName?: string): Promise<IWeatherModuleData> {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      throw new Error('Valid latitude and longitude coordinates are required.');
    }

    const cacheKey = this.getCacheKey(lat, lng);
    let cachedData: IWeatherModuleData | null = null;

    // 1. Try reading from cache with timestamp check
    try {
      const raw = await secureStorage.getItem(cacheKey);
      if (raw) {
        cachedData = JSON.parse(raw) as IWeatherModuleData;
        const cacheAge = Date.now() - new Date(cachedData.lastUpdated).getTime();
        
        // If cached within TTL, return fresh cached data
        if (cachedData.live && typeof cachedData.live.temp === 'number' && !isNaN(cacheAge) && cacheAge < WEATHER_CACHE_TTL_MS) {
          await this.persistSharedCache(cachedData);
          return {
            ...cachedData,
            isOfflineCached: false,
          };
        }
      }
    } catch (e) {
      console.warn('[WeatherRepositoryImpl] Cache read failed:', e);
    }

    // 2. Fetch live remote weather
    try {
      const remoteData = await this.remoteDataSource.fetchRemoteWeather(lat, lng, locationName);
      await secureStorage.setItem(cacheKey, JSON.stringify(remoteData));
      await this.persistSharedCache(remoteData);

      analyticsService.logEvent('weather_loaded', {
        location: remoteData.location.name,
        temp: remoteData.live.temp,
        condition: remoteData.live.condition,
      });

      return remoteData;
    } catch (err) {
      // If network fails but we have cached data for these exact coordinates, return it as offline cached
      if (cachedData && cachedData.live) {
        console.warn('[WeatherRepositoryImpl] Fetch failed, using offline cached data:', err);
        return {
          ...cachedData,
          isOfflineCached: true,
        };
      }
      // Never invent fake weather if fetch failed and no cache exists
      throw err;
    }
  }

  /**
   * Writes the latest verified forecast into the shared `weather:home` cache so
   * weather alerts, the AI advisor, and the digital profile consume the SAME
   * normalized live data instead of a stale/never-written key.
   */
  private async persistSharedCache(remoteData: IWeatherModuleData): Promise<void> {
    try {
      writeCache<IWeatherModuleData>('weather:home', remoteData);
    } catch {
      // Shared cache is best-effort — aliveness of live weather comes first.
    }
  }

  public async refreshWeather(lat?: number, lng?: number, locationName?: string): Promise<IWeatherModuleData> {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      throw new Error('Valid latitude and longitude coordinates are required.');
    }

    const cacheKey = this.getCacheKey(lat, lng);
    const remoteData = await this.remoteDataSource.fetchRemoteWeather(lat, lng, locationName);
    await secureStorage.setItem(cacheKey, JSON.stringify(remoteData));
    await this.persistSharedCache(remoteData);

    analyticsService.logEvent('weather_refreshed', {
      location: remoteData.location.name,
      temp: remoteData.live.temp,
    });

    return remoteData;
  }
}

export const weatherRepositoryImpl = new WeatherRepositoryImpl();
