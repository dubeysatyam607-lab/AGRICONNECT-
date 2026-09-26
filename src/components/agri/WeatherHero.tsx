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

const bandClass = (cond?: string, tempC?: number): string => {
  const c = (cond || "").toLowerCase();
  if (c.includes("thunder")) return "from-slate-950 via-purple-950 to-slate-900";
  if (c.includes("rain") || c.includes("shower")) return "from-slate-950 via-teal-950 to-emerald-950";
  if (c.includes("fog") || c.includes("mist")) return "from-zinc-900 via-stone-900 to-emerald-950";
  if (c.includes("loo") || (tempC !== undefined && tempC >= 40)) return "from-amber-950 via-orange-900 to-emerald-950";
  
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return "from-amber-950 via-rose-900 to-emerald-950"; // Dawn
  if (hour >= 7 && hour < 17) return "from-emerald-950 via-teal-900 to-emerald-900"; // Daytime
  if (hour >= 17 && hour < 19) return "from-amber-950 via-orange-950 to-emerald-950"; // Dusk
  return "from-[#021d15] via-[#092b20] to-[#0f172a]"; // Night
};

const isDaytime = (cond?: string): boolean => {
  const hour = new Date().getHours();
  const c = (cond || "").toLowerCase();
  return !c.includes("clear") && !c.includes("night") && hour >= 6 && hour < 19;
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
 * Premium Animated Agriculture Weather Showcase.
 * Features glowing high-contrast text highlights, realistic weather elements,
 * floating clouds, swaying crops, and illuminated farm advice.
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
  const isDay = isDaytime(wl?.live?.condition);
  const isRaining = (wl?.live?.condition || "").toLowerCase().includes("rain") || (wl?.live?.condition || "").toLowerCase().includes("shower");
  const interpretationLine =
    interpretation ||
    (wl ? interpretWeather(wl.live.condition, wl.daily?.[0]?.rainProbability, wl.live.temp) : undefined);

  return (
    <section aria-labelledby="weather-heading" className="mt-6">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl text-white shadow-2xl transition-all duration-700 bg-gradient-to-br border border-emerald-500/30",
          wl ? bandClass(wl.live.condition, wl.live.temp) : "from-[#021d15] via-[#092b20] to-[#0f172a]"
        )}
      >
        {/* ── Dynamic Atmospheric Background Canvas ── */}

        {/* 1. Glowing Celestial Aura (Sun/Moon Light) */}
        {isDay ? (
          <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-400/20 blur-[90px] animate-pulse-slow" />
        ) : (
          <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-emerald-400/15 blur-[90px] animate-pulse-slow" />
        )}

        {/* 2. Twinkling Night Stars / Daytime Sparkles */}
        {!isDay && (
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute top-6 left-1/4 h-1 w-1 rounded-full bg-white animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute top-12 right-1/3 h-1.5 w-1.5 rounded-full bg-amber-200 animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute top-20 left-10 h-1 w-1 rounded-full bg-emerald-200 animate-ping" style={{ animationDuration: '5s' }} />
            <div className="absolute top-16 right-20 h-1 w-1 rounded-full bg-white animate-pulse" style={{ animationDuration: '2.5s' }} />
          </div>
        )}

        {/* 3. Passing Volumetric SVG Clouds */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 overflow-hidden opacity-35 select-none z-0">
          <svg className="absolute -top-4 left-0 h-32 w-[900px] text-emerald-200/40 animate-cloud-drift-1" viewBox="0 0 1000 120" fill="currentColor">
            <path d="M0 80 Q 150 20 300 80 T 600 80 T 900 80 L 1000 120 L 0 120 Z" />
          </svg>
          <svg className="absolute top-2 -right-16 h-36 w-[1000px] text-emerald-100/30 animate-cloud-drift-2" viewBox="0 0 1000 120" fill="currentColor">
            <path d="M0 90 Q 200 35 400 90 T 800 90 L 1000 120 L 0 120 Z" />
          </svg>
        </div>

        {/* 4. Realistic Animated Crop Rows & Rolling Hills */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-28 overflow-hidden opacity-30 select-none z-0">
          {/* Back Hills Silhouette */}
          <svg className="w-full h-full text-emerald-950/90 absolute bottom-0" viewBox="0 0 1440 160" preserveAspectRatio="none" fill="currentColor">
            <path d="M0,80 C320,30 640,110 960,50 C1280,0 1440,60 1440,60 L1440,160 L0,160 Z" />
          </svg>
          {/* Swaying Crop Stalks */}
          <svg className="w-full h-full text-emerald-900/90 absolute bottom-0" viewBox="0 0 1440 160" preserveAspectRatio="none" fill="currentColor">
            <path
              className="animate-crop-sway"
              d="M0,100 Q180,60 360,110 T720,95 T1080,115 T1440,100 L1440,160 L0,160 Z"
            />
            <path
              className="animate-crop-sway-slow"
              d="M0,120 Q240,90 480,125 T960,110 T1440,120 L1440,160 L0,160 Z"
            />
          </svg>
        </div>

        {/* 5. Rain Drops Overlay */}
        {isRaining && (
          <div className="pointer-events-none absolute inset-0 opacity-50 rain-hero-layer z-0" />
        )}

        {/* ── Keyframe Animation Rules ── */}
        <style>{`
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(1.1); }
          }
          @keyframes cloudDrift1 {
            0% { transform: translateX(-12%); }
            50% { transform: translateX(8%); }
            100% { transform: translateX(-12%); }
          }
          @keyframes cloudDrift2 {
            0% { transform: translateX(8%); }
            50% { transform: translateX(-12%); }
            100% { transform: translateX(8%); }
          }
          @keyframes cropSway {
            0% { transform: skewX(0deg); }
            50% { transform: skewX(-5deg); }
            100% { transform: skewX(0deg); }
          }
          @keyframes heroRain {
            0% { background-position: 0 0; }
            100% { background-position: -25px 500px; }
          }
          .animate-pulse-slow {
            animation: pulseGlow 6s ease-in-out infinite;
          }
          .animate-cloud-drift-1 {
            animation: cloudDrift1 28s ease-in-out infinite;
          }
          .animate-cloud-drift-2 {
            animation: cloudDrift2 38s ease-in-out infinite;
          }
          .animate-crop-sway {
            transform-origin: bottom;
            animation: cropSway 5s ease-in-out infinite;
          }
          .animate-crop-sway-slow {
            transform-origin: bottom;
            animation: cropSway 8s ease-in-out infinite 1s;
          }
          .rain-hero-layer {
            background-image: repeating-linear-gradient(
              170deg,
              rgba(56, 189, 248, 0.7) 0px,
              rgba(56, 189, 248, 0.7) 2px,
              transparent 2px,
              transparent 14px
            );
            animation: heroRain 0.4s linear infinite;
          }
        `}</style>

        {/* ── Foreground Interactive Visual Overlay ── */}
        <div className="relative z-10 p-5 sm:p-7 md:p-8">
          
          {/* Top Location & Refresh Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-emerald-500/25">
            {wl ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <MapPin size={16} className="shrink-0" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-sm font-black tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {wl.location.name || wl.location.district || 'Jaipur Municipal Corporation'}
                  </span>
                  <span className="ml-2 text-xs font-semibold text-emerald-300/90">
                    ({wl.location.state || 'India'})
                  </span>
                </div>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-sm font-bold text-emerald-200">
                <MapPin size={16} className="shrink-0 animate-pulse text-amber-300" aria-hidden="true" />
                <span>{loadingCityText || t("home.weatherDetecting")}</span>
              </span>
            )}

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md px-3.5 py-1 text-xs font-black text-emerald-300 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" aria-hidden="true" />
                {t("home.wxLive")}
              </span>
              <button
                onClick={onRefresh}
                disabled={refreshing || !wl}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all active:scale-95 disabled:opacity-50 border border-white/20 shadow-sm"
                aria-label={refreshing ? t("home.fetchingWeather") : t("home.viewMore")}
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin text-emerald-300" : ""} />
              </button>
            </div>
          </div>

          {wl ? (
            <>
              {/* Main Weather Display with Highlighted Text */}
              <div className="mt-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300/90 mb-1">
                    <Sparkles size={13} className="text-amber-300" />
                    <span>{t("home.weatherTitle")}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-baseline gap-4">
                    {/* Temperature Highlight */}
                    <span className="text-6xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-300 drop-shadow-[0_4px_20px_rgba(16,185,129,0.35)]">
                      {formatTemp(wl.live.temp)}
                    </span>

                    {/* Condition Pill Highlight */}
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-400/20 border border-amber-400/40 px-4 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                      {(() => { const Icon = conditionIcon; return <Icon size={20} className="text-amber-300 shrink-0" aria-hidden="true" />; })()}
                      <span className="text-base font-extrabold text-amber-200 tracking-wide">
                        {wl.live.condition}
                      </span>
                    </div>
                  </div>

                  {/* Highlighted Farm Advisory Banner */}
                  {interpretationLine && (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-black/50 backdrop-blur-md p-3.5 border-l-4 border-emerald-400 border-y border-r border-white/10 shadow-lg">
                      <div className="flex-1 text-sm font-medium text-emerald-100 leading-relaxed">
                        <span className="inline-block font-extrabold text-white bg-emerald-800/80 px-2 py-0.5 rounded-md mr-1.5 text-xs border border-emerald-400/30">
                          Farm Insight
                        </span>
                        {interpretationLine}
                      </div>
                    </div>
                  )}
                </div>

                {/* Highlighted Metrics Boxes */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.15)] transition-transform hover:scale-105">
                    <CloudRain size={20} className="text-sky-400 mb-1" aria-hidden="true" />
                    <span className="text-base font-black text-white">{wl.daily?.[0]?.rainProbability ?? 0}%</span>
                    <span className="text-[10px] font-extrabold tracking-wider text-sky-300 uppercase">Rain</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-teal-400/30 shadow-[0_0_15px_rgba(45,212,191,0.15)] transition-transform hover:scale-105">
                    <Droplets size={20} className="text-teal-300 mb-1" aria-hidden="true" />
                    <span className="text-base font-black text-white">{wl.live.humidity}%</span>
                    <span className="text-[10px] font-extrabold tracking-wider text-teal-300 uppercase">Humidity</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-emerald-400/30 shadow-[0_0_15px_rgba(52,211,153,0.15)] transition-transform hover:scale-105">
                    <Wind size={20} className="text-emerald-300 mb-1" aria-hidden="true" />
                    <span className="text-base font-black text-white">{wl.live.windSpeed} km/h</span>
                    <span className="text-[10px] font-extrabold tracking-wider text-emerald-300 uppercase">Wind</span>
                  </div>
                </div>
              </div>

              {/* Footer Row & CTA Button */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-500/25 pt-4">
                <span className="text-xs font-bold text-emerald-200/90 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live Hyperlocal Weather for your farm
                </span>

                <button
                  onClick={onOpenDetails}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-emerald-950 px-5 py-2.5 text-xs font-black shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all duration-200 hover:scale-[1.03] active:scale-95"
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
              <p className="text-sm font-semibold text-emerald-200">
                {t("home.fetchingWeather")}
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/40 backdrop-blur-md p-4 border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <CloudRain size={20} className="text-amber-300 shrink-0" aria-hidden="true" />
                <p className="text-xs font-bold text-white">
                  {t("home.weatherUnavailable")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onRefresh}
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-emerald-950 shadow-md hover:bg-emerald-300"
                >
                  {t("home.retryWeather")}
                </button>
                <button
                  onClick={onOpenLocation}
                  className="rounded-xl bg-white/15 backdrop-blur-md px-4 py-2 text-xs font-bold text-white border border-white/20 transition-colors hover:bg-white/25"
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