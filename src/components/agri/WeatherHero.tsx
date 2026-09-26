import React from "react";
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
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { interpolate } from "@/i18n/journey";
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

const getBackgroundGradient = (cond?: string, tempC?: number): string => {
  const c = (cond || "").toLowerCase();
  if (c.includes("thunder")) return "from-[#1E293B] via-[#0F5132] to-[#047857]";
  if (c.includes("rain") || c.includes("shower")) return "from-[#0F5132] via-[#115E59] to-[#047857]";
  if (c.includes("fog") || c.includes("mist")) return "from-[#134E4A] via-[#15803D] to-[#0F5132]";
  if (c.includes("loo") || (tempC !== undefined && tempC >= 40)) return "from-[#9A3412] via-[#0F5132] to-[#15803D]";

  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return "from-[#134E4A] via-[#0F5132] to-[#15803D]"; // Morning Dawn
  if (hour >= 7 && hour < 17) return "from-[#0F5132] via-[#146C43] to-[#1E824C]"; // Bright Daytime Forest
  if (hour >= 17 && hour < 19) return "from-[#78350F] via-[#0F5132] to-[#15803D]"; // Golden Dusk
  return "from-[#0B3B24] via-[#0F5132] to-[#134E4A]"; // Deep Forest Night
};

const interpretWeather = (cond?: string, rainPct?: number, tempC?: number): string => {
  const c = (cond || "").toLowerCase();
  if (rainPct !== undefined && rainPct >= 55) return "Rain expected: delay harvest and pesticide spraying.";
  if (c.includes("thunder")) return "Thunderstorm risk: keep farm machinery safely covered.";
  if (c.includes("sunny") && tempC !== undefined && tempC >= 40) return "High heat: irrigate crops in early morning or evening.";
  if (c.includes("fog") || c.includes("mist")) return "Morning mist: plan spraying operations after 10:00 AM.";
  if (c.includes("rain") || c.includes("shower")) return "Showers expected: hold off on chemical application.";
  if (c.includes("partly") || c.includes("cloud")) return "Favorable conditions for routine field operations.";
  return tempC !== undefined && tempC >= 35 ? "Warm day: take regular shade breaks during field work." : "Optimal weather for field work and irrigation.";
};

