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
  Gauge,
  SunMedium,
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
 * Dynamically computes real weather & time-of-day sky background styles.
 */
export function getSkyBackground(cond?: string, tempC?: number): {
  bgStyle: string;
  period: SkyPeriod;
  isRain: boolean;
  isStorm: boolean;
  isFog: boolean;
  isSunny: boolean;
} {
  const c = (cond || "").toLowerCase();
  const period = getSkyPeriod();
  const isRain = c.includes("rain") || c.includes("shower") || c.includes("drizzle");
  const isStorm = c.includes("thunder") || c.includes("storm");
  const isFog = c.includes("fog") || c.includes("mist") || c.includes("haze");
  const isSunny = c.includes("sun") || c.includes("clear") || c.includes("hot");

  let bgStyle = "from-[#081226] via-[#0f2142] to-[#081226]";

  if (isStorm) {
    bgStyle = "from-[#050914] via-[#0e1626] to-[#1a2333]";
  } else if (isRain) {
    bgStyle = "from-[#071324] via-[#10243e] to-[#0a182c]";
  } else if (isFog) {
    bgStyle = "from-[#0d1520] via-[#1a2636] to-[#121c29]";
  } else {
    switch (period) {
      case "dawn":
        bgStyle = "from-[#0c0f1d] via-[#2d1b4e] to-[#ea580c]";
        break;
      case "daytime":
        bgStyle = tempC && tempC > 36
          ? "from-[#0f172a] via-[#1e293b] to-[#b45309]"
          : "from-[#041c2c] via-[#093a58] to-[#0d5c8a]";
        break;
      case "dusk":
        bgStyle = "from-[#0b0c16] via-[#3a1548] to-[#9333ea]";
        break;
      case "night":
      default:
        bgStyle = "from-[#020617] via-[#090d16] to-[#1e1b4b]";
        break;
    }
  }

  return {
    bgStyle,
    period,
    isRain,
    isStorm,
    isFog,
    isSunny,
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
 * Dynamic Real Weather & Time-of-Day Showcase with Realistic Animations.
 * Features realistic floating 3D volumetric clouds, glowing solar flares,
 * animated rain drops, twinkling star fields, thunderstorm flashes, and horizon farm landscapes.
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

  // Generate 18 rain drop positions
  const rainDrops = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 0.45 + Math.random() * 0.35,
      height: 14 + Math.random() * 16,
      opacity: 0.4 + Math.random() * 0.5,
    }));
  }, []);

  // Generate 24 star positions
  const stars = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: Math.random() * 98,
      top: Math.random() * 75,
      size: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
    }));
  }, []);

  return (
    <section aria-labelledby="weather-heading" className="mt-6">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl text-white shadow-2xl bg-gradient-to-br transition-all duration-1000 border border-white/20 dark:border-white/15",
          skyConfig.bgStyle
        )}
      >
        {/* ── 1. REALISTIC CELESTIAL ATMOSPHERE & ANIMATIONS ── */}

        {/* Dynamic Thunderstorm Lightning Flash */}
        {skyConfig.isStorm && (
          <div className="pointer-events-none absolute inset-0 bg-white/15 animate-lightning-flash" />
        )}

        {/* Daytime / Dawn Realistic Glowing Sun & Solar Rays */}
        {(skyConfig.period === "daytime" || skyConfig.period === "dawn") && !skyConfig.isRain && (
          <div className="pointer-events-none absolute -right-12 -top-12 h-96 w-96 overflow-hidden">
            {/* Pulsing Core Flare */}
            <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute right-12 top-12 h-48 w-48 rounded-full bg-amber-300/20 blur-2xl animate-pulse" style={{ animationDuration: '6s' }} />
            
            {/* Rotating Solar Beam Flare */}
            <div className="absolute right-16 top-16 h-40 w-40 animate-sun-rotate">
              <svg className="w-full h-full text-amber-300/20" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="50" r="20" />
                <path d="M50 0 L53 25 L47 25 Z M50 100 L53 75 L47 75 Z M0 50 L25 53 L25 47 Z M100 50 L75 53 L75 47 Z M15 15 L33 30 L27 35 Z M85 85 L67 70 L73 65 Z M85 15 L70 33 L65 27 Z M15 85 L30 67 L35 73 Z" />
              </svg>
            </div>
          </div>
        )}

        {/* Dusk Sunset Horizon Glow */}
        {skyConfig.period === "dusk" && !skyConfig.isRain && (
          <div className="pointer-events-none absolute -right-8 bottom-0 h-64 w-96 rounded-full bg-orange-500/30 blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
        )}

        {/* Night Sapphire Sky & Twinkling Constellations */}
        {skyConfig.period === "night" && !skyConfig.isRain && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* Moon Glow Disc */}
            <div className="absolute right-8 top-6 h-24 w-24 rounded-full bg-indigo-300/15 blur-xl animate-pulse" style={{ animationDuration: '5s' }} />
            <div className="absolute right-12 top-8 h-12 w-12 rounded-full bg-amber-100/90 shadow-[0_0_24px_rgba(251,191,36,0.5)] border border-amber-200/40">
              <div className="absolute top-1 right-1 h-10 w-10 rounded-full bg-[#090d16] opacity-75" />
            </div>

            {/* Twinkling Starfield */}
            {stars.map((s) => (
              <div
                key={s.id}
                className="absolute rounded-full bg-white animate-star-twinkle"
                style={{
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  animationDelay: `${s.delay}s`,
                  animationDuration: `${s.duration}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Realistic Volumetric Drifting Clouds */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-35 select-none">
          {/* Cloud Layer 1 - Slow Back Layer */}
          <div className="absolute -top-6 left-0 w-[200%] h-40 animate-cloud-slow">
            <svg className="w-full h-full text-slate-100/20" viewBox="0 0 1200 120" preserveAspectRatio="none" fill="currentColor">
              <path d="M0,60 Q150,20 300,60 T600,60 T900,60 T1200,60 L1200,120 L0,120 Z" />
            </svg>
          </div>

          {/* Cloud Layer 2 - Fast Front Layer */}
          <div className="absolute top-2 left-0 w-[200%] h-48 animate-cloud-fast">
            <svg className="w-full h-full text-white/15" viewBox="0 0 1200 120" preserveAspectRatio="none" fill="currentColor">
              <path d="M0,80 Q200,30 400,80 T800,80 T1200,80 L1200,120 L0,120 Z" />
            </svg>
          </div>
        </div>

        {/* Realistic Animated Raindrops Engine */}
        {skyConfig.isRain && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {rainDrops.map((drop) => (
              <div
                key={drop.id}
                className="absolute w-[1.5px] bg-gradient-to-b from-transparent via-sky-200 to-white/90 animate-rain-fall"
                style={{
                  left: `${drop.left}%`,
                  height: `${drop.height}px`,
                  opacity: drop.opacity,
                  animationDelay: `${drop.delay}s`,
                  animationDuration: `${drop.duration}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Rolling Fog / Mist Layer */}
        {skyConfig.isFog && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200/20 via-white/30 to-slate-200/20 blur-md animate-mist-drift" />
          </div>
        )}

        {/* Dynamic Horizon Farm Silhouette */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 overflow-hidden opacity-25 select-none">
          <svg className="w-full h-full text-slate-950 absolute bottom-0" viewBox="0 0 1440 160" preserveAspectRatio="none" fill="currentColor">
            <path d="M0,100 C240,60 480,130 720,70 C960,10 1200,90 1440,50 L1440,160 L0,160 Z" />
          </svg>
        </div>

        {/* ── 2. FOREGROUND CONTENT & HIGH-CONTRAST TYPOGRAPHY ── */}
        <div className="relative z-10 p-5 sm:p-7 md:p-8">
          
          {/* Top Location & Live Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/20">
            {wl ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md text-white border border-white/30 shadow-md shrink-0 transition-transform hover:scale-110">
                  <MapPin size={18} className="text-amber-300 animate-bounce" style={{ animationDuration: '3s' }} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="text-base sm:text-lg font-extrabold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] truncate block">
                    {wl.location.name || wl.location.district || 'Jaipur Municipal Corporation'}
                  </span>
                  <span className="text-xs font-semibold text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] truncate block">
                    {wl.location.state || 'Rajasthan'}, India · Hyperlocal Live Weather
                  </span>
                </div>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-sm font-bold text-white">
                <MapPin size={16} className="shrink-0 animate-pulse text-amber-300" aria-hidden="true" />
                <span>{loadingCityText || t("home.weatherDetecting")}</span>
              </span>
            )}

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/40 backdrop-blur-md px-3.5 py-1 text-xs font-black text-white border border-white/30 shadow-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                Live near you
              </span>

              <button
                onClick={onRefresh}
                disabled={refreshing || !wl}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/30 backdrop-blur-md text-white transition-all active:scale-90 disabled:opacity-50 border border-white/30 shadow-md group"
                aria-label={refreshing ? t("home.fetchingWeather") : t("home.viewMore")}
                title="Refresh live weather"
              >
                <RefreshCw size={15} className={cn("transition-transform duration-700 group-hover:rotate-180", refreshing && "animate-spin text-amber-300")} />
              </button>
            </div>
          </div>

          {wl ? (
            <>
              {/* Main Weather Display */}
              <div className="mt-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300 mb-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    <Sparkles size={14} className="text-amber-300 animate-spin-slow" />
                    <span>{t("home.weatherTitle")}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-4">
                    {/* Main Temperature Display */}
                    <span className="text-6xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-amber-200 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                      {formatTemp(wl.live.temp)}
                    </span>

                    {/* Condition Badge */}
                    <div className="inline-flex items-center gap-2.5 rounded-2xl bg-black/40 border border-white/35 px-4 py-2.5 backdrop-blur-md shadow-lg transition-transform hover:scale-105">
                      {(() => { 
                        const Icon = conditionIcon; 
                        return <Icon size={24} className="text-amber-300 shrink-0 animate-pulse" aria-hidden="true" />; 
                      })()}
                      <span className="text-lg font-extrabold text-white tracking-wide">
                        {wl.live.condition}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid (Glassmorphic Translucent Tiles) */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-950/40 hover:bg-slate-900/60 backdrop-blur-md border border-white/25 text-center shadow-lg transition-all hover:scale-105 hover:border-sky-400/50 group">
                    <CloudRain size={22} className="text-sky-300 mb-1 group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.daily?.[0]?.rainProbability ?? 0}%</span>
                    <span className="text-[11px] font-extrabold text-white/80 uppercase tracking-wider">Rain</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-950/40 hover:bg-slate-900/60 backdrop-blur-md border border-white/25 text-center shadow-lg transition-all hover:scale-105 hover:border-teal-400/50 group">
                    <Droplets size={22} className="text-teal-200 mb-1 group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.live.humidity}%</span>
                    <span className="text-[11px] font-extrabold text-white/80 uppercase tracking-wider">Humidity</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-950/40 hover:bg-slate-900/60 backdrop-blur-md border border-white/25 text-center shadow-md transition-all hover:scale-105 hover:border-amber-400/50 group">
                    <Wind size={22} className="text-amber-200 mb-1 group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.live.windSpeed} km/h</span>
                    <span className="text-[11px] font-extrabold text-white/80 uppercase tracking-wider">Wind</span>
                  </div>
                </div>
              </div>

              {/* High-Legibility White Farm Advisory Banner */}
              {interpretationLine && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-white/95 backdrop-blur-md p-4 border-l-4 border-amber-500 text-slate-950 shadow-xl transition-transform hover:scale-[1.01]">
                  <div className="flex-1 text-sm font-semibold leading-relaxed text-slate-900">
                    <span className="inline-block font-black text-white bg-slate-950 px-2.5 py-0.5 rounded-md mr-2 text-xs shadow-xs">
                      Farm Advisory
                    </span>
                    {interpretationLine}
                  </div>
                </div>
              )}

              {/* Footer Row & CTA Button */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4">
                <span className="text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Updated live for your farm area
                </span>

                <button
                  onClick={onOpenDetails}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-white text-slate-950 hover:bg-amber-100 px-5 py-2.5 text-xs font-black shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <span>{t("home.openWeather") || "Full weather"}</span>
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
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/40 backdrop-blur-md p-4 border border-white/25">
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

      {/* Embedded High-Performance Realistic CSS Animations */}
      <style>{`
        @keyframes sunRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes cloudDriftSlow {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes cloudDriftFast {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        @keyframes rainFall {
          0% { transform: translateY(-30px) translateX(0px); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateY(220px) translateX(-20px); opacity: 0; }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes lightningFlash {
          0%, 92%, 100% { opacity: 0; }
          93%, 95% { opacity: 0.9; }
          94% { opacity: 0.3; }
        }
        @keyframes mistDrift {
          0% { transform: translateX(-10%); }
          100% { transform: translateX(10%); }
        }

        .animate-sun-rotate {
          animation: sunRotate 40s linear infinite;
        }
        .animate-cloud-slow {
          animation: cloudDriftSlow 60s linear infinite;
        }
        .animate-cloud-fast {
          animation: cloudDriftFast 45s linear infinite;
        }
        .animate-rain-fall {
          animation: rainFall linear infinite;
        }
        .animate-star-twinkle {
          animation: starTwinkle ease-in-out infinite;
        }
        .animate-lightning-flash {
          animation: lightningFlash 7s infinite;
        }
        .animate-mist-drift {
          animation: mistDrift 14s ease-in-out infinite alternate;
        }
        .animate-spin-slow {
          animation: sunRotate 12s linear infinite;
        }
      `}</style>
    </section>
  );
};

export default WeatherHero;