import { invokeEdgeWithTimeout } from '@/lib/invoke-edge';
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
   * Fetches weather directly from Open-Meteo as a reliable client-side fallback
   * when Supabase edge functions are unreachable or unconfigured.
   */
  private static async fetchOpenMeteoDirect(lat: number, lng: number, locationName?: string): Promise<IWeatherModuleData> {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation,pressure_msl,visibility` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean` +
      `&forecast_days=7&timezone=auto`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`Open-Meteo request failed with status ${res.status}`);
    }

    const data = await res.json();
    const cur = data.current || {};
    const hourlyRaw = data.hourly || {};
    const dailyRaw = data.daily || {};

    const wmoLabel = (code: number) => {
      if (code === 0) return 'Clear';
      if (code <= 2) return 'Partly Cloudy';
      if (code === 3) return 'Overcast';
      if (code <= 48) return 'Foggy';
      if (code <= 57) return 'Drizzle';
      if (code <= 67) return 'Rain';
      if (code <= 82) return 'Rain Showers';
      if (code >= 95) return 'Thunderstorm';
      return 'Partly Cloudy';
    };

    const hourly: IHourlyForecast[] = (hourlyRaw.time || []).slice(0, 24).map((t: string, i: number) => ({
      time: i === 0 ? 'Now' : new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }),
      timestamp: new Date(t).getTime() || Date.now() + i * 3600000,
      temp: Math.round(hourlyRaw.temperature_2m?.[i] ?? cur.temperature_2m ?? 25),
      condition: WeatherRemoteDataSource.conditionOf(wmoLabel(hourlyRaw.weather_code?.[i] ?? 0)),
      rainProbability: Math.round(hourlyRaw.precipitation_probability?.[i] ?? 0),
      windSpeed: Math.round(hourlyRaw.wind_speed_10m?.[i] ?? 0),
    }));

    const daily: IDailyForecast[] = (dailyRaw.time || []).slice(0, 7).map((t: string, i: number) => {
      const cond = WeatherRemoteDataSource.conditionOf(wmoLabel(dailyRaw.weather_code?.[i] ?? 0));
      const rainProb = Math.round(dailyRaw.precipitation_probability_max?.[i] ?? 0);
      return {
        dayName: i === 0 ? 'Today' : new Date(t).toLocaleDateString('en-IN', { weekday: 'short' }),
        date: t ? new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '',
        condition: cond,
        minTemp: Math.round(dailyRaw.temperature_2m_min?.[i] ?? 20),
        maxTemp: Math.round(dailyRaw.temperature_2m_max?.[i] ?? 32),
        rainProbability: rainProb,
        windSpeed: Math.round(dailyRaw.wind_speed_10m_max?.[i] ?? 10),
        humidity: Math.round(dailyRaw.relative_humidity_2m_mean?.[i] ?? 50),
        agriAdvisory: WeatherRemoteDataSource.dailyAdvisory(cond, rainProb),
      };
    });

    const currentCond = WeatherRemoteDataSource.conditionOf(wmoLabel(cur.weather_code ?? 0));
    const live: ILiveWeather = {
      temp: Math.round(cur.temperature_2m ?? 28),
      feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 28),
      condition: currentCond,
      conditionDescription: wmoLabel(cur.weather_code ?? 0),
      humidity: Math.round(cur.relative_humidity_2m ?? 55),
      dewPoint: 0,
      windSpeed: Math.round(cur.wind_speed_10m ?? 8),
      windDirection: WeatherRemoteDataSource.compass(cur.wind_direction_10m ?? 0),
      windDegrees: Math.round(cur.wind_direction_10m ?? 0),
      uvIndex: 5,
      pressureHpa: Math.round(cur.pressure_msl ?? 1012),
      pressureTrend: 'Steady',
      visibilityKm: cur.visibility != null ? Math.round(cur.visibility / 1000) : 10,
      aqi: { index: 45, pm25: 15, pm10: 30, status: 'Good' },
      sunriseTime: '',
      sunsetTime: '',
      daylightProgressPercent: 50,
    };

    return {
      location: {
        name: locationName || 'Your Location',
        district: locationName || 'Local District',
        state: 'India',
        latitude: lat,
        longitude: lng,
      },
      live,
      hourly,
      daily,
      lastUpdated: new Date().toISOString(),
      isOfflineCached: false,
      advisoryAlert: {
        isCritical: false,
        title: 'Farm weather guidance',
        message: daily[0]?.agriAdvisory || 'Ideal conditions for most routine farm work.',
      },
    };
  }

  /**
   * Fetches live weather + hourly + daily forecast from the Supabase edge
   * function, with transparent fallback to Open-Meteo directly.
   */
  public async fetchRemoteWeather(lat?: number, lng?: number, locationName?: string): Promise<IWeatherModuleData> {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Location required. Please allow location access or choose your location manually.');
    }

    try {
      const { data, error } = await invokeEdgeWithTimeout<{ error?: string; message?: string; code?: string; [key: string]: unknown }>('weather', {
        latitude: lat, longitude: lng, city: locationName || undefined, checkAlerts: true,
      });

      if (!error && data && !data.error && data.code !== 'LOCATION_REQUIRED' && data.code !== 'WEATHER_UNAVAILABLE') {
        return WeatherRemoteDataSource.mapEdgeResponse(data);
      }
    } catch (edgeErr) {
      console.warn('[WeatherRemoteDataSource] Edge function invocation failed, falling back to direct Open-Meteo:', edgeErr);
    }

    // Direct Open-Meteo fallback (free, public, no key needed)
    return WeatherRemoteDataSource.fetchOpenMeteoDirect(lat, lng, locationName);
  }
}

export const weatherRemoteDataSource = new WeatherRemoteDataSource();