/**
 * Premium Agriculture Live Weather Showcase Card.
 * Clean, bright, high-contrast design with real farm background texture,
 * high legibility cards, and subtle natural lighting.
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
  const conditionIcon = weatherIcon(wl?.live?.condition);
  const bgGradient = getBackgroundGradient(wl?.live?.condition, wl?.live?.temp);
  const interpretationLine =
    interpretation ||
    (wl ? interpretWeather(wl.live.condition, wl.daily?.[0]?.rainProbability, wl.live.temp) : undefined);

  return (
    <section aria-labelledby="weather-heading" className="mt-6">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl text-white shadow-lg border border-[#00C26E]/30 bg-gradient-to-r transition-colors duration-700",
          bgGradient
        )}
      >
        {/* ── 1. REAL FARM BACKGROUND UNDERLAY (SUBTLE 15% OPACITY) ── */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          <img
            src="/images/smart-farm-hero.jpg"
            alt="Farm Field"
            className="w-full h-full object-cover opacity-15 mix-blend-overlay"
          />
          {/* Subtle Ambient Sunlight Spot */}
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
        </div>

        {/* ── 2. FOREGROUND CONTENT & HIGH-CONTRAST CARDS ── */}
        <div className="relative z-10 p-5 sm:p-7 md:p-8">
          
          {/* Top Location & Live Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/20">
            {wl ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-amber-300 border border-white/20 shadow-xs">
                  <MapPin size={16} className="shrink-0" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-base font-extrabold tracking-tight text-white drop-shadow-sm">
                    {wl.location.name || wl.location.district || 'Jaipur Municipal Corporation'}
                  </span>
                  <span className="ml-2 text-xs font-semibold text-emerald-100/90">
                    ({wl.location.state || 'India'})
                  </span>
                </div>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-sm font-bold text-emerald-100">
                <MapPin size={16} className="shrink-0 animate-pulse text-amber-300" aria-hidden="true" />
                <span>{loadingCityText || t("home.weatherDetecting")}</span>
              </span>
            )}

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-extrabold text-white border border-white/30 shadow-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-[#00C26E] animate-ping" aria-hidden="true" />
                {t("home.wxLive")}
              </span>
              <button
                onClick={onRefresh}
                disabled={refreshing || !wl}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition-all active:scale-95 disabled:opacity-50 border border-white/20 shadow-xs"
                aria-label={refreshing ? t("home.fetchingWeather") : t("home.viewMore")}
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin text-amber-300" : ""} />
              </button>
            </div>
          </div>

          {wl ? (
            <>
              {/* Temperature & Condition Main Header */}
              <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
                    <Sparkles size={14} className="text-amber-300" />
                    <span>{t("home.weatherTitle")}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-4">
                    {/* Temperature Display */}
                    <span className="text-6xl sm:text-7xl font-extrabold tracking-tight text-white drop-shadow-md">
                      {formatTemp(wl.live.temp)}
                    </span>

                    {/* Condition Badge */}
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-white/20 border border-white/30 px-4 py-2 backdrop-blur-md shadow-sm">
                      {(() => { const Icon = conditionIcon; return <Icon size={22} className="text-amber-300 shrink-0" aria-hidden="true" />; })()}
                      <span className="text-lg font-bold text-white tracking-wide">
                        {wl.live.condition}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid Cards (Clean Crisp Frosted White Tiles) */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/25 text-center shadow-xs transition-transform hover:scale-105">
                    <CloudRain size={22} className="text-sky-300 mb-1" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.daily?.[0]?.rainProbability ?? 0}%</span>
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Rain</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/25 text-center shadow-xs transition-transform hover:scale-105">
                    <Droplets size={22} className="text-emerald-200 mb-1" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.live.humidity}%</span>
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Humidity</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white/15 hover:bg-white/20 backdrop-blur-md border border-white/25 text-center shadow-xs transition-transform hover:scale-105">
                    <Wind size={22} className="text-amber-200 mb-1" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.live.windSpeed} km/h</span>
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Wind</span>
                  </div>
                </div>
              </div>

              {/* Highlighted Farm Advisory Card (High Legibility White Card) */}
              {interpretationLine && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-white/95 backdrop-blur-md p-4 border-l-4 border-[#00C26E] text-[#0F5132] shadow-md">
                  <div className="flex-1 text-sm font-semibold leading-relaxed text-[#0F5132]">
                    <span className="inline-block font-extrabold text-white bg-[#0F5132] px-2.5 py-0.5 rounded-md mr-2 text-xs">
                      Farm Advisory
                    </span>
                    {interpretationLine}
                  </div>
                </div>
              )}

              {/* Footer Row & CTA Button */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4">
                <span className="text-xs font-semibold text-white/90 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#00C26E] animate-pulse" />
                  Updated live for your farm area
                </span>

                <button
                  onClick={onOpenDetails}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white text-[#0F5132] hover:bg-emerald-50 px-5 py-2.5 text-xs font-extrabold shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-95"
                >
                  <span>{t("home.openWeather")}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : loading ? (
            <div className="mt-6 space-y-3">
              <div className="h-5 w-44 rounded-lg bg-white/20 animate-pulse" />
              <div className="h-16 w-36 rounded-xl bg-white/20 animate-pulse" />
              <p className="text-sm font-semibold text-white/90">
                {t("home.fetchingWeather")}
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/15 backdrop-blur-md p-4 border border-white/25">
              <div className="flex items-center gap-3">
                <CloudRain size={20} className="text-amber-300 shrink-0" aria-hidden="true" />
                <p className="text-xs font-bold text-white">
                  {t("home.weatherUnavailable")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onRefresh}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#0F5132] shadow-md hover:bg-emerald-50"
                >
                  {t("home.retryWeather")}
                </button>
                <button
                  onClick={onOpenLocation}
                  className="rounded-xl bg-white/20 backdrop-blur-md px-4 py-2 text-xs font-bold text-white border border-white/20 transition-colors hover:bg-white/30"
                >
                  {t("home.checkLocation")}
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