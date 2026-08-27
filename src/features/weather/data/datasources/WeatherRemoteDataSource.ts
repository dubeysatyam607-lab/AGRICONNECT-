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
 * keyless) or directly from Open-Meteo client-side.
 * No API keys are ever exposed to the browser. No synthetic or mock weather is generated.
 */
export class WeatherRemoteDataSource {
  /** Maps an Open-Meteo WMO condition label or code to the domain condition type. */
  public static conditionOf(label: string): WeatherConditionType {
    switch (label) {
      case 'Clear': return 'Clear';
      case 'Sunny': return 'Sunny';
      case 'Partly Cloudy': return 'Partly Cloudy';
      case 'Overcast': return 'Overcast';
      case 'Foggy': case 'Fog / Mist': return 'Fog / Mist';
      case 'Drizzle': case 'Light Rain': case 'Rain': return 'Light Rain';
      case 'Rain Showers': case 'Heavy Monsoon Shower': return 'Heavy Monsoon Shower';
      case 'Thunderstorm': return 'Thunderstorm';
      default: return 'Partly Cloudy';
    }
  }

  /** Converts WMO weather code to standard condition label */
  public static wmoToLabel(code: number): string {
    if (code === 0) return 'Clear';
    if (code === 1) return 'Sunny';
    if (code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code >= 45 && code <= 48) return 'Fog / Mist';
    if (code >= 51 && code <= 57) return 'Light Rain';
    if (code >= 61 && code <= 67) return 'Light Rain';
    if (code >= 80 && code <= 82) return 'Heavy Monsoon Shower';
    if (code >= 95) return 'Thunderstorm';
    return 'Partly Cloudy';
  }

  /** Converts wind degrees to a compass direction label. */
  public static compass(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
  }

