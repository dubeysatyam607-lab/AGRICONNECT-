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

const bandClass = (cond?: string, tempC?: number): string => {
  const c = (cond || "").toLowerCase();
  if (c.includes("thunder")) return "gradient-hero-storm";
  if (c.includes("rain") || c.includes("shower")) return "gradient-hero-rain";
  if (c.includes("fog") || c.includes("mist")) return "gradient-hero-fog";
  if (c.includes("loo") || (tempC !== undefined && tempC >= 40)) return "gradient-hero-hot";
  const hour = new Date().getHours();
  if (hour < 6) return "gradient-hero-dawn";
  if (hour < 17) return "gradient-hero-noon";
  if (hour < 19) return "gradient-hero-dusk";
  return "gradient-hero-night";
};

const isDaytime = (cond?: string): boolean => {
  const hour = new Date().getHours();
  const c = (cond || "").toLowerCase();
  return !c.includes("clear") && !c.includes("night") && hour >= 6 && hour < 19;
};

const interpretWeather = (cond?: string, rainPct?: number, tempC?: number): string => {
  const c = (cond || "").toLowerCase();
  if (rainPct !== undefined && rainPct >= 55) return "Rain expected: delay harvest and pesticide spraying";
  if (c.includes("thunder")) return "Thunderstorm risk: keep farm machinery safely covered";
  if (c.includes("sunny") && tempC !== undefined && tempC >= 40) return "High heat: irrigate crops in early morning or evening";
  if (c.includes("fog") || c.includes("mist")) return "Morning mist: plan spraying operations after 10:00 AM";
  if (c.includes("rain") || c.includes("shower")) return "Showers expected: hold off on chemical application";
  if (c.includes("partly") || c.includes("cloud")) return "Favorable conditions for routine field operations";
  return tempC !== undefined && tempC >= 35 ? "Warm day: take regular shade breaks during field work" : "Optimal day for farm field work";
};

