/**
 * Enterprise Weather Domain Models.
 * Comprehensive weather data structures supporting Google Weather animations, hourly timelines, and 7-day agricultural forecasts.
 */

export type WeatherConditionType = 
  | 'Sunny'
  | 'Clear'
  | 'Partly Cloudy'
  | 'Overcast'
  | 'Light Rain'
  | 'Heavy Monsoon Shower'
  | 'Thunderstorm'
  | 'Fog / Mist'
  | 'Hot & Dry Wind (Loo)';

export interface ILiveWeather {
  temp: number; // in Celsius
  feelsLike: number;
  condition: WeatherConditionType;
  conditionDescription: string;
  humidity: number; // percentage (0-100)
  dewPoint: number; // in Celsius
  windSpeed: number; // km/h
  windDirection: string; // e.g., "NW", "SSW", "E"
  windDegrees: number; // 0 - 360 for compass rotation animation
  uvIndex: number; // 0 - 12+
  pressureHpa: number; // atmospheric pressure in hPa/mBar (e.g. 1013)
  pressureTrend: 'Rising' | 'Falling' | 'Steady';
  visibilityKm: number; // visibility in km (e.g., 10)
  aqi: {
    index: number; // 1 (Good) to 5 (Severe)
    pm25: number;
    pm10: number;
    status: 'Good' | 'Moderate' | 'Poor' | 'Unhealthy' | 'Severe';
  };
  sunriseTime: string; // e.g. "05:48 AM"
  sunsetTime: string; // e.g. "07:15 PM"
  daylightProgressPercent: number; // 0 to 100 for sun trajectory arc calculation
  iconUrl?: string;
}

export interface IHourlyForecast {
  time: string; // e.g., "Now", "1 PM", "2 PM", "3 PM"
  timestamp: number;
  temp: number;
  condition: WeatherConditionType;
  iconUrl?: string;
  rainProbability: number; // percentage (0-100)
  windSpeed: number;
}

export interface IDailyForecast {
  dayName: string; // e.g., "Today", "Mon", "Tue", "Wed"
  date: string; // e.g., "28 Jul"
  condition: WeatherConditionType;
  iconUrl?: string;
  minTemp: number;
  maxTemp: number;
  rainProbability: number; // percentage (0-100)
  windSpeed: number;
  humidity: number;
  agriAdvisory: string; // Farmer-specific advisory for that day
}

export interface IWeatherLocation {
  name: string; // e.g. "Jaipur Mandi" or "Tehsil Haveli"
  district: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface IWeatherModuleData {
  location: IWeatherLocation;
  live: ILiveWeather;
  hourly: IHourlyForecast[]; // 24 hours
  daily: IDailyForecast[]; // 7 days
  lastUpdated: string;
  isOfflineCached: boolean;
  advisoryAlert?: {
    isCritical: boolean;
    title: string;
    message: string;
  };
}
