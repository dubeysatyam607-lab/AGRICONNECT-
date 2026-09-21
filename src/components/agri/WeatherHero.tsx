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
  if (rainPct !== undefined && rainPct >= 55) return "Rain expected — delay harvest and spraying";
  if (c.includes("thunder")) return "Thunderstorm risk — keep machinery under cover";
  if (c.includes("sunny") && tempC !== undefined && tempC >= 40) return "Very hot — irrigate early morning or evening";
  if (c.includes("fog") || c.includes("mist")) return "Low visibility in the morning — plan spraying after 10 am";
  if (c.includes("rain") || c.includes("shower")) return "Showers expected — hold off on pesticide application";
  if (c.includes("partly") || c.includes("cloud")) return "Fair conditions for field work today";
  return tempC !== undefined && tempC >= 35 ? "Hot day — take breaks in shade while working" : "Good day for field work";
};

/**
 * Weather hero — a full-width live weather band that leads the home page.
 * The background follows the sky (dawn / noon / dusk / night) and condition
 * (rain / storm / fog / loo), so the page always feels like the farmer's day.
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
  const interpretationLine =
    interpretation ||
    (wl ? interpretWeather(wl.live.condition, wl.daily?.[0]?.rainProbability, wl.live.temp) : undefined);

  return (
    <section aria-labelledby="weather-heading" className="mt-6">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl text-white shadow-card pattern-green",
          wl ? bandClass(wl.live.condition, wl.live.temp) : "gradient-hero-noon",
        )}
      >
        {/* soft glow deco */}
        <span className="pointer-events-none absolute -top-14 -right-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        {showSun && (
          <Sun
            size={150}
            className="pointer-events-none absolute -right-8 -top-8 opacity-[0.08] rotate-12"
            aria-hidden="true"
          />
        )}

        <div className="relative p-5 md:p-6">
          {/* top row */}
          <div className="flex items-center gap-2">
            {(wl ? (
              <span className="flex min-w-0 items-center gap-1.5 type-small font-semibold text-white/90">
                <MapPin size={14} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{wl.location.district}, {wl.location.state}</span>
              </span>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5 type-small font-semibold text-white/90">
                <MapPin size={14} className="shrink-0 animate-pulse" aria-hidden="true" />
                <span className="truncate">{loadingCityText || t("home.weatherDetecting")}</span>
              </span>
            ))}
            <span className="ml-auto flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 type-label font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-live-pulse" aria-hidden="true" />
              {t("home.wxLive")}
            </span>
            <button
              onClick={onRefresh}
              disabled={refreshing || !wl}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/12 text-white transition-colors hover:bg-white/25 disabled:opacity-50"
              aria-label={refreshing ? t("home.fetchingWeather") : t("home.viewMore")}
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          {wl ? (
            <>
              {/* main block */}
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div className="animate-temp-pop">
                  <p className="type-meta font-bold uppercase tracking-[0.14em] text-white/75">
                    {t("home.weatherTitle")}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="font-display text-[52px] leading-none font-normal tracking-tight">
                      {formatTemp(wl.live.temp)}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                      {(() => { const Icon = conditionIcon; return <Icon size={22} aria-hidden="true" />; })()}
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] font-bold">{wl.live.condition}</p>
                  {interpretationLine && (
                    <p className="mt-2 max-w-[30rem] text-[14px] leading-relaxed text-white/85">
                      {interpretationLine}
                    </p>
                  )}
                </div>

                {/* metrics */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: CloudRain, label: t("home.rain", { pct: wl.daily?.[0]?.rainProbability ?? 0 }) },
                    { icon: Droplets, label: `${wl.live.humidity}%` },
                    { icon: Wind, label: interpolate(t("hero.wind"), { speed: wl.live.windSpeed }) },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <span
                        key={m.label}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/12 px-2.5 py-2 type-small font-semibold"
                      >
                        <Icon size={14} className="shrink-0" aria-hidden="true" />
                        {m.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* footer */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/15 pt-3">
                {wl.isOfflineCached && (
                  <span className="rounded-full bg-white/12 px-2.5 py-1 type-label font-bold text-white/80">
                    {t("agr127")}
                  </span>
                )}
                <button
                  onClick={onOpenDetails}
                  className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 type-small font-bold text-white transition-colors hover:bg-white/25"
                >
                  {t("home.openWeather")}
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : loading ? (
            <div className="mt-4">
              <div className="h-4 w-40 rounded bg-white/20 animate-pulse" />
              <div className="mt-3 h-12 w-28 rounded bg-white/20 animate-pulse" />
              <p className="mt-2 text-sm font-semibold text-white/80">
                {t("home.fetchingWeather")}
              </p>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5">
              <CloudRain size={15} className="text-white/70" aria-hidden="true" />
              <p className="text-[12.5px] font-semibold text-white/85">
                {t("home.weatherUnavailable")}
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={onRefresh}
                  className="rounded-lg bg-white/90 px-3.5 py-1.5 text-[12px] font-bold text-emerald-950 transition-colors hover:bg-white"
                >
                  {t("home.retryWeather")}
                </button>
                <button
                  onClick={onOpenLocation}
                  className="rounded-lg bg-white/15 px-3.5 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-white/25"
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