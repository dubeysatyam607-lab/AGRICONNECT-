import { IWeatherModuleData } from '../models/WeatherModels';

/**
 * Enterprise Abstract Weather Repository Contract.
 * Defines dependency inversion methods for fetching weather forecast and agro-advisories with offline cache support.
 */
export interface IWeatherRepository {
  /**
   * Fetches comprehensive weather data for given GPS coordinates or location string.
   * Checks local offline cache first for instant 60 FPS rendering, then refreshes from remote.
   */
  getWeatherForecast(lat?: number, lng?: number, locationName?: string): Promise<IWeatherModuleData>;

  /**
   * Forces a live refresh of weather data from the remote server, bypassing cache.
   */
  refreshWeather(lat?: number, lng?: number): Promise<IWeatherModuleData>;
}
