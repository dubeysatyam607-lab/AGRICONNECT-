import React, { useMemo } from "react";
import {
  MapPin,
  RefreshCw,
  ChevronRight,
  CloudRain,
  Droplets,
  Wind,
  CloudLightning,
  Cloud,
  CloudFog,
  Sun,
  Moon,
  Thermometer,
  Sparkles,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { IWeatherModuleData } from "@/features/weather/domain/models/WeatherModels";
import { cn } from "@/lib/utils";

interface WeatherHeroProps {
  wl: IWeatherModuleData | null;
  loading: boolean;
  formatTemp: (celsius: number) => string;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenDetails: () => void;
  onOpenLocation: () => void;
  loadingCityText?: string;
  interpretation?: string;
}

export type SkyPeriod = "dawn" | "daytime" | "dusk" | "night";

/**
 * Returns the exact sky period based on local hour.
 */
export function getSkyPeriod(): SkyPeriod {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "daytime";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

/**
 * Dynamically resolves atmospheric sky condition parameters.
 * Eliminates repetitive generic blue backgrounds in favor of rich time-of-day palettes:
 * Golden Dawn, Vibrant Emerald Daytime, Crimson Twilight, Midnight Starry Sapphire, and Monsoon Rain.
 */
export function getAtmosphericTheme(cond?: string, tempC?: number): {
  period: SkyPeriod;
  isRain: boolean;
  isStorm: boolean;
  isFog: boolean;
  isSunny: boolean;
  gradientOverlay: string;
  photoSrc: string;
  themeLabel: string;
} {
  const c = (cond || "").toLowerCase();
  const period = getSkyPeriod();
  const isRain = c.includes("rain") || c.includes("shower") || c.includes("drizzle");
  const isStorm = c.includes("thunder") || c.includes("storm");
  const isFog = c.includes("fog") || c.includes("mist") || c.includes("haze");
  const isSunny = c.includes("sun") || c.includes("clear") || c.includes("hot");

  let photoSrc = "/images/smart-farm-hero.jpg";
  let gradientOverlay = "from-[#062c43]/70 via-[#055147]/70 to-[#022c22]/85";
  let themeLabel = "Vibrant Daytime Field";

  if (isStorm) {
    photoSrc = "/images/paddy-smart-farm.jpg";
    gradientOverlay = "from-[#040812]/92 via-[#0f172a]/92 to-[#1e1b4b]/95";
    themeLabel = "Stormy Nimbus Sky";
  } else if (isRain) {
    photoSrc = "/images/paddy-smart-farm.jpg";
    gradientOverlay = "from-[#06141d]/85 via-[#0e2a36]/85 to-[#052e2b]/90";
    themeLabel = "Monsoon Dew Field";
  } else if (isFog) {
    photoSrc = "/images/wheat-smart-farm.jpg";
    gradientOverlay = "from-[#0b131a]/85 via-[#1c2a36]/85 to-[#0e1f26]/90";
    themeLabel = "Morning Mist Haze";
  } else {
    switch (period) {
      case "dawn":
        photoSrc = "/images/wheat-smart-farm.jpg";
        gradientOverlay = "from-[#2a1306]/85 via-[#451a03]/75 to-[#78350f]/85";
        themeLabel = "Golden Sunrise Hour";
        break;
      case "daytime":
        photoSrc = tempC && tempC > 36 ? "/images/wheat-smart-farm.jpg" : "/images/smart-farm-hero.jpg";
        gradientOverlay = tempC && tempC > 36
          ? "from-[#451a03]/70 via-[#1e293b]/80 to-[#022c22]/90"
          : "from-[#062c43]/70 via-[#055147]/70 to-[#022c22]/85";
        themeLabel = "Sunny Agricultural Field";
        break;
      case "dusk":
        photoSrc = "/images/wheat-smart-farm.jpg";
        gradientOverlay = "from-[#1f0a24]/85 via-[#4a1236]/80 to-[#9a3412]/85";
        themeLabel = "Crimson Twilight Hour";
        break;
      case "night":
      default:
        photoSrc = "/images/paddy-smart-farm.jpg";
        gradientOverlay = "from-[#030712]/90 via-[#0b1329]/90 to-[#022c22]/90";
        themeLabel = "Starry Midnight Farm";
        break;
    }
  }

  return {
    period,
    isRain,
    isStorm,
    isFog,
    isSunny,
    gradientOverlay,
    photoSrc,
    themeLabel,
  };
}

const weatherIcon = (cond?: string) => {
  const c = (cond || "").toLowerCase();
  if (c.includes("thunder")) return CloudLightning;
  if (c.includes("rain") || c.includes("shower")) return CloudRain;
  if (c.includes("fog") || c.includes("mist")) return CloudFog;
  if (c.includes("cloud") || c.includes("overcast")) return Cloud;
  if (c.includes("clear") || c.includes("night")) return Moon;
  if (c.includes("hot") || c.includes("loo")) return Thermometer;
  return Sun;
};

const interpretWeather = (cond?: string, rainPct?: number, tempC?: number): string => {
  const c = (cond || "").toLowerCase();
  if (rainPct !== undefined && rainPct >= 55) return "Rain expected: delay harvest and pesticide spraying for best crop yield.";
  if (c.includes("thunder")) return "Thunderstorm risk: keep farm machinery safely covered and protect livestock.";
  if (c.includes("sunny") && tempC !== undefined && tempC >= 40) return "High heat: irrigate crops in early morning or evening to prevent evaporation loss.";
  if (c.includes("fog") || c.includes("mist")) return "Morning mist: plan spraying operations after 10:00 AM when moisture clears.";
  if (c.includes("rain") || c.includes("shower")) return "Showers expected: hold off on chemical application.";
  if (c.includes("partly") || c.includes("cloud")) return "Favorable conditions for routine field operations and crop inspection.";
  return tempC !== undefined && tempC >= 35 ? "Warm day: take regular shade breaks during field work and stay hydrated." : "Optimal weather for field work, sowing, and irrigation.";
};

/**
 * World-Class Photorealistic Dynamic Weather Card Engine.
 * Dynamically transforms themes between Golden Dawn, Emerald Daylight, Crimson Twilight,
 * Midnight Sapphire Starfield, and Monsoon Rain based on real-time solar hour and live weather data.
 */
export const WeatherHero: React.FC<WeatherHeroProps> = ({
  wl,
  loading,
  formatTemp,
  refreshing,
  onRefresh,
  onOpenDetails,
  onOpenLocation,
  loadingCityText,
  interpretation,
}) => {
  const { t } = useLanguage();
  const ConditionIcon = weatherIcon(wl?.live?.condition);
  const theme = getAtmosphericTheme(wl?.live?.condition, wl?.live?.temp);
  const interpretationLine =
    interpretation ||
    (wl ? interpretWeather(wl.live.condition, wl.daily?.[0]?.rainProbability, wl.live.temp) : undefined);

  return (
    <section role="region" aria-labelledby="weather-heading" className="mt-7">
      <div className="relative overflow-hidden rounded-2xl border border-[#0F5132]/20 text-white shadow-card">
        {/* Subtle authentic farm backdrop with high-contrast dark green overlay */}
        <div className="absolute inset-0 select-none overflow-hidden" aria-hidden="true">
          <img
            src={theme.photoSrc}
            alt=""
            className="h-full w-full object-cover object-center opacity-30"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F5132]/95 via-[#083320]/95 to-[#031b11]/98" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 p-5 sm:p-6">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-3.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                <MapPin size={16} className="text-[#00C26E]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 id="weather-heading" className="text-sm sm:text-base font-bold text-white truncate">
                  {wl?.location?.name || wl?.location?.district || loadingCityText || 'Farm Location'}
                </h3>
                <p className="text-xs font-medium text-white/90 truncate">
                  {theme.themeLabel} · Hyperlocal Agricultural Weather
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-[#00C26E] animate-live-pulse" aria-hidden="true" />
                Live
              </span>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
                aria-label="Refresh weather"
                title="Refresh live weather"
              >
                <RefreshCw size={14} className={cn("transition-transform", refreshing && "animate-spin text-[#00C26E]")} />
              </button>
            </div>
          </div>

          {wl ? (
            <>
              {/* Main Numbers */}
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    {t("home.weatherTitle") || "Today's Weather"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-3">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                      {formatTemp(wl.live.temp)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-sm font-bold text-white">
                      <ConditionIcon size={18} className="text-amber-300" aria-hidden="true" />
                      {wl.live.condition}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/80">
                    Feels like <strong>{formatTemp(wl.live.feelsLike)}</strong>
                  </p>
                </div>

                {/* 3 Metrics: Rain, Humidity, Wind */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/15 bg-white/10 p-2.5 sm:p-3 text-center">
                    <CloudRain size={18} className="text-sky-300 mb-1" aria-hidden="true" />
                    <span className="text-sm sm:text-base font-extrabold text-white">{wl.daily?.[0]?.rainProbability ?? 0}%</span>
                    <span className="text-xs font-medium text-white/70">Rain</span>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/15 bg-white/10 p-2.5 sm:p-3 text-center">
                    <Droplets size={18} className="text-emerald-300 mb-1" aria-hidden="true" />
                    <span className="text-sm sm:text-base font-extrabold text-white">{wl.live.humidity}%</span>
                    <span className="text-xs font-medium text-white/70">Humidity</span>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-xl border border-white/15 bg-white/10 p-2.5 sm:p-3 text-center">
                    <Wind size={18} className="text-amber-300 mb-1" aria-hidden="true" />
                    <span className="text-sm sm:text-base font-extrabold text-white">{wl.live.windSpeed} <span className="text-xs font-normal">km/h</span></span>
                    <span className="text-xs font-medium text-white/70">Wind</span>
                  </div>
                </div>
              </div>

              {/* Crop Advisory Recommendation */}
              {interpretationLine && (
                <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-950/40 p-3 text-xs sm:text-sm font-medium leading-relaxed text-emerald-100">
                  {interpretationLine}
                </div>
              )}

              {/* Footer CTA */}
              <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
                <span className="text-xs font-medium text-white/70">
                  Updated live for your field
                </span>
                <button
                  type="button"
                  onClick={onOpenDetails}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F5132] shadow-sm transition-all hover:bg-emerald-50 active:scale-98"
                >
                  <span>{t("home.openWeather") || "Full 7-Day Forecast"}</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : loading ? (
            <div className="py-6 text-center space-y-2">
              <RefreshCw size={24} className="mx-auto animate-spin text-[#00C26E]" aria-hidden="true" />
              <p className="text-xs font-semibold text-white/90">{t("home.fetchingWeather") || "Fetching live weather..."}</p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-white/20 bg-black/40 p-6 backdrop-blur-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-emerald-300">
                <Cloud size={24} aria-hidden="true" />
              </span>
              <div className="max-w-md">
                <p className="text-sm font-bold text-white">
                  {t("home.weatherUnavailable") || "Live weather unavailable. Please check location."}
                </p>
                <p className="mt-1 text-xs text-white/75">
                  Verify your device location or tap retry to re-connect to the nearest agricultural weather station.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#0F5132] shadow-sm transition-all hover:bg-emerald-50 active:scale-95"
                >
                  {t("wth.retry") || "Retry Weather"}
                </button>
                <button
                  type="button"
                  onClick={onOpenLocation}
                  className="rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-white/25 active:scale-95"
                >
                  {t("home.checkLocation") || "Check your location"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WeatherHero;