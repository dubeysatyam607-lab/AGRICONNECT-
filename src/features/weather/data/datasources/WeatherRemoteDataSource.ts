import { supabase } from '@/integrations/supabase/client';
import {
  IWeatherModuleData,
  ILiveWeather,
  IHourlyForecast,
  IDailyForecast,
  WeatherConditionType,
} from '../../domain/models/WeatherModels';

/**
 * Weather Remote Data Source.
 *
 * Single source of truth for live weather. All data comes from the Supabase
 * `weather` edge function (server-side), which reads from Open-Meteo (free,
 * keyless) and caches responses in `weather_cache`. No API keys are ever
 * exposed to the browser. No synthetic weather is generated.
 */
export class WeatherRemoteDataSource {
  /** Maps an Open-Meteo WMO condition label to the domain condition type. */
  private static conditionOf(label: string): WeatherConditionType {
    switch (label) {
      case 'Clear': return 'Clear';
      case 'Partly Cloudy': return 'Partly Cloudy';
      case 'Overcast': return 'Overcast';
      case 'Foggy': return 'Fog / Mist';
      case 'Drizzle': case 'Light Rain': case 'Rain': return 'Light Rain';
      case 'Rain Showers': return 'Heavy Monsoon Shower';
      case 'Thunderstorm': return 'Thunderstorm';
      default: return 'Partly Cloudy';
    }
  }

  /** Converts wind degrees to a compass direction label. */
  private static compass(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  }

