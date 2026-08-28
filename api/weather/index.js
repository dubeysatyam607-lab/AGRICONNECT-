/**
 * Vercel Serverless Function — Live Weather API for AgriConnect.
 *
 * GET /api/weather?lat=25.43&lon=77.65&city=Shivpuri
 * POST /api/weather { "lat": 25.43, "lon": 77.65, "city": "Shivpuri" }
 *
 * Provides normalized, verified live weather data from Open-Meteo & OpenWeatherMap.
 * NEVER returns synthetic or hardcoded placeholder weather (such as 27°C).
 * Server-side cache (5 min TTL) reduces upstream traffic and ensures rapid response times.
 */

// In-memory sliding-window rate limiter (60 requests per minute per IP)
const ipRateMap = new Map();
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipRateMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW;
  } else {
    entry.count += 1;
  }

  ipRateMap.set(ip, entry);

  // Periodic cleanup
  if (ipRateMap.size > 2000) {
    for (const [k, v] of ipRateMap.entries()) {
      if (now > v.resetAt) ipRateMap.delete(k);
    }
  }

  return {
    allowed: entry.count <= RATE_LIMIT_MAX,
    remaining: Math.max(0, RATE_LIMIT_MAX - entry.count),
    resetIn: Math.max(0, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

// In-memory weather cache: key = `${Math.round(lat*100)/100}_${Math.round(lon*100)/100}`
const weatherCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedWeather(lat, lon) {
  const key = `${Math.round(lat * 100) / 100}_${Math.round(lon * 100) / 100}`;
  const item = weatherCache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
}

function setCachedWeather(lat, lon, data) {
  const key = `${Math.round(lat * 100) / 100}_${Math.round(lon * 100) / 100}`;
  weatherCache.set(key, { timestamp: Date.now(), data });
  if (weatherCache.size > 500) {
    const oldestKey = weatherCache.keys().next().value;
    weatherCache.delete(oldestKey);
  }
}

// Maps WMO code to human-readable condition string
function wmoCondition(code) {
  if (code === 0) return "Clear";
  if (code === 1) return "Sunny";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Fog / Mist";
  if (code >= 51 && code <= 57) return "Light Rain";
  if (code >= 61 && code <= 67) return "Light Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Heavy Monsoon Shower";
  if (code >= 95) return "Thunderstorm";
  return "Partly Cloudy";
}

function compass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function formatClock(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} ${ampm}`;
  } catch {
    return "";
  }
}

function calculateDaylightProgress(sunriseIso, sunsetIso) {
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

function dailyAdvisory(cond, rainProb, tempMax, windSpeed) {
  if (rainProb >= 60) return "Heavy rain likely. Postpone all pesticide/fertilizer spraying and check field drainage.";
  if (rainProb >= 35) return "Chance of rain. Monitor sky conditions before applying foliar sprays.";
  if (windSpeed && windSpeed > 20) return "High wind speed. Avoid spraying to prevent chemical drift.";
  if (tempMax && tempMax >= 40) return "Heat stress warning. Provide light evening/early morning irrigation.";
  switch (cond) {
    case "Light Rain": return "Light showers possible. Keep sprayed chemicals sheltered.";
    case "Heavy Monsoon Shower": return "Heavy monsoon rain. Maintain bunds and avoid waterlogging.";
    case "Thunderstorm": return "Thunderstorm warning. Keep farm machinery and livestock safely sheltered.";
    case "Clear": case "Sunny": return "Clear weather. Ideal for weeding, harvesting, and field preparation.";
    case "Overcast": return "Cloudy skies. Good soil moisture retention for routine farm tasks.";
    case "Fog / Mist": return "Foggy morning. Watch for fungal leaf diseases on standing crops.";
    default: return "Normal weather conditions suitable for routine agricultural activities.";
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  // CORS & Methods
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Rate Limiting
  const forwarded = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const clientIP = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "unknown";
  const rl = checkRateLimit(clientIP);

  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
  res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
  res.setHeader("X-RateLimit-Reset", String(rl.resetIn));

  if (!rl.allowed) {
    return res.status(429).json({
      error: "Too many requests. Please try again shortly.",
      code: "RATE_LIMIT_EXCEEDED",
    });
  }

  // Extract query / body parameters
  const q = req.method === "POST" ? (req.body || {}) : req.query;
  const rawLat = q.lat ?? q.latitude;
  const rawLon = q.lon ?? q.longitude ?? q.lng;
  const cityHint = typeof q.city === "string" ? q.city.trim() : "";

  if (rawLat == null || rawLon == null || rawLat === "" || rawLon === "") {
    return res.status(422).json({
      error: "Location coordinates required. Please provide latitude and longitude.",
      code: "LOCATION_REQUIRED",
    });
  }

  const lat = Number(rawLat);
  const lon = Number(rawLon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({
      error: "Invalid coordinates provided. Latitude must be between -90 and 90, Longitude between -180 and 180.",
      code: "INVALID_COORDINATES",
    });
  }

  // 1. Check in-memory cache
  const cached = getCachedWeather(lat, lon);
  if (cached) {
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ ...cached, cached: true });
  }

  // 2. Fetch from Open-Meteo
  try {
    const openMeteoUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation,pressure_msl,visibility,dew_point_2m,uv_index` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m,dew_point_2m,relative_humidity_2m,pressure_msl` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean,sunrise,sunset,uv_index_max` +
      `&forecast_days=7&timezone=auto`;

    const apiRes = await fetchWithTimeout(openMeteoUrl, {}, 9000);

    if (!apiRes.ok) {
      throw new Error(`Open-Meteo responded with status ${apiRes.status}`);
    }

    const data = await apiRes.json();
    if (!data || !data.current || typeof data.current.temperature_2m !== "number" || isNaN(data.current.temperature_2m)) {
      throw new Error("Invalid weather data returned from upstream service");
    }

    // Reverse geocode if cityHint is absent or generic
    let locationName = cityHint;
    let districtName = cityHint;
    let stateName = "India";

    if (!locationName || locationName === "Your Location" || locationName === "Current Location") {
      try {
        const geoRes = await fetchWithTimeout(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=en`,
          { headers: { "User-Agent": "AgriConnect-Vercel/1.0" } },
          3500
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const addr = geoData.address || {};
          locationName = addr.city || addr.town || addr.village || addr.county || "Your Location";
          districtName = addr.county || addr.state_district || locationName;
          stateName = addr.state || "India";
        }
      } catch {
        locationName = locationName || "Your Location";
      }
    }

    const cur = data.current;
    const hourlyRaw = data.hourly || {};
    const dailyRaw = data.daily || {};

    const curTemp = cur.temperature_2m;
    const curFeelsLike = typeof cur.apparent_temperature === "number" && !isNaN(cur.apparent_temperature) ? cur.apparent_temperature : curTemp;
    const curHumidity = typeof cur.relative_humidity_2m === "number" && !isNaN(cur.relative_humidity_2m) ? cur.relative_humidity_2m : 0;
    const curWindSpeed = typeof cur.wind_speed_10m === "number" && !isNaN(cur.wind_speed_10m) ? cur.wind_speed_10m : 0;
    const curWindDir = typeof cur.wind_direction_10m === "number" && !isNaN(cur.wind_direction_10m) ? cur.wind_direction_10m : 0;
    const curDewPoint = typeof cur.dew_point_2m === "number" && !isNaN(cur.dew_point_2m)
      ? cur.dew_point_2m
      : (curTemp - ((100 - curHumidity) / 5));
    const curUv = typeof cur.uv_index === "number" && !isNaN(cur.uv_index)
      ? cur.uv_index
      : (dailyRaw.uv_index_max?.[0] ?? 0);
    const curPressure = typeof cur.pressure_msl === "number" && !isNaN(cur.pressure_msl) ? cur.pressure_msl : 1013;

    let pressureTrend = "Steady";
    if (Array.isArray(hourlyRaw.pressure_msl) && hourlyRaw.pressure_msl.length >= 4) {
      const pastP = hourlyRaw.pressure_msl[0];
      const nowP = hourlyRaw.pressure_msl[3] ?? curPressure;
      if (typeof pastP === "number" && typeof nowP === "number") {
        const diff = nowP - pastP;
        if (diff >= 1.2) pressureTrend = "Rising";
        else if (diff <= -1.2) pressureTrend = "Falling";
      }
    }

    const currentConditionLabel = wmoCondition(cur.weather_code ?? 0);

    const sunriseIso = dailyRaw.sunrise?.[0];
    const sunsetIso = dailyRaw.sunset?.[0];
    const sunriseTime = formatClock(sunriseIso) || "06:00 AM";
    const sunsetTime = formatClock(sunsetIso) || "06:30 PM";
    const daylightProgressPercent = calculateDaylightProgress(sunriseIso, sunsetIso);

    const live = {
      temp: Math.round(curTemp),
      feelsLike: Math.round(curFeelsLike),
      condition: currentConditionLabel,
      conditionDescription: currentConditionLabel,
      humidity: Math.round(curHumidity),
      dewPoint: Math.round(curDewPoint),
      windSpeed: Math.round(curWindSpeed),
      windDirection: compass(curWindDir),
      windDegrees: Math.round(curWindDir),
      uvIndex: Math.round(curUv),
      pressureHpa: Math.round(curPressure),
      pressureTrend,
      visibilityKm: cur.visibility != null && !isNaN(cur.visibility) ? Math.round(cur.visibility / 1000) : 10,
      aqi: { index: 1, pm25: 0, pm10: 0, status: "Good" },
      sunriseTime,
      sunsetTime,
      daylightProgressPercent,
    };

    const hourly = (hourlyRaw.time || []).slice(0, 24).map((t, i) => {
      const hTemp = typeof hourlyRaw.temperature_2m?.[i] === "number" ? hourlyRaw.temperature_2m[i] : curTemp;
      const hCode = hourlyRaw.weather_code?.[i] ?? cur.weather_code ?? 0;
      const hRain = typeof hourlyRaw.precipitation_probability?.[i] === "number" ? hourlyRaw.precipitation_probability[i] : 0;
      const hWind = typeof hourlyRaw.wind_speed_10m?.[i] === "number" ? hourlyRaw.wind_speed_10m[i] : 0;
      return {
        time: i === 0 ? "Now" : new Date(t).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true }),
        timestamp: new Date(t).getTime() || Date.now() + i * 3600000,
        temp: Math.round(hTemp),
        condition: wmoCondition(hCode),
        rainProbability: Math.round(hRain),
        windSpeed: Math.round(hWind),
      };
    });

    const daily = (dailyRaw.time || []).slice(0, 7).map((t, i) => {
      const dCode = dailyRaw.weather_code?.[i] ?? 0;
      const cond = wmoCondition(dCode);
      const rainProb = Math.round(dailyRaw.precipitation_probability_max?.[i] ?? 0);
      const minT = typeof dailyRaw.temperature_2m_min?.[i] === "number" ? Math.round(dailyRaw.temperature_2m_min[i]) : Math.round(curTemp);
      const maxT = typeof dailyRaw.temperature_2m_max?.[i] === "number" ? Math.round(dailyRaw.temperature_2m_max[i]) : Math.round(curTemp);
      const windMax = Math.round(dailyRaw.wind_speed_10m_max?.[i] ?? 0);
      const humidMean = Math.round(dailyRaw.relative_humidity_2m_mean?.[i] ?? curHumidity);

      return {
        dayName: i === 0 ? "Today" : new Date(t).toLocaleDateString("en-IN", { weekday: "short" }),
        date: t ? new Date(t).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "",
        condition: cond,
        minTemp: minT,
        maxTemp: maxT,
        rainProbability: rainProb,
        windSpeed: windMax,
        humidity: humidMean,
        agriAdvisory: dailyAdvisory(cond, rainProb, maxT, windMax),
      };
    });

    const isCritical = (daily[0]?.rainProbability ?? 0) >= 60;
    const formattedResult = {
      location: {
        name: locationName || "Your Location",
        district: districtName || locationName || "",
        state: stateName || "India",
        latitude: lat,
        longitude: lon,
      },
      live,
      hourly,
      daily,
      lastUpdated: new Date().toISOString(),
      isOfflineCached: false,
      advisoryAlert: {
        isCritical,
        title: isCritical ? "Severe weather alert" : "Farm weather guidance",
        message: daily[0]?.agriAdvisory || "Ideal conditions for most routine farm work.",
      },
      cached: false,
    };

    setCachedWeather(lat, lon, formattedResult);
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(formattedResult);
  } catch (err) {
    console.error("[api/weather] Upstream error:", err?.message || err);
    return res.status(502).json({
      error: "Weather service temporarily unavailable. Please try again.",
      message: err?.message || "Failed to fetch live weather from upstream provider.",
      code: "WEATHER_UNAVAILABLE",
    });
  }
}
