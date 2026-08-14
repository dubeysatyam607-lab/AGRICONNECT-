import React, { useMemo } from "react";
import {
  MapPin, Sun, Droplets, Wind, Cloud, Bot, ChevronRight, Sparkles, Moon,
} from "lucide-react";
import type { IWeatherModuleData } from "@/features/weather/domain/models/WeatherModels";
import { useLanguage } from "@/contexts/LanguageContext";
import { interpolate } from "@/i18n/journey";

type Period = "dawn" | "morning" | "noon" | "dusk" | "night";
type WeatherKind = "clear" | "cloudy" | "rain" | "storm" | "fog" | "hot";

interface DynamicHeroProps {
  greeting: string;
  firstName: string;
  dateStr: string;
  liveCity: string;
  farmLabel: string;
  cropLine: string;
  wl: IWeatherModuleData | null;
  weatherStatus?: 'loading' | 'ready' | 'error';
  formatTemp: (celsius: number) => string;
  condEmoji: (condition?: string) => string;
  onGo: (tab: string) => void;
}

/**
 * Time-of-day + weather-adaptive hero.
 * The gradient and animated atmosphere (sun, clouds, rain, storm, stars, mist, heat)
 * change with the current hour and live weather condition — the content stays identical.
 */
const DynamicHero: React.FC<DynamicHeroProps> = ({
  greeting, firstName, dateStr, liveCity, farmLabel, cropLine,
  wl, weatherStatus = 'loading', formatTemp, condEmoji, onGo,
}) => {
  const { t } = useLanguage();
  const hour = new Date().getHours();
  const period: Period =
    hour >= 5 && hour < 7 ? "dawn"
      : hour >= 7 && hour < 12 ? "morning"
        : hour >= 12 && hour < 16 ? "noon"
          : hour >= 16 && hour < 19 ? "dusk"
            : "night";

  const cond = wl?.live?.condition || "";
  const kind: WeatherKind =
    cond.includes("Thunder") ? "storm"
      : cond.includes("Rain") || cond.includes("Monsoon") ? "rain"
        : cond === "Overcast" || cond.includes("Cloudy") ? "cloudy"
          : cond.includes("Fog") || cond.includes("Mist") ? "fog"
            : cond.includes("Loo") ? "hot"
              : "clear";

  const isDay = period === "morning" || period === "noon" || period === "dawn" || period === "dusk";
  const isNight = period === "night";

  const bgClass =
    kind === "storm" ? "gradient-hero-storm"
      : kind === "rain" ? "gradient-hero-rain"
        : kind === "fog" ? "gradient-hero-fog"
          : kind === "hot" ? "gradient-hero-hot"
            : period === "dawn" ? "gradient-hero-dawn"
              : period === "noon" ? "gradient-hero-noon"
                : period === "dusk" ? "gradient-hero-dusk"
                  : period === "night" ? "gradient-hero-night"
                    : "gradient-hero";

  // Deterministic particles — stable across re-renders, no layout thrash.
  const particles = useMemo(() => {
    const make = (n: number) =>
      Array.from({ length: n }).map((_, i) => ({
        left: (i * 37 + 11) % 92,
        delay: (i % 6) * 0.35,
        duration: 0.9 + (i % 4) * 0.28,
      }));
    const stars = Array.from({ length: 10 }).map((_, i) => ({
      left: (i * 41 + 7) % 94,
      top: (i * 29 + 9) % 42,
      delay: (i % 5) * 0.6,
      duration: 2.2 + (i % 4) * 0.7,
      size: 2 + (i % 3),
    }));
    return { rain: make(12), stars };
  }, []);

  const renderAtmosphere = () => {
    if (!wl) return null;

    const showSun = isDay && (kind === "clear" || kind === "hot" || period === "dawn" || period === "noon");
    const showClouds = isDay && (period === "noon" || period === "morning" || kind === "cloudy");
    const showRain = kind === "rain" || kind === "storm";
    const showStorm = kind === "storm";
    const showMist = kind === "fog";
    const showHeat = kind === "hot" && isDay;

    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]" aria-hidden="true">
        {/* Sun / Moon */}
        {showSun && (
          <span className="absolute -top-4 right-10 text-4xl select-none animate-sun-pulse drop-shadow-[0_0_30px_rgba(251,191,36,0.55)]">
            <Sun size={44} strokeWidth={1.5} className="text-amber-300/90" fill="currentColor" />
          </span>
        )}
        {isNight && (
          <>
            <span className="absolute top-4 right-10 text-4xl select-none animate-float">
              <Moon size={36} strokeWidth={1.5} className="text-amber-100/90" fill="currentColor" />
            </span>
            {particles.stars.map((s, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-white animate-twinkle"
                style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
              />
            ))}
          </>
        )}

        {/* Drifting clouds */}
        {showClouds && (
          <>
            <span className="absolute -top-1 right-28 text-2xl select-none animate-cloud-slow opacity-80">☁️</span>
            <span className="absolute top-8 right-4 text-lg select-none animate-cloud-fast opacity-60">☁️</span>
          </>
        )}

        {/* Rain streaks */}
        {showRain && (
          <div className="absolute inset-x-0 top-0 bottom-0">
            {particles.rain.map((r, i) => (
              <span
                key={i}
                className="absolute top-[-12px] w-[2px] rounded-full bg-white/55 animate-rain-drop"
                style={{ left: `${r.left}%`, height: 14, animationDelay: `${r.delay}s`, animationDuration: `${r.duration}s` }}
              />
            ))}
          </div>
        )}

        {/* Lightning flash (storm only) */}
        {showStorm && (
          <span className="absolute inset-0 bg-white/30 animate-lightning-flash" />
        )}

        {/* Mist layers */}
        {showMist && (
          <>
            <span className="absolute bottom-8 -left-6 h-16 w-64 rounded-full bg-white/15 blur-2xl animate-mist-drift" />
            <span className="absolute bottom-2 right-2 h-14 w-56 rounded-full bg-white/10 blur-2xl animate-mist-drift" style={{ animationDelay: "4s" }} />
          </>
        )}

        {/* Heat shimmer blobs */}
        {showHeat && (
          <>
            <span className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-amber-200/20 blur-2xl animate-drift-soft" />
            <span className="absolute -bottom-6 left-8 h-32 w-32 rounded-full bg-red-300/15 blur-2xl animate-breathe" />
          </>
        )}
      </div>
    );
  };

  return (
    <section className="px-4 reveal" aria-label={t("hero.greeting")}>
      <div className={`relative overflow-hidden rounded-[30px] ${bgClass} text-primary-foreground px-5 pt-5 pb-6 shadow-colorful`}>
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-secondary/25 blur-2xl animate-drift-soft" />
        <div className="absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-emerald-300/20 blur-3xl animate-breathe" />
        <span className="absolute bottom-2 right-2 text-6xl opacity-20 select-none animate-wave-wheat" aria-hidden="true">🌾</span>

        {renderAtmosphere()}

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="feature-chip bg-white/10 text-primary-foreground">
              <MapPin size={12} className="text-secondary" /> {liveCity}
            </span>
            <span className="feature-chip bg-white/10 text-primary-foreground">
              <span aria-hidden="true">🌱</span> {farmLabel}
            </span>
          </div>

          <h1 className="font-display font-semibold text-[30px] leading-[1.08] tracking-tight mt-4">
            {greeting},<br />{firstName} 👋
          </h1>
          <p className="text-[13px] text-primary-foreground/80 mt-2 flex items-center gap-1.5">
            <Sparkles size={13} className="text-secondary shrink-0" />
            {dateStr} · {cropLine}
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {wl ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                  <Sun size={13} className="text-secondary" /> {formatTemp(wl.live.temp)} · {condEmoji(wl.live.condition)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                  <Droplets size={13} className="text-secondary" /> {interpolate(t("hero.humidity"), { pct: wl.live.humidity })}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                  <Wind size={13} className="text-secondary" /> {interpolate(t("hero.wind"), { speed: wl.live.windSpeed })}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                {weatherStatus === 'loading' ? (
                  <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Cloud size={13} className="text-white/80" />
                )} {weatherStatus === 'loading' ? t("hero.detecting") : t("hero.weatherUnavailable")}
              </span>
            )}
          </div>

          <button
            onClick={() => onGo("ai-chat")}
            className="group mt-5 flex w-full items-center justify-between rounded-2xl gradient-ai text-white px-4 py-3.5 shadow-colorful hover-lift"
          >
            <span className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <Bot size={18} />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-secondary animate-live-pulse" />
              </span>
              <span className="text-left">
                <span className="block text-[13px] font-bold">{t("hero.whatToday")}</span>
                <span className="block text-[11px] font-semibold text-white/75">{t("hero.askKisan")}</span>
              </span>
            </span>
            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default DynamicHero;
