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
 * Dynamically computes real weather & time-of-day sky background styles.
 */
export function getSkyBackground(cond?: string, tempC?: number): {
  bgStyle: string;
  period: SkyPeriod;
  isRain: boolean;
  isStorm: boolean;
  isFog: boolean;
} {
  const c = (cond || "").toLowerCase();
  const period = getSkyPeriod();
  const isRain = c.includes("rain") || c.includes("shower");
  const isStorm = c.includes("thunder") || c.includes("storm");
  const isFog = c.includes("fog") || c.includes("mist");

  return {
    bgStyle: "from-[#0B1326] via-[#101A30] to-[#0B1326]",
    period,
    isRain,
    isStorm,
    isFog,
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
  if (rainPct !== undefined && rainPct >= 55) return "Rain expected: delay harvest and pesticide spraying.";
  if (c.includes("thunder")) return "Thunderstorm risk: keep farm machinery safely covered.";
  if (c.includes("sunny") && tempC !== undefined && tempC >= 40) return "High heat: irrigate crops in early morning or evening.";
  if (c.includes("fog") || c.includes("mist")) return "Morning mist: plan spraying operations after 10:00 AM.";
  if (c.includes("rain") || c.includes("shower")) return "Showers expected: hold off on chemical application.";
  if (c.includes("partly") || c.includes("cloud")) return "Favorable conditions for routine field operations.";
  return tempC !== undefined && tempC >= 35 ? "Warm day: take regular shade breaks during field work." : "Optimal weather for field work and irrigation.";
};

/**
 * Dynamic Real Weather & Time-of-Day Showcase.
 * Dynamically switches sky background colors for Morning Sunrise, Daytime Azure,
 * Evening Sunset, and Night Sapphire. High legibility white/amber typography.
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
  const skyConfig = getSkyBackground(wl?.live?.condition, wl?.live?.temp);
  const interpretationLine =
    interpretation ||
    (wl ? interpretWeather(wl.live.condition, wl.daily?.[0]?.rainProbability, wl.live.temp) : undefined);

  return (
    <section aria-labelledby="weather-heading" className="mt-6">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl text-white shadow-2xl bg-gradient-to-br transition-colors duration-1000 border border-white/25",
          skyConfig.bgStyle
        )}
      >
        {/* ── 1. REAL CELESTIAL ATMOSPHERE & LIGHTING ── */}

        {/* Morning / Daytime Sun Disc */}
        {(skyConfig.period === "daytime" || skyConfig.period === "dawn") && !skyConfig.isRain && (
          <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-amber-300/30 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        )}

        {/* Evening Sunset Sun Disc */}
        {skyConfig.period === "dusk" && !skyConfig.isRain && (
          <div className="pointer-events-none absolute -right-10 top-1/4 h-64 w-64 rounded-full bg-orange-500/35 blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
        )}

        {/* Night Stars */}
        {skyConfig.period === "night" && !skyConfig.isRain && (
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute top-6 left-1/4 h-1.5 w-1.5 rounded-full bg-white animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute top-10 right-1/3 h-2 w-2 rounded-full bg-amber-200 animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute top-16 left-12 h-1.5 w-1.5 rounded-full bg-sky-200 animate-ping" style={{ animationDuration: '5s' }} />
            <div className="absolute top-14 right-20 h-1.5 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDuration: '2.5s' }} />
          </div>
        )}

        {/* Dynamic Horizon Treeline / Farm Ridge Silhouette */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-20 overflow-hidden opacity-30 select-none">
          <svg className="w-full h-full text-slate-950 absolute bottom-0" viewBox="0 0 1440 160" preserveAspectRatio="none" fill="currentColor">
            <path d="M0,90 C320,40 640,120 960,60 C1280,10 1440,70 1440,70 L1440,160 L0,160 Z" />
          </svg>
        </div>

        {/* Rain Lines Overlay */}
        {skyConfig.isRain && (
          <div className="pointer-events-none absolute inset-0 opacity-55 rain-sky-layer" />
        )}

        <style>{`
          @keyframes skyRain {
            0% { background-position: 0 0; }
            100% { background-position: -30px 600px; }
          }
          .rain-sky-layer {
            background-image: repeating-linear-gradient(
              170deg,
              rgba(255, 255, 255, 0.75) 0px,
              rgba(255, 255, 255, 0.75) 2px,
              transparent 2px,
              transparent 14px
            );
            animation: skyRain 0.35s linear infinite;
          }
        `}</style>

        {/* ── 2. FOREGROUND CONTENT & HIGH-CONTRAST TYPOGRAPHY ── */}
        <div className="relative z-10 p-5 sm:p-7 md:p-8">
          
          {/* Top Location & Live Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/20">
            {wl ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-xs">
                  <MapPin size={16} className="shrink-0 text-amber-300" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-base font-extrabold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                    {wl.location.name || wl.location.district || 'Jaipur Municipal Corporation'}
                  </span>
                  <span className="ml-2 text-xs font-bold text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                    ({wl.location.state || 'India'})
                  </span>
                </div>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-sm font-bold text-white">
                <MapPin size={16} className="shrink-0 animate-pulse text-amber-300" aria-hidden="true" />
                <span>{loadingCityText || t("home.weatherDetecting")}</span>
              </span>
            )}

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 backdrop-blur-md px-3.5 py-1 text-xs font-black text-white border border-white/30 shadow-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" aria-hidden="true" />
                {t("home.wxLive")}
              </span>
              <button
                onClick={onRefresh}
                disabled={refreshing || !wl}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all active:scale-95 disabled:opacity-50 border border-white/30 shadow-xs"
                aria-label={refreshing ? t("home.fetchingWeather") : t("home.viewMore")}
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin text-amber-300" : ""} />
              </button>
            </div>
          </div>

          {wl ? (
            <>
              {/* Main Weather Display */}
              <div className="mt-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200 mb-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    <Sparkles size={14} className="text-amber-300" />
                    <span>{t("home.weatherTitle")}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-4">
                    {/* Temperature Display */}
                    <span className="text-6xl sm:text-7xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                      {formatTemp(wl.live.temp)}
                    </span>

                    {/* Condition Badge */}
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-black/30 border border-white/30 px-4 py-2 backdrop-blur-md shadow-md">
                      {(() => { const Icon = conditionIcon; return <Icon size={22} className="text-amber-300 shrink-0" aria-hidden="true" />; })()}
                      <span className="text-lg font-extrabold text-white tracking-wide">
                        {wl.live.condition}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid (Clean White Glass Tiles) */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-black/30 hover:bg-black/40 backdrop-blur-md border border-white/25 text-center shadow-md transition-transform hover:scale-105">
                    <CloudRain size={22} className="text-sky-300 mb-1" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.daily?.[0]?.rainProbability ?? 0}%</span>
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Rain</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-black/30 hover:bg-black/40 backdrop-blur-md border border-white/25 text-center shadow-md transition-transform hover:scale-105">
                    <Droplets size={22} className="text-teal-200 mb-1" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.live.humidity}%</span>
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Humidity</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-black/30 hover:bg-black/40 backdrop-blur-md border border-white/25 text-center shadow-md transition-transform hover:scale-105">
                    <Wind size={22} className="text-amber-200 mb-1" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.live.windSpeed} km/h</span>
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Wind</span>
                  </div>
                </div>
              </div>

              {/* High-Legibility White Farm Advisory Card */}
              {interpretationLine && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-white/95 backdrop-blur-md p-4 border-l-4 border-amber-500 text-slate-900 shadow-xl">
                  <div className="flex-1 text-sm font-semibold leading-relaxed text-slate-900">
                    <span className="inline-block font-extrabold text-white bg-slate-900 px-2.5 py-0.5 rounded-md mr-2 text-xs">
                      Farm Advisory
                    </span>
                    {interpretationLine}
                  </div>
                </div>
              )}

              {/* Footer Row & CTA Button */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4">
                <span className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Hyperlocal Weather for your farm area
                </span>

                <button
                  onClick={onOpenDetails}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white text-slate-950 hover:bg-amber-50 px-5 py-2.5 text-xs font-extrabold shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-95"
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
              <p className="text-sm font-semibold text-white">
                {t("home.fetchingWeather")}
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/30 backdrop-blur-md p-4 border border-white/25">
              <div className="flex items-center gap-3">
                <CloudRain size={20} className="text-amber-300 shrink-0" aria-hidden="true" />
                <p className="text-xs font-bold text-white">
                  {t("home.weatherUnavailable")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onRefresh}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-50"
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