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
  Eye,
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
 */
export function getSkyConfig(cond?: string, tempC?: number): {
  period: SkyPeriod;
  isRain: boolean;
  isStorm: boolean;
  isFog: boolean;
  isSunny: boolean;
  overlayGradient: string;
} {
  const c = (cond || "").toLowerCase();
  const period = getSkyPeriod();
  const isRain = c.includes("rain") || c.includes("shower") || c.includes("drizzle");
  const isStorm = c.includes("thunder") || c.includes("storm");
  const isFog = c.includes("fog") || c.includes("mist") || c.includes("haze");
  const isSunny = c.includes("sun") || c.includes("clear") || c.includes("hot");

  let overlayGradient = "from-[#0f172a]/75 via-[#0f172a]/85 to-[#020617]/95";

  if (isStorm) {
    overlayGradient = "from-[#050814]/90 via-[#0b1324]/90 to-[#020617]/98";
  } else if (isRain) {
    overlayGradient = "from-[#061426]/85 via-[#0c1f38]/90 to-[#020914]/95";
  } else if (isFog) {
    overlayGradient = "from-[#0c1724]/85 via-[#162536]/90 to-[#0a121c]/95";
  } else {
    switch (period) {
      case "dawn":
        overlayGradient = "from-[#1a0f2e]/70 via-[#2d123d]/80 to-[#0c0a1a]/95";
        break;
      case "daytime":
        overlayGradient = tempC && tempC > 36
          ? "from-[#1e1b4b]/60 via-[#0f172a]/80 to-[#020617]/95"
          : "from-[#061b2e]/65 via-[#0f2d4a]/80 to-[#020d1a]/95";
        break;
      case "dusk":
        overlayGradient = "from-[#180b26]/70 via-[#2d0e3a]/80 to-[#080512]/95";
        break;
      case "night":
      default:
        overlayGradient = "from-[#020617]/80 via-[#0b1329]/88 to-[#020617]/98";
        break;
    }
  }

  return {
    period,
    isRain,
    isStorm,
    isFog,
    isSunny,
    overlayGradient,
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
 * World-Class Realistic Agriculture Weather Engine Card.
 * Combines high-resolution real farm photography background with interactive 60fps
 * celestial visual effects, real rain particle streams, glowing sun flare halos,
 * starry night sky, and ultra-sleek glassmorphic telemetry HUD controls.
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
  const skyConfig = getSkyConfig(wl?.live?.condition, wl?.live?.temp);
  const interpretationLine =
    interpretation ||
    (wl ? interpretWeather(wl.live.condition, wl.daily?.[0]?.rainProbability, wl.live.temp) : undefined);

  // Background photographic farm scenery
  const farmPhotoSrc = useMemo(() => {
    const c = (wl?.live?.condition || "").toLowerCase();
    if (c.includes("rain") || c.includes("shower")) return "/images/paddy-smart-farm.jpg";
    if (c.includes("cloud") || c.includes("overcast")) return "/images/wheat-smart-farm.jpg";
    return "/images/smart-farm-hero.jpg";
  }, [wl?.live?.condition]);

  // Generate 20 rain drops
  const rainDrops = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 0.4 + Math.random() * 0.35,
      height: 16 + Math.random() * 18,
      opacity: 0.45 + Math.random() * 0.5,
    }));
  }, []);

  // Generate 24 twinkling stars
  const stars = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: Math.random() * 98,
      top: Math.random() * 70,
      size: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
    }));
  }, []);

  return (
    <section aria-labelledby="weather-heading" className="mt-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/20 text-white shadow-2xl transition-all duration-500 hover:shadow-emerald-950/20 group">
        
        {/* ── 1. PHOTOREALISTIC HIGH-RESOLUTION FARM BACKDROP ── */}
        <div className="absolute inset-0 select-none overflow-hidden">
          <img
            src={farmPhotoSrc}
            alt="Real agricultural farm field"
            className="h-full w-full object-cover object-center transition-transform duration-1000 group-hover:scale-105"
            loading="eager"
          />
          {/* Dynamic Sky & Time-of-Day Gradient Tint Overlay */}
          <div className={cn("absolute inset-0 bg-gradient-to-br transition-colors duration-1000", skyConfig.overlayGradient)} />
        </div>

        {/* ── 2. REALISTIC ANIMATED ATMOSPHERIC EFFECTS ── */}

        {/* Thunderstorm Lightning Flash */}
        {skyConfig.isStorm && (
          <div className="pointer-events-none absolute inset-0 bg-white/20 animate-lightning-flash z-[1]" />
        )}

        {/* Dynamic Sun Flare & Rays */}
        {(skyConfig.period === "daytime" || skyConfig.period === "dawn") && !skyConfig.isRain && (
          <div className="pointer-events-none absolute -right-12 -top-12 h-96 w-96 overflow-hidden z-[1]">
            <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute right-12 top-12 h-44 w-44 rounded-full bg-amber-300/15 blur-2xl animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute right-16 top-16 h-36 w-36 animate-sun-rotate">
              <svg className="w-full h-full text-amber-300/20" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="50" r="20" />
                <path d="M50 0 L53 25 L47 25 Z M50 100 L53 75 L47 75 Z M0 50 L25 53 L25 47 Z M100 50 L75 53 L75 47 Z M15 15 L33 30 L27 35 Z M85 85 L67 70 L73 65 Z M85 15 L70 33 L65 27 Z M15 85 L30 67 L35 73 Z" />
              </svg>
            </div>
          </div>
        )}

        {/* Night Sapphire Starfield */}
        {skyConfig.period === "night" && !skyConfig.isRain && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
            <div className="absolute right-10 top-6 h-20 w-20 rounded-full bg-amber-100/15 blur-xl animate-pulse" style={{ animationDuration: '5s' }} />
            <div className="absolute right-14 top-8 h-10 w-10 rounded-full bg-amber-100/80 shadow-[0_0_20px_rgba(251,191,36,0.6)] border border-amber-200/40">
              <div className="absolute top-1 right-1 h-8 w-8 rounded-full bg-[#030712] opacity-80" />
            </div>

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

        {/* Realistic Animated Raindrops */}
        {skyConfig.isRain && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
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

        {/* Dynamic Fog / Mist Layer */}
        {skyConfig.isFog && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-35 z-[1]">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200/20 via-white/30 to-slate-200/20 blur-md animate-mist-drift" />
          </div>
        )}

        {/* ── 3. FOREGROUND GLASSMORPHIC TELEMETRY HUD ── */}
        <div className="relative z-10 p-5 sm:p-7 md:p-8">
          
          {/* Top Location & Live Status Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/20">
            {wl ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md text-white border border-white/30 shadow-md shrink-0">
                  <MapPin size={18} className="text-amber-300 animate-bounce" style={{ animationDuration: '3s' }} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
                    {wl.location.name || wl.location.district || 'Jaipur Municipal Corporation, India'}
                  </h3>
                  <p className="text-xs font-semibold text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] truncate">
                    Live weather near your farm
                  </p>
                </div>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-sm font-bold text-white">
                <MapPin size={16} className="shrink-0 animate-pulse text-amber-300" aria-hidden="true" />
                <span>{loadingCityText || t("home.weatherDetecting")}</span>
              </span>
            )}

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md px-3.5 py-1 text-xs font-black text-white border border-white/30 shadow-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                Live weather near you
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
              {/* Main Weather Display Showcase */}
              <div className="mt-5 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300 mb-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    <Sparkles size={14} className="text-amber-300 animate-spin-slow" />
                    <span>{t("home.weatherTitle") || "TODAY'S WEATHER"}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-4">
                    {/* Temperature Display */}
                    <span className="text-6xl sm:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-amber-200 drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
                      {formatTemp(wl.live.temp)}
                    </span>

                    {/* Condition Badge */}
                    <div className="inline-flex items-center gap-2.5 rounded-2xl bg-black/50 border border-white/35 px-4 py-2.5 backdrop-blur-md shadow-lg transition-transform hover:scale-105">
                      {(() => { 
                        const Icon = conditionIcon; 
                        return <Icon size={24} className="text-amber-300 shrink-0 animate-pulse" aria-hidden="true" />; 
                      })()}
                      <span className="text-lg font-extrabold text-white tracking-wide">
                        {wl.live.condition}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-white/90 font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Thermometer size={13} className="text-amber-400" />
                      Feels like <strong className="text-white">{formatTemp(wl.live.feelsLike)}</strong>
                    </span>
                    <span>·</span>
                    <span>Dew Point <strong className="text-white">{formatTemp(wl.live.dewPoint)}</strong></span>
                  </p>
                </div>

                {/* Quick Glass Metrics Cards (Right Side) */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/25 text-center shadow-lg transition-all hover:scale-105 hover:border-sky-400/50 group">
                    <CloudRain size={22} className="text-sky-300 mb-1 group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.daily?.[0]?.rainProbability ?? 0}%</span>
                    <span className="text-[11px] font-extrabold text-white/80 uppercase tracking-wider">Rain</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/25 text-center shadow-lg transition-all hover:scale-105 hover:border-teal-400/50 group">
                    <Droplets size={22} className="text-teal-200 mb-1 group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.live.humidity}%</span>
                    <span className="text-[11px] font-extrabold text-white/80 uppercase tracking-wider">Humidity</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/25 text-center shadow-lg transition-all hover:scale-105 hover:border-amber-400/50 group">
                    <Wind size={22} className="text-amber-200 mb-1 group-hover:scale-110 transition-transform" aria-hidden="true" />
                    <span className="text-base font-extrabold text-white">{wl.live.windSpeed} km/h</span>
                    <span className="text-[11px] font-extrabold text-white/80 uppercase tracking-wider">Wind</span>
                  </div>
                </div>
              </div>

              {/* High-Legibility Glass Advisory Box */}
              {interpretationLine && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-black/45 backdrop-blur-md p-4 border border-white/30 text-white shadow-xl transition-transform hover:scale-[1.01]">
                  <div className="flex-1 text-sm font-medium leading-relaxed text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {interpretationLine}
                  </div>
                </div>
              )}

              {/* Footer Row & CTA Button */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4">
                <span className="text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-2">
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

      {/* Embedded High-Performance CSS Animations */}
      <style>{`
        @keyframes sunRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rainFall {
          0% { transform: translateY(-30px) translateX(0px); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateY(220px) translateX(-20px); opacity: 0; }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes lightningFlash {
          0%, 92%, 100% { opacity: 0; }
          93%, 95% { opacity: 0.85; }
          94% { opacity: 0.3; }
        }
        @keyframes mistDrift {
          0% { transform: translateX(-10%); }
          100% { transform: translateX(10%); }
        }

        .animate-sun-rotate {
          animation: sunRotate 40s linear infinite;
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