import React, { useMemo } from 'react';
import {
  MapPin,
  RefreshCw,
  ChevronRight,
  Wind,
  Droplets,
  Sun,
  Gauge,
  Eye,
  Thermometer,
  CloudRain,
  CloudLightning,
  CloudFog,
  Moon,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ILiveWeather, IWeatherLocation } from '../../domain/models/WeatherModels';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAtmosphericTheme } from '@/components/agri/WeatherHero';

interface LiveWeatherHeroCardProps {
  live: ILiveWeather;
  location: IWeatherLocation;
  formatTemp: (celsius: number) => string;
  onRefresh: () => void;
  onOpenDetails?: () => void;
  refreshing: boolean;
  isFahrenheit: boolean;
  onToggleUnit: () => void;
  timeOfDayLabel?: string;
}

const getWeatherIcon = (cond?: string) => {
  const c = (cond || '').toLowerCase();
  if (c.includes('thunder') || c.includes('storm')) return CloudLightning;
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return CloudRain;
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return CloudFog;
  if (c.includes('night') || c.includes('clear')) return Moon;
  return Sun;
};

/**
 * Premium Photorealistic Agriculture Live Weather Card.
 * Blends real high-resolution farm imagery with dynamic solar/weather atmospheric gradient overlays,
 * animated ambient light shimmers, and crisp high-contrast glassmorphic metrics.
 */
export const LiveWeatherHeroCard: React.FC<LiveWeatherHeroCardProps> = ({
  live,
  location,
  formatTemp,
  onRefresh,
  onOpenDetails,
  refreshing,
  isFahrenheit,
  onToggleUnit,
  timeOfDayLabel = 'Daytime',
}) => {
  const { t } = useLanguage();
  const theme = useMemo(() => getAtmosphericTheme(live.condition, live.temp), [live.condition, live.temp]);
  const WeatherIcon = useMemo(() => getWeatherIcon(live.condition), [live.condition]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/30 dark:border-white/20 shadow-2xl transition-all duration-700 p-5 sm:p-7 text-white">
      {/* ── 1. PHOTOREALISTIC FARM SCENERY BACKDROP ───────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center filter contrast-110 brightness-95 scale-105 transition-all duration-1000 pointer-events-none"
        style={{ backgroundImage: `url(${theme.photoSrc})` }}
      />

      {/* ── 2. DYNAMIC ATMOSPHERIC TIME-OF-DAY GRADIENT OVERLAY ───────────────── */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${theme.gradientOverlay} transition-all duration-1000 pointer-events-none`}
      />

      {/* ── 3. ANIMATED AMBIENT ATMOSPHERIC EFFECTS ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Solar Flare / Ambient Light Ring */}
        {theme.isSunny && (
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-amber-400/20 blur-3xl animate-pulse duration-[4000ms]" />
        )}
        {/* Monsoon Rain animation overlay */}
        {theme.isRain && (
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-25 animate-ping duration-[3000ms]" />
        )}
        {/* Thunderstorm Flash */}
        {theme.isStorm && (
          <div className="absolute inset-0 bg-indigo-500/10 animate-pulse duration-[1500ms]" />
        )}
      </div>

      {/* ── 4. FOREGROUND CONTENT OVERLAY ────────────────────────────────────── */}
      <div className="relative z-10 space-y-5">
        {/* Top Header: Location & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/25">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 dark:bg-black/30 backdrop-blur-md text-emerald-300 border border-white/30 flex items-center justify-center shrink-0 shadow-sm">
              <MapPin size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-white truncate drop-shadow-md">
                {location.name || 'Jaipur Municipal Corporation'}
              </h3>
              <p className="text-xs text-emerald-100/90 truncate font-medium flex items-center gap-1.5">
                <span>{location.state || 'Rajasthan'}, India</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border border-white/20">
                  <Sparkles size={10} className="text-amber-300" />
                  {theme.themeLabel}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleUnit}
              className="h-8 px-3 rounded-xl border border-white/30 bg-white/15 dark:bg-black/40 backdrop-blur-md text-xs font-bold text-white hover:bg-white/25 transition-colors shadow-sm"
              aria-label="Toggle temperature unit"
            >
              {isFahrenheit ? '°F' : '°C'}
            </button>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="h-8 px-3.5 rounded-xl border border-white/30 bg-white/15 dark:bg-black/40 backdrop-blur-md text-xs font-bold text-white hover:bg-white/25 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              title={t('wth.refresh')}
              aria-label={t('wth.refresh')}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-300' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Main Temperature & Condition Showcase */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 py-2">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-amber-300 shrink-0 shadow-lg">
              <WeatherIcon size={36} className="filter drop-shadow" />
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-lg">
                  {formatTemp(live.temp)}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-300 drop-shadow-md">
                  {live.condition}
                </span>
              </div>

              <p className="text-xs text-emerald-100/90 mt-1 font-medium flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Thermometer size={13} className="text-amber-300" />
                  Feels like <strong className="text-white font-bold">{formatTemp(live.feelsLike)}</strong>
                </span>
                <span>•</span>
                <span>Dew Point <strong className="text-white font-bold">{formatTemp(live.dewPoint)}</strong></span>
              </p>
            </div>
          </div>

          <div className="sm:text-right space-y-1.5 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-xs font-bold shadow-sm backdrop-blur-md">
              <Zap size={13} className="text-amber-300" />
              {live.windSpeed > 15 ? 'High Wind Alert' : 'Good Field Operations Weather'}
            </div>
            <p className="text-xs text-emerald-100/80 font-semibold">
              Wind: {live.windSpeed} km/h {live.windDirection}
            </p>
          </div>
        </div>

        {/* Dynamic Glassmorphic Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/20">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 dark:bg-black/30 border border-white/20 backdrop-blur-md shadow-sm hover:bg-white/15 transition-colors">
            <Droplets size={18} className="text-sky-300 shrink-0" />
            <div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-bold block">Humidity</span>
              <span className="text-sm font-black text-white">{live.humidity}%</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 dark:bg-black/30 border border-white/20 backdrop-blur-md shadow-sm hover:bg-white/15 transition-colors">
            <Wind size={18} className="text-emerald-300 shrink-0" />
            <div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-bold block">Wind Speed</span>
              <span className="text-sm font-black text-white">{live.windSpeed} km/h</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 dark:bg-black/30 border border-white/20 backdrop-blur-md shadow-sm hover:bg-white/15 transition-colors">
            <Sun size={18} className="text-amber-300 shrink-0" />
            <div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-bold block">UV Index</span>
              <span className="text-sm font-black text-white">{live.uvIndex}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 dark:bg-black/30 border border-white/20 backdrop-blur-md shadow-sm hover:bg-white/15 transition-colors">
            <Gauge size={18} className="text-teal-300 shrink-0" />
            <div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-200/80 font-bold block">Pressure</span>
              <span className="text-sm font-black text-white">{live.pressureHpa ? `${live.pressureHpa} hPa` : '1012 hPa'}</span>
            </div>
          </div>
        </div>

        {/* Condition details footer link if provided */}
        {live.conditionDescription && onOpenDetails && (
          <button
            onClick={onOpenDetails}
            className="w-full flex items-center justify-between gap-2 pt-3 border-t border-white/20 text-xs text-emerald-100/90 hover:text-white transition-colors font-medium"
          >
            <span className="line-clamp-1 text-left">{live.conditionDescription}</span>
            <span className="flex items-center gap-1 shrink-0 font-bold text-emerald-300 bg-white/10 px-3 py-1 rounded-xl border border-white/20 hover:bg-white/20">
              View Forecast Details
              <ChevronRight size={14} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

