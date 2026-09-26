import React from 'react';
import { MapPin, RefreshCw, ChevronRight, Wind, Droplets, Sun, Gauge, Eye, Thermometer, Compass } from 'lucide-react';
import { ILiveWeather, IWeatherLocation } from '../../domain/models/WeatherModels';
import { useLanguage } from '@/contexts/LanguageContext';

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

/**
 * Premium Agriculture Live Weather Summary Card.
 * High-contrast, clean visual hierarchy designed for farmer legibility over realistic field environments.
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

  return (
    <div className="rounded-2xl border border-white/20 dark:border-border bg-card/85 dark:bg-card/90 backdrop-blur-md p-5 sm:p-6 shadow-card transition-all">
      {/* Location & Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MapPin size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">
              {location.name || 'Jaipur Municipal Corporation'}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate font-medium">
              {location.state || 'Rajasthan'}, India · Live weather near your farm ({timeOfDayLabel})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleUnit}
            className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle temperature unit"
          >
            {isFahrenheit ? '°F' : '°C'}
          </button>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="h-8 px-3 rounded-lg border border-border bg-background text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title={t('wth.refresh')}
            aria-label={t('wth.refresh')}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-primary' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Temperature & Condition Showcase */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-black tracking-tight text-foreground">
              {formatTemp(live.temp)}
            </span>
            <span className="text-xl font-bold text-primary">
              {live.condition}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1.5 font-medium flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Thermometer size={13} className="text-amber-500" />
              Feels like <strong className="text-foreground">{formatTemp(live.feelsLike)}</strong>
            </span>
            <span>·</span>
            <span>Dew Point <strong className="text-foreground">{formatTemp(live.dewPoint)}</strong></span>
          </p>
        </div>

        <div className="sm:text-right space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <Sun size={13} /> High Solar Radiation
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            Wind: {live.windSpeed} km/h {live.windDirection}
          </p>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-border/60">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <Droplets size={16} className="text-sky-500 shrink-0" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">Humidity</span>
            <span className="text-sm font-bold text-foreground">{live.humidity}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <Wind size={16} className="text-indigo-500 shrink-0" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">Wind Speed</span>
            <span className="text-sm font-bold text-foreground">{live.windSpeed} km/h</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <Sun size={16} className="text-amber-500 shrink-0" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">UV Index</span>
            <span className="text-sm font-bold text-foreground">{live.uvIndex}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <Gauge size={16} className="text-emerald-500 shrink-0" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">Pressure</span>
            <span className="text-sm font-bold text-foreground">{live.pressureHpa ? `${live.pressureHpa} hPa` : '1012 hPa'}</span>
          </div>
        </div>
      </div>

      {live.conditionDescription && onOpenDetails && (
        <button
          onClick={onOpenDetails}
          className="mt-4 w-full flex items-center justify-between gap-2 pt-3 border-t border-border/60 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          <span className="line-clamp-1 text-left">{live.conditionDescription}</span>
          <span className="flex items-center gap-0.5 shrink-0 font-bold text-primary">
            View Forecast Details
            <ChevronRight size={14} />
          </span>
        </button>
      )}
    </div>
  );
};