/**
 * Enhanced Agriculture Live Weather Window.
 * Displays high-contrast weather metrics over a natural animated field landscape.
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
  const showSun = !wl || isDaytime(wl?.live?.condition);
  const isRaining = (wl?.live?.condition || "").toLowerCase().includes("rain") || (wl?.live?.condition || "").toLowerCase().includes("shower");
  const interpretationLine =
    interpretation ||
    (wl ? interpretWeather(wl.live.condition, wl.daily?.[0]?.rainProbability, wl.live.temp) : undefined);

  return (
    <section aria-labelledby="weather-heading" className="mt-6">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl text-white shadow-xl transition-all duration-700 border border-white/20",
          wl ? bandClass(wl.live.condition, wl.live.temp) : "gradient-hero-noon",
        )}
      >
        {/* ── Dynamic Atmospheric Background Layers ── */}

        {/* 1. Atmospheric Sunlight Glow */}
        {showSun && (
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl animate-pulse duration-3000" />
        )}

        {/* 2. Rotating Decorative Sun Icon */}
        {showSun && (
          <Sun
            size={180}
            className="pointer-events-none absolute -right-10 -top-10 opacity-[0.12] text-amber-200 animate-spin-slow"
            aria-hidden="true"
          />
        )}

        {/* 3. Passing Clouds */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden opacity-30 select-none">
          <svg className="absolute -top-2 left-0 h-28 w-[800px] text-white/40 animate-cloud-drift-1" viewBox="0 0 1000 120" fill="currentColor">
            <path d="M0 80 Q 150 20 300 80 T 600 80 T 900 80 L 1000 120 L 0 120 Z" />
          </svg>
          <svg className="absolute top-4 -right-20 h-32 w-[900px] text-white/30 animate-cloud-drift-2" viewBox="0 0 1000 120" fill="currentColor">
            <path d="M0 90 Q 200 40 400 90 T 800 90 L 1000 120 L 0 120 Z" />
          </svg>
        </div>

        {/* 4. Swaying Crop Stalks Silhouette (Bottom Layer) */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 overflow-hidden opacity-25 select-none">
          <svg className="w-full h-full text-emerald-950/80" viewBox="0 0 1200 120" preserveAspectRatio="none" fill="currentColor">
            <path
              className="animate-crop-sway"
              d="M0,80 Q100,50 200,85 T400,75 T600,90 T800,70 T1000,85 T1200,75 L1200,120 L0,120 Z"
            />
            <path
              className="animate-crop-sway-slow"
              d="M0,95 Q150,70 300,98 T600,85 T900,95 T1200,88 L1200,120 L0,120 Z"
            />
          </svg>
        </div>

        {/* 5. Rain Particle Overlay */}
        {isRaining && (
          <div className="pointer-events-none absolute inset-0 opacity-40 rain-hero-layer" />
        )}

        {/* ── Custom Inlined Animations ── */}
        <style>{`
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes cloudDrift1 {
            0% { transform: translateX(-10%); }
            50% { transform: translateX(5%); }
            100% { transform: translateX(-10%); }
          }
          @keyframes cloudDrift2 {
            0% { transform: translateX(5%); }
            50% { transform: translateX(-10%); }
            100% { transform: translateX(5%); }
          }
          @keyframes cropSway {
            0% { transform: skewX(0deg); }
            50% { transform: skewX(-4deg); }
            100% { transform: skewX(0deg); }
          }
          @keyframes heroRain {
            0% { background-position: 0 0; }
            100% { background-position: -20px 400px; }
          }
          .animate-spin-slow {
            animation: spinSlow 45s linear infinite;
          }
          .animate-cloud-drift-1 {
            animation: cloudDrift1 25s ease-in-out infinite;
          }
          .animate-cloud-drift-2 {
            animation: cloudDrift2 35s ease-in-out infinite;
          }
          .animate-crop-sway {
            transform-origin: bottom;
            animation: cropSway 6s ease-in-out infinite;
          }
          .animate-crop-sway-slow {
            transform-origin: bottom;
            animation: cropSway 9s ease-in-out infinite 1s;
          }
          .rain-hero-layer {
            background-image: repeating-linear-gradient(
              170deg,
              rgba(255, 255, 255, 0.6) 0px,
              rgba(255, 255, 255, 0.6) 2px,
              transparent 2px,
              transparent 14px
            );
            animation: heroRain 0.5s linear infinite;
          }
        `}</style>

        {/* ── Foreground Content ── */}
        <div className="relative z-10 p-5 sm:p-7 md:p-8">
          {/* Top row location & live badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/20">
            {wl ? (
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-white drop-shadow-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <MapPin size={15} className="shrink-0 text-amber-300" aria-hidden="true" />
                </span>
                <span className="truncate">{wl.location.name || wl.location.district}, {wl.location.state || 'India'}</span>
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-white drop-shadow-sm">
                <MapPin size={15} className="shrink-0 animate-pulse text-amber-300" aria-hidden="true" />
                <span className="truncate">{loadingCityText || t("home.weatherDetecting")}</span>
              </span>
            )}

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/40 backdrop-blur-md px-3 py-1 text-xs font-extrabold text-white border border-emerald-400/30 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" aria-hidden="true" />
                {t("home.wxLive")}
              </span>
              <button
                onClick={onRefresh}
                disabled={refreshing || !wl}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white transition-all hover:bg-white/35 active:scale-95 disabled:opacity-50 border border-white/20"
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
                  <p className="text-xs font-extrabold uppercase tracking-widest text-amber-200/90 drop-shadow-sm">
                    {t("home.weatherTitle")}
                  </p>
                  <div className="mt-1 flex items-baseline gap-4">
                    <span className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight drop-shadow-md">
                      {formatTemp(wl.live.temp)}
                    </span>
                    <div className="flex items-center gap-2 rounded-2xl bg-black/25 backdrop-blur-md px-3.5 py-1.5 border border-white/15">
                      {(() => { const Icon = conditionIcon; return <Icon size={22} className="text-amber-300 shrink-0" aria-hidden="true" />; })()}
                      <span className="text-base font-bold text-white">{wl.live.condition}</span>
                    </div>
                  </div>

                  {interpretationLine && (
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/95 font-medium drop-shadow-sm bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                      {interpretationLine}
                    </p>
                  )}
                </div>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-2.5 shrink-0">
                  {[
                    { icon: CloudRain, label: t("home.rain", { pct: wl.daily?.[0]?.rainProbability ?? 0 }), sub: "Rain" },
                    { icon: Droplets, label: `${wl.live.humidity}%`, sub: "Humidity" },
                    { icon: Wind, label: `${wl.live.windSpeed} km/h`, sub: "Wind" },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.sub}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/30 backdrop-blur-md border border-white/15 text-center transition-transform hover:scale-105"
                      >
                        <Icon size={18} className="text-amber-300 mb-1" aria-hidden="true" />
                        <span className="text-xs font-bold text-white">{m.label}</span>
                        <span className="text-[10px] text-white/70 font-semibold">{m.sub}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Footer & Navigation Button */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4">
                {wl.isOfflineCached ? (
                  <span className="rounded-full bg-amber-500/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-amber-200 border border-amber-400/30">
                    {t("agr127")}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-white/80">
                    Updated live for your farm area
                  </span>
                )}
                <button
                  onClick={onOpenDetails}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white text-emerald-950 px-4 py-2.5 text-xs font-black shadow-lg transition-all duration-200 hover:bg-emerald-50 hover:scale-[1.02] active:scale-95"
                >
                  {t("home.openWeather")}
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : loading ? (
            <div className="mt-6 space-y-3">
              <div className="h-5 w-44 rounded-lg bg-white/20 animate-pulse" />
              <div className="h-16 w-36 rounded-xl bg-white/20 animate-pulse" />
              <p className="text-sm font-semibold text-white/85">
                {t("home.fetchingWeather")}
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/30 backdrop-blur-md p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <CloudRain size={20} className="text-amber-300 shrink-0" aria-hidden="true" />
                <p className="text-xs font-bold text-white">
                  {t("home.weatherUnavailable")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onRefresh}
                  className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-emerald-950 transition-transform active:scale-95 shadow-md"
                >
                  {t("home.retryWeather")}
                </button>
                <button
                  onClick={onOpenLocation}
                  className="rounded-xl bg-white/20 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white border border-white/20 transition-colors hover:bg-white/30"
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