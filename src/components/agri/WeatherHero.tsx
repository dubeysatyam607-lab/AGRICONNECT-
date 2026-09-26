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

const getFarmImage = (cond?: string): string => {
  const c = (cond || "").toLowerCase();
  if (c.includes("rain") || c.includes("shower") || c.includes("thunder")) {
    return "/images/paddy-smart-farm.jpg";
  }
  if (c.includes("hot") || c.includes("clear") || c.includes("sun")) {
    return "/images/wheat-smart-farm.jpg";
  }
  return "/images/smart-farm-hero.jpg";
};

const getGradientOverlay = (cond?: string, tempC?: number): string => {
  const c = (cond || "").toLowerCase();
  if (c.includes("thunder")) return "from-slate-950/90 via-purple-950/80 to-slate-950/95";
  if (c.includes("rain") || c.includes("shower")) return "from-slate-950/90 via-emerald-950/80 to-teal-950/95";
  if (c.includes("fog") || c.includes("mist")) return "from-stone-950/90 via-zinc-900/80 to-emerald-950/95";
  if (c.includes("loo") || (tempC !== undefined && tempC >= 40)) return "from-amber-950/90 via-orange-950/80 to-emerald-950/95";
  
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return "from-amber-950/90 via-rose-950/80 to-emerald-950/95"; // Dawn
  if (hour >= 7 && hour < 17) return "from-emerald-950/85 via-teal-950/75 to-emerald-900/90"; // Daytime
  if (hour >= 17 && hour < 19) return "from-amber-950/90 via-orange-950/85 to-emerald-950/95"; // Dusk
  return "from-[#021d15]/95 via-[#092b20]/85 to-[#0b1329]/95"; // Night
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
 * Premium Agriculture Live Weather Card with Real Farm Background (40% Opacity),
 * Dynamic Sky Animations, Glowing Highlight Typography, and Live Weather Metrics.
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
  const farmBgImage = getFarmImage(wl?.live?.condition);
  const gradientOverlay = getGradientOverlay(wl?.live?.condition, wl?.live?.temp);
  const isDay = isDaytime(wl?.live?.condition);
  const isRaining = (wl?.live?.condition || "").toLowerCase().includes("rain") || (wl?.live?.condition || "").toLowerCase().includes("shower");
  const interpretationLine =
    interpretation ||
    (wl ? interpretWeather(wl.live.condition, wl.daily?.[0]?.rainProbability, wl.live.temp) : undefined);

  return (
    <section aria-labelledby="weather-heading" className="mt-6">
      <div className="relative overflow-hidden rounded-3xl text-white shadow-2xl border border-emerald-500/40 bg-slate-950">
        
        {/* ── 1. REAL FARM BACKGROUND IMAGE (40% OPACITY + SLOW ANIMATED ZOOM) ── */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          <img
            src={farmBgImage}
            alt="Real Agriculture Farm Field"
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity scale-105 animate-farm-bg-zoom transition-all duration-1000"
          />
          {/* Color Gradient Blend Mask over Farm Image */}
          <div className={cn("absolute inset-0 bg-gradient-to-br backdrop-blur-[1px]", gradientOverlay)} />
        </div>

        {/* ── 2. DYNAMIC ATMOSPHERIC ANIMATIONS ── */}

        {/* Sun / Moon Light Aura */}
        {isDay ? (
          <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-400/25 blur-[100px] animate-pulse-glow" />
        ) : (
          <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-emerald-400/20 blur-[100px] animate-pulse-glow" />
        )}

        {/* Night Stars / Daytime Sparkles */}
        {!isDay && (
          <div className="pointer-events-none absolute inset-0 opacity-70 z-0">
            <div className="absolute top-6 left-1/4 h-1.5 w-1.5 rounded-full bg-white animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute top-12 right-1/3 h-2 w-2 rounded-full bg-amber-200 animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute top-20 left-12 h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping" style={{ animationDuration: '5s' }} />
            <div className="absolute top-16 right-24 h-1.5 w-1.5 rounded-full bg-white animate-pulse" style={{ animationDuration: '2.5s' }} />
          </div>
        )}

        {/* Passing Clouds */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 overflow-hidden opacity-35 select-none z-0">
          <svg className="absolute -top-4 left-0 h-32 w-[900px] text-emerald-100/40 animate-cloud-drift-1" viewBox="0 0 1000 120" fill="currentColor">
            <path d="M0 80 Q 150 20 300 80 T 600 80 T 900 80 L 1000 120 L 0 120 Z" />
          </svg>
          <svg className="absolute top-2 -right-16 h-36 w-[1000px] text-emerald-50/30 animate-cloud-drift-2" viewBox="0 0 1000 120" fill="currentColor">
            <path d="M0 90 Q 200 35 400 90 T 800 90 L 1000 120 L 0 120 Z" />
          </svg>
        </div>

        {/* Swaying Crop Stalks at Bottom */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-28 overflow-hidden opacity-40 select-none z-0">
          <svg className="w-full h-full text-emerald-950/90 absolute bottom-0" viewBox="0 0 1440 160" preserveAspectRatio="none" fill="currentColor">
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

        {/* Animated Rain Lines */}
        {isRaining && (
          <div className="pointer-events-none absolute inset-0 opacity-60 rain-hero-layer z-0" />
        )}

        {/* Animation Keyframe Definitions */}
        <style>{`
          @keyframes farmBgZoom {
            0% { transform: scale(1.02); }
            50% { transform: scale(1.08); }
            100% { transform: scale(1.02); }
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.25; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.1); }
          }
          @keyframes cloudDrift1 {
            0% { transform: translateX(-15%); }
            50% { transform: translateX(10%); }
            100% { transform: translateX(-15%); }
          }
          @keyframes cloudDrift2 {
            0% { transform: translateX(10%); }
            50% { transform: translateX(-15%); }
            100% { transform: translateX(10%); }
          }
          @keyframes cropSway {
            0% { transform: skewX(0deg); }
            50% { transform: skewX(-5deg); }
            100% { transform: skewX(0deg); }
          }
          @keyframes heroRain {
            0% { background-position: 0 0; }
            100% { background-position: -30px 600px; }
          }
          .animate-farm-bg-zoom {
            animation: farmBgZoom 30s ease-in-out infinite;
          }
          .animate-pulse-glow {
            animation: pulseGlow 5s ease-in-out infinite;
          }
          .animate-cloud-drift-1 {
            animation: cloudDrift1 26s ease-in-out infinite;
          }
          .animate-cloud-drift-2 {
            animation: cloudDrift2 36s ease-in-out infinite;
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
              rgba(56, 189, 248, 0.75) 0px,
              rgba(56, 189, 248, 0.75) 2px,
              transparent 2px,
              transparent 14px
            );
            animation: heroRain 0.35s linear infinite;
          }
        `}</style>

        {/* ── 3. FOREGROUND CONTENT & HIGHLIGHTED TYPOGRAPHY ── */}
        <div className="relative z-10 p-5 sm:p-7 md:p-8">
          
          {/* Location Kicker & Live Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-emerald-400/30">
            {wl ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                  <MapPin size={16} className="shrink-0" aria-hidden="true" />
                </div>
                <div>
                  <span className="text-sm font-black tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                    {wl.location.name || wl.location.district || 'Jaipur Municipal Corporation'}
                  </span>
                  <span className="ml-2 text-xs font-bold text-emerald-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/70 backdrop-blur-md px-3.5 py-1 text-xs font-black text-emerald-300 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" aria-hidden="true" />
                {t("home.wxLive")}
              </span>
              <button
                onClick={onRefresh}
                disabled={refreshing || !wl}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition-all active:scale-95 disabled:opacity-50 border border-white/25 shadow-md"
                aria-label={refreshing ? t("home.fetchingWeather") : t("home.viewMore")}
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin text-emerald-300" : ""} />
              </button>
            </div>
          </div>

          {wl ? (
            <>
              {/* Highlighted Temperature & Weather Showcase */}
              <div className="mt-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] mb-1">
                    <Sparkles size={14} className="text-amber-300 animate-pulse" />
                    <span>{t("home.weatherTitle")}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-baseline gap-4">
                    {/* Temperature Highlight */}
                    <span className="text-6xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-emerald-200 drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
                      {formatTemp(wl.live.temp)}
                    </span>

                    {/* Condition Pill Highlight */}
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-400/25 border border-amber-300/40 px-4 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                      {(() => { const Icon = conditionIcon; return <Icon size={20} className="text-amber-300 shrink-0" aria-hidden="true" />; })()}
                      <span className="text-base font-extrabold text-amber-100 tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                        {wl.live.condition}
                      </span>
                    </div>
                  </div>

                  {/* Highlighted Farm Advisory Banner */}
                  {interpretationLine && (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-gradient-to-r from-emerald-950/95 via-emerald-900/80 to-slate-950/90 backdrop-blur-md p-4 border-l-4 border-emerald-400 border-y border-r border-emerald-500/30 shadow-2xl">
                      <div className="flex-1 text-sm font-medium text-emerald-50 leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                        <span className="inline-block font-extrabold text-emerald-950 bg-emerald-400 px-2.5 py-0.5 rounded-md mr-2 text-xs shadow-sm">
                          Farm Insight
                        </span>
                        {interpretationLine}
                      </div>
                    </div>
                  )}
                </div>

                {/* Highlighted Metrics Grid Boxes */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900/90 backdrop-blur-md border border-sky-400/40 shadow-[0_0_18px_rgba(56,189,248,0.2)] transition-transform hover:scale-105">
                    <CloudRain size={22} className="text-sky-400 mb-1" aria-hidden="true" />
                    <span className="text-base font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{wl.daily?.[0]?.rainProbability ?? 0}%</span>
                    <span className="text-[10px] font-extrabold tracking-wider text-sky-300 uppercase">Rain</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900/90 backdrop-blur-md border border-teal-400/40 shadow-[0_0_18px_rgba(45,212,191,0.2)] transition-transform hover:scale-105">
                    <Droplets size={22} className="text-teal-300 mb-1" aria-hidden="true" />
                    <span className="text-base font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{wl.live.humidity}%</span>
                    <span className="text-[10px] font-extrabold tracking-wider text-teal-300 uppercase">Humidity</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-900/90 backdrop-blur-md border border-emerald-400/40 shadow-[0_0_18px_rgba(52,211,153,0.2)] transition-transform hover:scale-105">
                    <Wind size={22} className="text-emerald-300 mb-1" aria-hidden="true" />
                    <span className="text-base font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{wl.live.windSpeed} km/h</span>
                    <span className="text-[10px] font-extrabold tracking-wider text-emerald-300 uppercase">Wind</span>
                  </div>
                </div>
              </div>

              {/* Footer Row & CTA Button */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-400/30 pt-4">
                <span className="text-xs font-bold text-emerald-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Hyperlocal Weather for your farm area
                </span>

                <button
                  onClick={onOpenDetails}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-emerald-950 px-5 py-2.5 text-xs font-black shadow-[0_0_22px_rgba(52,211,153,0.45)] transition-all duration-200 hover:scale-[1.03] active:scale-95"
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
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950/80 backdrop-blur-md p-4 border border-emerald-500/40">
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
                  className="rounded-xl bg-white/20 backdrop-blur-md px-4 py-2 text-xs font-bold text-white border border-white/20 transition-colors hover:bg-white/25"
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