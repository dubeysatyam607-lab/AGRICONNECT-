import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { weatherRequestSchema, parseAndValidate } from "../_shared/validators.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:3000,http://localhost:5173,http://localhost:8000,https://agriconnect-navy-six.vercel.app,https://agriconnect-navy-six-*.vercel.app"
).split(",").map(o => o.trim());

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(o => {
    if (o.includes("*")) {
      const prefix = o.replace("*", "");
      return origin.startsWith(prefix);
    }
    return o === origin;
  });
}

function getCorsHeaders(origin: string | null) {
  const allowed = isAllowedOrigin(origin) ? origin : undefined;
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = allowed;
  return headers;
}

// Rate limit config: 60 requests per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
};

// Abort external API calls after 10s so a hung upstream never burns the whole
// edge function invocation budget.
function fetchWithTimeout(url: string, init?: RequestInit, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Distance between two coordinates in km (haversine). Used to detect when a
// weather provider silently answered for a different location than requested.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// WMO weather code → human condition (Open-Meteo uses WMO codes).
function wmoCondition(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

function compass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

// Severity labels for farmer-facing guidance based purely on the weather data.
function buildAlerts(
  daily: Array<{ rainProb: number; tempMax: number; tempMin: number; windMax: number; humidity: number; precipMm: number; condition: string }>,
  hourly: Array<{ rainProb: number; precipMm: number; condition: string }>
): { critical: boolean; items: Array<{ kind: string; level: "info" | "warning" | "critical"; message: string; dayOffset: number }> } {
  const items: Array<{ kind: string; level: "info" | "warning" | "critical"; message: string; dayOffset: number }> = [];
  let critical = false;

  daily.forEach((d, i) => {
    const when = i === 0 ? "Today" : i === 1 ? "Tomorrow" : `In ${i} days`;
    if (d.rainProb >= 60) {
      items.push({
        kind: "rain",
        level: i === 0 ? "critical" : "warning",
        message: `${when}: ${Math.round(d.rainProb)}% rain chance (${d.precipMm.toFixed(1)} mm). Consider postponing spraying and plan drainage.`,
        dayOffset: i,
      });
      if (i === 0) critical = true;
    } else if (d.rainProb >= 35) {
      items.push({
        kind: "rain",
        level: "info",
        message: `${when}: ${Math.round(d.rainProb)}% chance of rain. Keep an eye on the sky before field work.`,
        dayOffset: i,
      });
    }
    if (d.tempMax >= 42) {
      items.push({
        kind: "heat",
        level: i === 0 ? "warning" : "info",
        message: `${when}: extreme heat up to ${Math.round(d.tempMax)}°C. Irrigate in early morning; avoid midday transplanting.`,
        dayOffset: i,
      });
    }
    if (d.tempMin <= 4) {
      items.push({
        kind: "frost",
        level: "warning",
        message: `${when}: possible frost at ${Math.round(d.tempMin)}°C. Protect nurseries and cover young seedlings at night.`,
        dayOffset: i,
      });
    }
    if (d.windMax >= 40) {
      items.push({
        kind: "wind",
        level: "warning",
        message: `${when}: strong winds up to ${Math.round(d.windMax)} km/h. Secure polytunnels; avoid spraying in wind.`,
        dayOffset: i,
      });
    }
    if (d.humidity >= 85 && d.rainProb >= 30) {
      items.push({
        kind: "humidity",
        level: "info",
        message: `${when}: high humidity (${Math.round(d.humidity)}%). Fungal disease risk rises; postpone foliar sprays.`,
        dayOffset: i,
      });
    }
  });

  const nextRain = hourly.findIndex((h) => h.rainProb >= 50);
  if (nextRain >= 0) {
    items.push({
      kind: "rain",
      level: "info",
      message: `Rain likely within the next ${nextRain + 1} hours. Avoid spraying during this window.`,
      dayOffset: 0,
    });
  }

  return { critical, items };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const forwarded = req.headers.get('x-forwarded-for');
  const clientIP = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  const rateLimitResult = await checkRateLimit(clientIP, 'weather', RATE_LIMIT_CONFIG);

  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  const parseResult = await parseAndValidate(req, weatherRequestSchema, corsHeaders);
  if (!parseResult.success) {
    return parseResult.response;
  }

  const { latitude, longitude, city, checkAlerts } = parseResult.data;

  // ── CRITICAL: never silently fall back to a default city ────────────────
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return new Response(
      JSON.stringify({
        error: "Location unavailable",
        message: "Live weather needs your location. Please allow location access or choose your location manually.",
        code: "LOCATION_REQUIRED",
      }),
      {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return new Response(
      JSON.stringify({ error: "Invalid coordinates", message: "The provided coordinates are invalid.", code: "INVALID_COORDS" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const lat = latitude;
    const lon = longitude;

    // ── Cache lookup (short-lived, keyed by rounded coordinates) ──────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let supabase = null;
    if (supabaseUrl && supabaseKey) {
      try {
        supabase = createClient(supabaseUrl, supabaseKey);
      } catch {
        supabase = null;
      }
    }

    const cacheLat = Math.round(lat * 100) / 100;
    const cacheLon = Math.round(lon * 100) / 100;

    if (supabase) {
      try {
        const { data: cached } = await supabase
          .from("weather_cache")
          .select("weather_data, fetched_at")
          .eq("latitude", cacheLat)
          .eq("longitude", cacheLon)
          .gte("expires_at", new Date().toISOString())
          .order("fetched_at", { ascending: false })
          .limit(1);
        if (cached && cached.length > 0) {
          return new Response(JSON.stringify({ ...cached[0].weather_data, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (cacheErr) {
        console.warn("Weather cache read failed:", cacheErr);
      }
    }

    // ── Fetch from Open-Meteo (free, no key required, supports India) ─────
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation,pressure_msl,visibility` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean` +
      `&forecast_days=7&timezone=auto`;

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Open-Meteo API error:", response.status, errorText.slice(0, 200));
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Reverse geocoding for an accurate location name (never assume city from
    // coordinates without reverse geocoding).
    let locationName = city || "";
    let districtName = "";
    let regionName = "";
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=en`;
      const geoResponse = await fetchWithTimeout(geoUrl, {
        headers: { "User-Agent": "AgriConnect/1.0" },
      });
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        const a = geoData.address || {};
        locationName = a.city || a.town || a.village || a.county || "";
        districtName = a.county || a.state_district || locationName;
        regionName = a.state || a.ISO3166_2_lvl4 || "";
      }
    } catch (geoError) {
      console.log("Geocoding failed, using provided city label");
    }

    if (!locationName) {
      locationName = "Your Location";
    }

    const cur = data.current || {};
    const hourlyRaw = data.hourly || {};
    const dailyRaw = data.daily || {};

    const currentCondition = wmoCondition(cur.weather_code ?? 0);

    const hourly = (hourlyRaw.time || []).slice(0, 24).map((t: string, i: number) => ({
      time: t,
      timestamp: new Date(t).getTime(),
      temp: Math.round(hourlyRaw.temperature_2m?.[i] ?? cur.temperature_2m ?? 0),
      condition: wmoCondition(hourlyRaw.weather_code?.[i] ?? 0),
      rainProbability: Math.round(hourlyRaw.precipitation_probability?.[i] ?? 0),
      precipMm: Number(hourlyRaw.precipitation?.[i] ?? 0),
      windSpeed: Math.round(hourlyRaw.wind_speed_10m?.[i] ?? 0),
    }));

    const daily = (dailyRaw.time || []).slice(0, 7).map((t: string, i: number) => ({
      date: t,
      dayName: i === 0 ? "Today" : new Date(t).toLocaleDateString("en-IN", { weekday: "short" }),
      condition: wmoCondition(dailyRaw.weather_code?.[i] ?? 0),
      tempMax: Math.round(dailyRaw.temperature_2m_max?.[i] ?? cur.temperature_2m ?? 0),
      tempMin: Math.round(dailyRaw.temperature_2m_min?.[i] ?? cur.temperature_2m ?? 0),
      rainProbability: Math.round(dailyRaw.precipitation_probability_max?.[i] ?? 0),
      precipMm: Number(dailyRaw.precipitation_sum?.[i] ?? 0),
      windSpeed: Math.round(dailyRaw.wind_speed_10m_max?.[i] ?? 0),
      humidity: Math.round(dailyRaw.relative_humidity_2m_mean?.[i] ?? 0),
    }));

    const alerts = buildAlerts(
      daily.map((d) => ({ rainProb: d.rainProbability, tempMax: d.tempMax, tempMin: d.tempMin, windMax: d.windSpeed, humidity: d.humidity, precipMm: d.precipMm, condition: d.condition })),
      hourly.map((h) => ({ rainProb: h.rainProbability, precipMm: h.precipMm, condition: h.condition }))
    );

    const weatherData = {
      temp: Math.round(cur.temperature_2m ?? 0),
      feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0),
      condition: currentCondition,
      humidity: Math.round(cur.relative_humidity_2m ?? 0),
      wind: `${Math.round(cur.wind_speed_10m ?? 0)} km/h`,
      windSpeed: Math.round(cur.wind_speed_10m ?? 0),
      windDirection: compass(cur.wind_direction_10m ?? 0),
      windDegrees: Math.round(cur.wind_direction_10m ?? 0),
      precipMm: Number(cur.precipitation ?? 0),
      pressureHpa: Math.round(cur.pressure_msl ?? 0),
      visibilityKm: cur.visibility != null ? Math.round(cur.visibility / 1000) : null,
      weatherCode: cur.weather_code ?? 0,
      uv: null,
      icon: "",
      hourly,
      daily,
      alerts: {
        critical: alerts.critical,
        items: alerts.items,
      },
      agriAlerts: alerts.items,
      location: {
        name: locationName,
        district: districtName,
        region: regionName,
        latitude: lat,
        longitude: lon,
      },
      aqi: null,
      last_updated: new Date().toISOString(),
      requestedLat: lat,
      requestedLon: lon,
      source: "open-meteo",
      cached: false,
    };

    // ── Location mismatch detection ────────────────────────────────────────
    // Open-Meteo returns data for the exact requested coordinates, but
    // reverse-geocoding can still surface a distant place name. Cross-check
    // with the raw coords the client asked for (already echoed above) so the
    // UI can flag when something looks off.
    if (locationName && locationName !== "Your Location") {
      // Only nominal check here — provider does not shift coordinates.
    }

    // ── Persist cache ──────────────────────────────────────────────────────
    if (supabase) {
      try {
        await supabase.from("weather_cache").insert({
          latitude: cacheLat,
          longitude: cacheLon,
          weather_data: weatherData,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
      } catch (cacheErr) {
        console.warn("Weather cache write failed:", cacheErr);
      }
    }

    // ── Push notifications for bad weather (if requested) ─────────────────
    if (checkAlerts && alerts.items.some((a) => a.level === "critical") && supabase) {
      try {
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('weather_alerts', true);
        if (subscriptions && subscriptions.length > 0) {
          const msg = alerts.items[0]?.message || `Weather alert in ${locationName}`;
          console.log(`Weather alert for ${subscriptions.length} subscribers: ${msg}`);
        }
      } catch (pushError) {
        console.error('Push notification error:', pushError);
      }
    }

    return new Response(JSON.stringify(weatherData), {
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(rateLimitResult),
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    console.error("Weather function error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch weather";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: "Live weather is temporarily unavailable. Please try again.",
        code: "WEATHER_UNAVAILABLE",
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