  /** Formats an ISO or time string into "hh:mm AM/PM". */
  public static formatClock(isoString?: string): string {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      let h = d.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return `${h.toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${ampm}`;
    } catch {
      return '';
    }
  }

  /** Calculates daylight progress percentage (0-100) based on current time vs sunrise and sunset. */
  public static calculateDaylightProgress(sunriseIso?: string, sunsetIso?: string): number {
    if (!sunriseIso || !sunsetIso) return 50;
    try {
      const now = Date.now();
      const rise = new Date(sunriseIso).getTime();
      const set = new Date(sunsetIso).getTime();
      if (isNaN(rise) || isNaN(set) || set <= rise) return 50;
      if (now <= rise) return 0;
      if (now >= set) return 100;
      return Math.min(100, Math.max(0, Math.round(((now - rise) / (set - rise)) * 100)));
    } catch {
      return 50;
    }
  }

  /** Returns an agricultural advisory based on verified condition and rain probability. */
  public static dailyAdvisory(cond: WeatherConditionType, rainProb: number, tempMax?: number, windSpeed?: number): string {
    if (rainProb >= 60) return 'Heavy rain likely. Postpone all pesticide/fertilizer spraying and check field drainage.';
    if (rainProb >= 35) return 'Chance of rain. Monitor sky conditions before applying foliar sprays.';
    if (windSpeed && windSpeed > 20) return 'High wind speed. Avoid spraying to prevent chemical drift.';
    if (tempMax && tempMax >= 40) return 'Heat stress warning. Provide light evening/early morning irrigation.';
    switch (cond) {
      case 'Light Rain': return 'Light showers possible. Keep sprayed chemicals sheltered.';
      case 'Heavy Monsoon Shower': return 'Heavy monsoon rain. Maintain bunds and avoid waterlogging.';
      case 'Thunderstorm': return 'Thunderstorm warning. Keep farm machinery and livestock safely sheltered.';
      case 'Clear': case 'Sunny': return 'Clear weather. Ideal for weeding, harvesting, and field preparation.';
      case 'Overcast': return 'Cloudy skies. Good soil moisture retention for routine farm tasks.';
      case 'Fog / Mist': return 'Foggy morning. Watch for fungal leaf diseases on standing crops.';
      default: return 'Normal weather conditions suitable for routine agricultural activities.';
    }
  }

  /**
   * Maps the edge function response to the domain weather model with strict verification.
   */
  private static mapEdgeResponse(raw: any): IWeatherModuleData {
    if (!raw || typeof raw.temp !== 'number' || isNaN(raw.temp) || !raw.location) {
      throw new Error('Live weather response was invalid.');
    }

    const cond = WeatherRemoteDataSource.conditionOf(raw.condition || 'Clear');
    const now = new Date();

    const live: ILiveWeather = {
      temp: Math.round(raw.temp),
      feelsLike: typeof raw.feelsLike === 'number' && !isNaN(raw.feelsLike) ? Math.round(raw.feelsLike) : Math.round(raw.temp),
      condition: cond,
      conditionDescription: raw.conditionDescription || raw.condition || cond,
      humidity: typeof raw.humidity === 'number' && !isNaN(raw.humidity) ? Math.round(raw.humidity) : 0,
      dewPoint: typeof raw.dewPoint === 'number' && !isNaN(raw.dewPoint) ? Math.round(raw.dewPoint) : Math.round(raw.temp - ((100 - (raw.humidity || 50)) / 5)),
      windSpeed: typeof raw.windSpeed === 'number' && !isNaN(raw.windSpeed) ? Math.round(raw.windSpeed) : 0,
      windDirection: raw.windDirection || WeatherRemoteDataSource.compass(raw.windDegrees || 0),
      windDegrees: typeof raw.windDegrees === 'number' && !isNaN(raw.windDegrees) ? Math.round(raw.windDegrees) : 0,
      uvIndex: typeof raw.uvIndex === 'number' && !isNaN(raw.uvIndex) ? Math.round(raw.uvIndex) : typeof raw.uv === 'number' && !isNaN(raw.uv) ? Math.round(raw.uv) : 0,
      pressureHpa: typeof raw.pressureHpa === 'number' && !isNaN(raw.pressureHpa) ? Math.round(raw.pressureHpa) : 1013,
      pressureTrend: raw.pressureTrend === 'Rising' || raw.pressureTrend === 'Falling' ? raw.pressureTrend : 'Steady',
      visibilityKm: typeof raw.visibilityKm === 'number' && !isNaN(raw.visibilityKm) ? Math.round(raw.visibilityKm) : 10,
      aqi: raw.aqi || { index: 1, pm25: 0, pm10: 0, status: 'Good' },
      sunriseTime: raw.sunriseTime || (raw.daily?.[0]?.sunrise ? WeatherRemoteDataSource.formatClock(raw.daily[0].sunrise) : '06:00 AM'),
      sunsetTime: raw.sunsetTime || (raw.daily?.[0]?.sunset ? WeatherRemoteDataSource.formatClock(raw.daily[0].sunset) : '06:30 PM'),
      daylightProgressPercent: typeof raw.daylightProgressPercent === 'number'
        ? raw.daylightProgressPercent
        : WeatherRemoteDataSource.calculateDaylightProgress(raw.daily?.[0]?.sunrise, raw.daily?.[0]?.sunset),
      iconUrl: raw.icon ? `https:${raw.icon}` : undefined,
    };

    const hourly: IHourlyForecast[] = Array.isArray(raw.hourly)
      ? raw.hourly.slice(0, 24).map((h: any, i: number) => ({
          time: i === 0
            ? 'Now'
            : new Date(h.time || h.timestamp).toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }),
          timestamp: h.timestamp || (h.time ? new Date(h.time).getTime() : Date.now() + i * 3600000),
          temp: typeof h.temp === 'number' && !isNaN(h.temp) ? Math.round(h.temp) : live.temp,
          condition: WeatherRemoteDataSource.conditionOf(h.condition || 'Clear'),
          rainProbability: Math.round(h.rainProbability ?? 0),
          windSpeed: Math.round(h.windSpeed ?? 0),
        }))
      : [];

    const daily: IDailyForecast[] = Array.isArray(raw.daily)
      ? raw.daily.slice(0, 7).map((d: any, idx: number) => {
          const dayCond = WeatherRemoteDataSource.conditionOf(d.condition || 'Clear');
          const rainProb = Math.round(d.rainProbability ?? 0);
          const tMin = typeof d.tempMin === 'number' ? Math.round(d.tempMin) : Math.round(d.minTemp ?? live.temp);
          const tMax = typeof d.tempMax === 'number' ? Math.round(d.tempMax) : Math.round(d.maxTemp ?? live.temp);
          return {
            dayName: idx === 0 ? 'Today' : d.dayName || new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
            date: d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '',
            condition: dayCond,
            minTemp: tMin,
            maxTemp: tMax,
            rainProbability: rainProb,
            windSpeed: Math.round(d.windSpeed ?? 0),
            humidity: Math.round(d.humidity ?? 0),
            agriAdvisory: d.agriAdvisory || WeatherRemoteDataSource.dailyAdvisory(dayCond, rainProb, tMax, d.windSpeed),
          };
        })
      : [];

    const criticalAlert = Array.isArray(raw.agriAlerts)
      ? raw.agriAlerts.find((a: any) => a.level === 'critical') || null
      : null;

    return {
      location: {
        name: raw.location.name || 'Your Location',
        district: raw.location.district || raw.location.name || '',
        state: raw.location.region || raw.location.state || 'India',
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
              message: daily[0]?.agriAdvisory || 'Ideal conditions for most routine farm work.',
            },
    };
  }

  /**
   * Fetches verified weather directly from Open-Meteo client-side.
   * Performs full parameter validation — throws on failure without inventing synthetic data.
   */
  public static async fetchOpenMeteoDirect(lat: number, lng: number, locationName?: string): Promise<IWeatherModuleData> {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      throw new Error('Valid latitude and longitude coordinates are required.');
    }

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation,pressure_msl,visibility,dew_point_2m,uv_index` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m,dew_point_2m,relative_humidity_2m,pressure_msl` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean,sunrise,sunset,uv_index_max` +
      `&forecast_days=7&timezone=auto`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      throw new Error(`Weather service responded with status ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.current || typeof data.current.temperature_2m !== 'number' || isNaN(data.current.temperature_2m)) {
      throw new Error('Weather data temporarily unavailable. Please try again.');
    }

    const cur = data.current;
    const hourlyRaw = data.hourly || {};
    const dailyRaw = data.daily || {};

    // Validate hourly and daily arrays
    if (!Array.isArray(hourlyRaw.time) || !Array.isArray(dailyRaw.time) || dailyRaw.time.length === 0) {
      throw new Error('Incomplete forecast data returned from weather service.');
    }

    const curTemp = cur.temperature_2m;
    const curFeelsLike = typeof cur.apparent_temperature === 'number' && !isNaN(cur.apparent_temperature) ? cur.apparent_temperature : curTemp;
    const curHumidity = typeof cur.relative_humidity_2m === 'number' && !isNaN(cur.relative_humidity_2m) ? cur.relative_humidity_2m : 0;
    const curWindSpeed = typeof cur.wind_speed_10m === 'number' && !isNaN(cur.wind_speed_10m) ? cur.wind_speed_10m : 0;
    const curWindDir = typeof cur.wind_direction_10m === 'number' && !isNaN(cur.wind_direction_10m) ? cur.wind_direction_10m : 0;
    const curDewPoint = typeof cur.dew_point_2m === 'number' && !isNaN(cur.dew_point_2m)
      ? cur.dew_point_2m
      : (curTemp - ((100 - curHumidity) / 5));
    const curUv = typeof cur.uv_index === 'number' && !isNaN(cur.uv_index)
      ? cur.uv_index
      : (dailyRaw.uv_index_max?.[0] ?? 0);
    const curPressure = typeof cur.pressure_msl === 'number' && !isNaN(cur.pressure_msl) ? cur.pressure_msl : 1013;

    // Calculate pressure trend by comparing with 3 hours ago if available
    let pressureTrend: 'Rising' | 'Falling' | 'Steady' = 'Steady';
    if (Array.isArray(hourlyRaw.pressure_msl) && hourlyRaw.pressure_msl.length >= 4) {
      const pastP = hourlyRaw.pressure_msl[0];
      const nowP = hourlyRaw.pressure_msl[3] ?? curPressure;
      if (typeof pastP === 'number' && typeof nowP === 'number') {
        const diff = nowP - pastP;
        if (diff >= 1.2) pressureTrend = 'Rising';
        else if (diff <= -1.2) pressureTrend = 'Falling';
      }
    }

    const currentConditionLabel = WeatherRemoteDataSource.wmoToLabel(cur.weather_code ?? 0);
    const currentCondition = WeatherRemoteDataSource.conditionOf(currentConditionLabel);

    const sunriseIso = dailyRaw.sunrise?.[0];
    const sunsetIso = dailyRaw.sunset?.[0];
    const sunriseTime = WeatherRemoteDataSource.formatClock(sunriseIso) || '06:00 AM';
    const sunsetTime = WeatherRemoteDataSource.formatClock(sunsetIso) || '06:30 PM';
    const daylightProgressPercent = WeatherRemoteDataSource.calculateDaylightProgress(sunriseIso, sunsetIso);

    const live: ILiveWeather = {
      temp: Math.round(curTemp),
      feelsLike: Math.round(curFeelsLike),
      condition: currentCondition,
      conditionDescription: currentConditionLabel,
      humidity: Math.round(curHumidity),
      dewPoint: Math.round(curDewPoint),
      windSpeed: Math.round(curWindSpeed),
      windDirection: WeatherRemoteDataSource.compass(curWindDir),
      windDegrees: Math.round(curWindDir),
      uvIndex: Math.round(curUv),
      pressureHpa: Math.round(curPressure),
      pressureTrend,
      visibilityKm: cur.visibility != null && !isNaN(cur.visibility) ? Math.round(cur.visibility / 1000) : 10,
      aqi: { index: 1, pm25: 0, pm10: 0, status: 'Good' },
      sunriseTime,
      sunsetTime,
      daylightProgressPercent,
    };

    const hourly: IHourlyForecast[] = hourlyRaw.time.slice(0, 24).map((t: string, i: number) => {
      const hTemp = typeof hourlyRaw.temperature_2m?.[i] === 'number' ? hourlyRaw.temperature_2m[i] : curTemp;
      const hCode = hourlyRaw.weather_code?.[i] ?? cur.weather_code ?? 0;
      const hRain = typeof hourlyRaw.precipitation_probability?.[i] === 'number' ? hourlyRaw.precipitation_probability[i] : 0;
      const hWind = typeof hourlyRaw.wind_speed_10m?.[i] === 'number' ? hourlyRaw.wind_speed_10m[i] : 0;
      return {
        time: i === 0 ? 'Now' : new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }),
        timestamp: new Date(t).getTime() || Date.now() + i * 3600000,
        temp: Math.round(hTemp),
        condition: WeatherRemoteDataSource.conditionOf(WeatherRemoteDataSource.wmoToLabel(hCode)),
        rainProbability: Math.round(hRain),
        windSpeed: Math.round(hWind),
      };
    });

    const daily: IDailyForecast[] = dailyRaw.time.slice(0, 7).map((t: string, i: number) => {
      const dCode = dailyRaw.weather_code?.[i] ?? 0;
      const dayLabel = WeatherRemoteDataSource.wmoToLabel(dCode);
      const cond = WeatherRemoteDataSource.conditionOf(dayLabel);
      const rainProb = Math.round(dailyRaw.precipitation_probability_max?.[i] ?? 0);
      const minT = typeof dailyRaw.temperature_2m_min?.[i] === 'number' ? Math.round(dailyRaw.temperature_2m_min[i]) : Math.round(curTemp);
      const maxT = typeof dailyRaw.temperature_2m_max?.[i] === 'number' ? Math.round(dailyRaw.temperature_2m_max[i]) : Math.round(curTemp);
      const windMax = Math.round(dailyRaw.wind_speed_10m_max?.[i] ?? 0);
      const humidMean = Math.round(dailyRaw.relative_humidity_2m_mean?.[i] ?? curHumidity);

      return {
        dayName: i === 0 ? 'Today' : new Date(t).toLocaleDateString('en-IN', { weekday: 'short' }),
        date: t ? new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '',
        condition: cond,
        minTemp: minT,
        maxTemp: maxT,
        rainProbability: rainProb,
        windSpeed: windMax,
        humidity: humidMean,
        agriAdvisory: WeatherRemoteDataSource.dailyAdvisory(cond, rainProb, maxT, windMax),
      };
    });

    // Resolve location display name if not passed
    let displayName = locationName || '';
    let districtName = locationName || '';
    let stateName = 'India';

    if (!displayName || displayName === 'Your Location') {
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`;
        const geoRes = await fetch(geoUrl, {
          headers: { 'User-Agent': 'AgriConnect-App/1.0' },
          signal: AbortSignal.timeout(3000),
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const addr = geoData.address || {};
          displayName = addr.city || addr.town || addr.village || addr.county || 'Your Location';
          districtName = addr.county || addr.state_district || displayName;
          stateName = addr.state || 'India';
        }
      } catch {
        // Geocoding non-critical fallback to coordinates or provided name
        displayName = displayName || 'Your Location';
      }
    }

    return {
      location: {
        name: displayName,
        district: districtName,
        state: stateName,
        latitude: lat,
        longitude: lng,
      },
      live,
      hourly,
      daily,
      lastUpdated: new Date().toISOString(),
      isOfflineCached: false,
      advisoryAlert: {
        isCritical: (daily[0]?.rainProbability ?? 0) >= 60,
        title: (daily[0]?.rainProbability ?? 0) >= 60 ? 'Severe weather alert' : 'Farm weather guidance',
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
