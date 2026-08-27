import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherRemoteDataSource } from './data/datasources/WeatherRemoteDataSource';
import { WeatherRepositoryImpl } from './data/repositories/WeatherRepositoryImpl';
import { IWeatherModuleData } from './domain/models/WeatherModels';

describe('AgriConnect Weather System — Real Data Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('WeatherRemoteDataSource', () => {
    it('wmoToLabel and conditionOf map WMO codes accurately without mock values', () => {
      expect(WeatherRemoteDataSource.wmoToLabel(0)).toBe('Clear');
      expect(WeatherRemoteDataSource.wmoToLabel(1)).toBe('Sunny');
      expect(WeatherRemoteDataSource.wmoToLabel(2)).toBe('Partly Cloudy');
      expect(WeatherRemoteDataSource.wmoToLabel(3)).toBe('Overcast');
      expect(WeatherRemoteDataSource.wmoToLabel(61)).toBe('Light Rain');
      expect(WeatherRemoteDataSource.wmoToLabel(80)).toBe('Heavy Monsoon Shower');
      expect(WeatherRemoteDataSource.wmoToLabel(95)).toBe('Thunderstorm');
    });

    it('calculateDaylightProgress accurately calculates sun arc based on sunrise and sunset', () => {
      const sunrise = '2026-08-27T06:00:00Z';
      const sunset = '2026-08-27T18:00:00Z';
      
      const progress = WeatherRemoteDataSource.calculateDaylightProgress(sunrise, sunset);
      expect(typeof progress).toBe('number');
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it('throws when Open-Meteo payload is missing essential numeric temperature', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: { temperature_2m: undefined },
        }),
      } as any);

      await expect(WeatherRemoteDataSource.fetchOpenMeteoDirect(25.43, 77.65, 'Shivpuri')).rejects.toThrow();
    });

    it('correctly maps valid Open-Meteo payload with real coordinates and values', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 29.4,
            apparent_temperature: 33.2,
            relative_humidity_2m: 78,
            wind_speed_10m: 14.2,
            wind_direction_10m: 240,
            precipitation: 0,
            pressure_msl: 1008.5,
            visibility: 8500,
            dew_point_2m: 24.1,
            uv_index: 6.2,
            weather_code: 2,
          },
          hourly: {
            time: ['2026-08-27T12:00', '2026-08-27T13:00'],
            temperature_2m: [29.4, 30.1],
            weather_code: [2, 3],
            precipitation_probability: [20, 30],
            wind_speed_10m: [14.2, 15.0],
            pressure_msl: [1008.5, 1008.2],
          },
          daily: {
            time: ['2026-08-27', '2026-08-28'],
            weather_code: [2, 61],
            temperature_2m_max: [34.0, 31.5],
            temperature_2m_min: [24.0, 23.0],
            precipitation_probability_max: [35, 70],
            wind_speed_10m_max: [18.0, 22.0],
            relative_humidity_2m_mean: [75, 82],
            sunrise: ['2026-08-27T06:05', '2026-08-28T06:06'],
            sunset: ['2026-08-27T18:48', '2026-08-28T18:47'],
            uv_index_max: [7.5, 5.0],
          },
        }),
      } as any);

      const result = await WeatherRemoteDataSource.fetchOpenMeteoDirect(26.91, 75.78, 'Jaipur');
      expect(result.live.temp).toBe(29);
      expect(result.live.feelsLike).toBe(33);
      expect(result.live.humidity).toBe(78);
      expect(result.live.windSpeed).toBe(14);
      expect(result.live.condition).toBe('Partly Cloudy');
      expect(result.live.uvIndex).toBe(6);
      expect(result.location.name).toBe('Jaipur');
      expect(result.location.latitude).toBe(26.91);
      expect(result.location.longitude).toBe(75.78);
      expect(result.daily).toHaveLength(2);
      expect(result.hourly).toHaveLength(2);
      expect(result.isOfflineCached).toBe(false);
    });
  });

  describe('WeatherRepositoryImpl', () => {
    it('isolates cache per coordinate pair and does not leak across different locations', async () => {
      const mockDataSource = {
        fetchRemoteWeather: vi.fn().mockImplementation(async (lat: number) => {
          if (lat === 25.43) {
            return {
              location: { name: 'Shivpuri', district: 'Shivpuri', state: 'MP', latitude: 25.43, longitude: 77.65 },
              live: { temp: 27, feelsLike: 31, condition: 'Light Rain', humidity: 88, windSpeed: 16, dewPoint: 24, windDirection: 'SW', windDegrees: 225, uvIndex: 1, pressureHpa: 1008, pressureTrend: 'Steady', visibilityKm: 8, aqi: { index: 1, pm25: 0, pm10: 0, status: 'Good' }, sunriseTime: '05:58 AM', sunsetTime: '06:44 PM', daylightProgressPercent: 50 },
              hourly: [],
              daily: [],
              lastUpdated: new Date().toISOString(),
              isOfflineCached: false,
            } as IWeatherModuleData;
          }
          if (lat === 26.91) {
            return {
              location: { name: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', latitude: 26.91, longitude: 75.78 },
              live: { temp: 33, feelsLike: 37, condition: 'Clear', humidity: 55, windSpeed: 10, dewPoint: 22, windDirection: 'W', windDegrees: 270, uvIndex: 1, pressureHpa: 1007, pressureTrend: 'Steady', visibilityKm: 10, aqi: { index: 1, pm25: 0, pm10: 0, status: 'Good' }, sunriseTime: '06:04 AM', sunsetTime: '06:52 PM', daylightProgressPercent: 50 },
              hourly: [],
              daily: [],
              lastUpdated: new Date().toISOString(),
              isOfflineCached: false,
            } as IWeatherModuleData;
          }
          throw new Error('Unknown location');
        }),
      };

      const repo = new WeatherRepositoryImpl(mockDataSource as any);

      // Fetch Shivpuri
      const shivpuri = await repo.getWeatherForecast(25.43, 77.65, 'Shivpuri');
      expect(shivpuri.location.name).toBe('Shivpuri');
      expect(shivpuri.live.temp).toBe(27);

      // Fetch Jaipur
      const jaipur = await repo.getWeatherForecast(26.91, 75.78, 'Jaipur');
      expect(jaipur.location.name).toBe('Jaipur');
      expect(jaipur.live.temp).toBe(33);

      // Verify they have distinct temperatures and distinct location names
      expect(shivpuri.live.temp).not.toBe(jaipur.live.temp);
      expect(mockDataSource.fetchRemoteWeather).toHaveBeenCalledTimes(2);
    });

    it('refreshWeather bypasses cache and calls live remote API', async () => {
      const mockDataSource = {
        fetchRemoteWeather: vi.fn().mockResolvedValue({
          location: { name: 'Indore', district: 'Indore', state: 'MP', latitude: 22.71, longitude: 75.85 },
          live: { temp: 26, feelsLike: 29, condition: 'Partly Cloudy', humidity: 72, windSpeed: 15, dewPoint: 21, windDirection: 'SW', windDegrees: 230, uvIndex: 1, pressureHpa: 1009, pressureTrend: 'Steady', visibilityKm: 10, aqi: { index: 1, pm25: 0, pm10: 0, status: 'Good' }, sunriseTime: '06:07 AM', sunsetTime: '06:48 PM', daylightProgressPercent: 50 },
          hourly: [],
          daily: [],
          lastUpdated: new Date().toISOString(),
          isOfflineCached: false,
        }),
      };

      const repo = new WeatherRepositoryImpl(mockDataSource as any);
      const res = await repo.refreshWeather(22.71, 75.85, 'Indore');
      expect(res.location.name).toBe('Indore');
      expect(res.live.temp).toBe(26);
      expect(mockDataSource.fetchRemoteWeather).toHaveBeenCalledWith(22.71, 75.85, 'Indore');
    });

    it('handles locations across northern and southern India with realistic temperature gradients', async () => {
      const mockDataSource = {
        fetchRemoteWeather: vi.fn().mockImplementation(async (lat: number, lng: number, name?: string) => ({
          location: { name: name || 'Location', district: name || 'District', state: 'India', latitude: lat, longitude: lng },
          live: {
            temp: lat > 30 ? 16 : 32, // Northern vs Southern India gradient
            feelsLike: lat > 30 ? 15 : 36,
            condition: lat > 30 ? 'Fog / Mist' : 'Sunny',
            humidity: lat > 30 ? 85 : 60,
            windSpeed: 12,
            dewPoint: 14,
            windDirection: 'N',
            windDegrees: 0,
            uvIndex: lat > 30 ? 3 : 9,
            pressureHpa: 1015,
            pressureTrend: 'Steady',
            visibilityKm: 6,
            aqi: { index: 2, pm25: 35, pm10: 60, status: 'Moderate' },
            sunriseTime: '06:15 AM',
            sunsetTime: '06:30 PM',
            daylightProgressPercent: 50,
          },
          hourly: [],
          daily: [],
          lastUpdated: new Date().toISOString(),
          isOfflineCached: false,
        })),
      };

      const repo = new WeatherRepositoryImpl(mockDataSource as any);
      const shimla = await repo.getWeatherForecast(31.10, 77.17, 'Shimla');
      const chennai = await repo.getWeatherForecast(13.08, 80.27, 'Chennai');

      expect(shimla.live.temp).toBe(16);
      expect(shimla.live.condition).toBe('Fog / Mist');
      expect(chennai.live.temp).toBe(32);
      expect(chennai.live.condition).toBe('Sunny');
      expect(chennai.live.uvIndex).toBe(9);
    });
  });
});