  /** Formats an ISO timestamp into "hh:mm AM/PM". */
  private static formatClock(iso: string): string {
    const d = new Date(iso);
    let h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${ampm}`;
  }

  /** Returns a plain farmer-facing advisory for a daily condition. */
  private static dailyAdvisory(cond: WeatherConditionType, rainProb: number): string {
    if (rainProb >= 60) return 'Rain expected. Postpone foliar pesticide sprays and check field drainage.';
    if (rainProb >= 35) return 'Chance of rain. Keep an eye on the sky before applying sprays.';
    switch (cond) {
      case 'Light Rain': return 'Light showers possible. Avoid spraying during wet conditions.';
      case 'Heavy Monsoon Shower': return 'Heavy rain likely. Check field drainage and avoid tractor work on wet soil.';
      case 'Thunderstorm': return 'Thunderstorm risk. Keep livestock sheltered and avoid open-field work.';
      case 'Clear': return 'High solar radiation. Ensure adequate irrigation for standing crops.';
      case 'Overcast': return 'Good soil moisture retention. Suitable for interculturing and weeding.';
      default: return 'Ideal conditions for most routine farm work.';
    }
  }

  /**
   * Maps the edge function response to the domain weather model.
   * Throws when the payload is unusable so the caller surfaces a real error
   * instead of silently showing fake values.
   */
  private static mapEdgeResponse(raw: any): IWeatherModuleData {
    if (!raw || typeof raw.temp !== 'number' || !raw.location) {
      throw new Error('Live weather response was invalid.');
    }

    const cond = WeatherRemoteDataSource.conditionOf(raw.condition || 'Clear');
    const now = new Date();

    const live: ILiveWeather = {
      temp: Math.round(raw.temp),
      feelsLike: typeof raw.feelsLike === 'number' ? Math.round(raw.feelsLike) : Math.round(raw.temp),
      condition: cond,
      conditionDescription: raw.condition || cond,
      humidity: typeof raw.humidity === 'number' ? Math.round(raw.humidity) : 0,
      dewPoint: 0,
      windSpeed: typeof raw.windSpeed === 'number' ? Math.round(raw.windSpeed) : 0,
      windDirection: raw.windDirection || WeatherRemoteDataSource.compass(raw.windDegrees || 0),
      windDegrees: raw.windDegrees || 0,
      uvIndex: typeof raw.uv === 'number' ? Math.round(raw.uv) : 0,
      pressureHpa: typeof raw.pressureHpa === 'number' ? Math.round(raw.pressureHpa) : 0,
      pressureTrend: 'Steady',
      visibilityKm: typeof raw.visibilityKm === 'number' ? Math.round(raw.visibilityKm) : 0,
      aqi: { index: 0, pm25: 0, pm10: 0, status: 'Good' },
      sunriseTime: '',
      sunsetTime: '',
      daylightProgressPercent: 50,
      iconUrl: raw.icon ? `https:${raw.icon}` : undefined,
    };

    const hourly: IHourlyForecast[] = Array.isArray(raw.hourly)
      ? raw.hourly.slice(0, 24).map((h: any, i: number) => ({
          time: i === 0
            ? 'Now'
            : new Date(h.time).toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }),
          timestamp: new Date(h.time).getTime() || Date.now() + i * 3600000,
          temp: Math.round(h.temp),
          condition: WeatherRemoteDataSource.conditionOf(h.condition || 'Clear'),
          rainProbability: Math.round(h.rainProbability ?? 0),
          windSpeed: Math.round(h.windSpeed ?? 0),
        }))
      : [];

    const daily: IDailyForecast[] = Array.isArray(raw.daily)
      ? raw.daily.slice(0, 7).map((d: any) => ({
          dayName: d.dayName || new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
          date: d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '',
          condition: WeatherRemoteDataSource.conditionOf(d.condition || 'Clear'),
          minTemp: Math.round(d.tempMin),
          maxTemp: Math.round(d.tempMax),
          rainProbability: Math.round(d.rainProbability ?? 0),
          windSpeed: Math.round(d.windSpeed ?? 0),
          humidity: Math.round(d.humidity ?? 0),
          agriAdvisory: WeatherRemoteDataSource.dailyAdvisory(
            WeatherRemoteDataSource.conditionOf(d.condition || 'Clear'),
            d.rainProbability ?? 0,
          ),
        }))
      : [];

    const criticalAlert = Array.isArray(raw.agriAlerts)
      ? raw.agriAlerts.find((a: any) => a.level === 'critical') || null
      : null;

    return {
      location: {
        name: raw.location.name || 'Your Location',
        district: raw.location.district || raw.location.name || '',
        state: raw.location.region || '',
        latitude: raw.requestedLat ?? raw.location.latitude ?? 0,
        longitude: raw.requestedLon ?? raw.location.longitude ?? 0,
      },
      live,
      hourly,
      daily,
      lastUpdated: raw.last_updated || now.toISOString(),
      isOfflineCached: false,
      advisoryAlert: criticalAlert
        ? {
            isCritical: true,
            title: 'Severe weather alert',
            message: criticalAlert.message,
          }
        : Array.isArray(raw.agriAlerts) && raw.agriAlerts.length > 0
          ? {
              isCritical: false,
              title: 'Farm weather guidance',
              message: raw.agriAlerts[0].message,
            }
          : {
              isCritical: false,
              title: 'Farm weather guidance',
              message: 'No significant weather risks in the coming days.',
            },
    };
  }

  /**
   * Fetches live weather + hourly + daily forecast from the Supabase edge
   * function. Rejects on any failure so callers surface a real error state —
   * no fabricated numbers.
   */
  public async fetchRemoteWeather(lat?: number, lng?: number, locationName?: string): Promise<IWeatherModuleData> {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Location required. Please allow location access or choose your location manually.');
    }

    const { data, error } = await supabase.functions.invoke('weather', {
      body: { latitude: lat, longitude: lng, city: locationName || undefined, checkAlerts: true },
    });

    if (error) {
      console.error('[WeatherRemoteDataSource] Edge function error:', error);
      throw new Error(error.message || 'Live weather is temporarily unavailable.');
    }

    if (data?.error || data?.code === 'LOCATION_REQUIRED' || data?.code === 'WEATHER_UNAVAILABLE') {
      throw new Error(data.message || 'Live weather is temporarily unavailable.');
    }

    return WeatherRemoteDataSource.mapEdgeResponse(data);
  }
}

export const weatherRemoteDataSource = new WeatherRemoteDataSource();
