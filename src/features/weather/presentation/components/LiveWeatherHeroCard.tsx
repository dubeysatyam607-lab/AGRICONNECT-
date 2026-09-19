import React from 'react';
import { MapPin, RefreshCw, ChevronRight, Wind, Droplets, Sun, Gauge } from 'lucide-react';
import { ILiveWeather, IWeatherLocation } from '../../domain/models/WeatherModels';
import { useLanguage } from '@/contexts/LanguageContext';

interface LiveWeatherHeroCardProps {
  live: ILiveWeather;
  location: IWeatherLocation;
  formatTemp: (celsius: number) => string;
  onRefresh: () => void;
  onOpenDetails: () => void;
  refreshing: boolean;
  isFahrenheit: boolean;
  onToggleUnit: () => void;
}

/**
 * Current weather summary card.
 * Leads with the interpretation, keeps the reading as quiet metadata.
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
}) => {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0 type-small text-muted-foreground">
          <MapPin size={14} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{location.name}</span>
          <span className="truncate">· {location.state}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title={t('wth.refresh')}
            aria-label={t('wth.refresh')}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onToggleUnit}
            className="h-9 px-3 rounded-lg border border-border type-small font-semibold text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle temperature unit"
          >
            {isFahrenheit ? '°F' : '°C'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="type-display type-num">{formatTemp(live.temp)}</div>
          <div className="type-h3 mt-1">{live.condition}</div>
          <p className="type-small text-muted-foreground mt-1">
            {t('wth.feels')} {formatTemp(live.feelsLike)}
            <span className="mx-1.5">·</span>
            {t('wth.dewPoint')} {formatTemp(live.dewPoint)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-border">
        <div className="flex flex-col items-center text-center gap-0.5">
          <Droplets size={14} className="text-muted-foreground" aria-hidden="true" />
          <span className="type-label text-muted-foreground">{t('wth.humid')}</span>
          <span className="type-small font-semibold type-num">{live.humidity}%</span>
        </div>
        <div className="flex flex-col items-center text-center gap-0.5">
          <Wind size={14} className="text-muted-foreground" aria-hidden="true" />
          <span className="type-label text-muted-foreground">{t('wth.wind')}</span>
          <span className="type-small font-semibold type-num">{live.windSpeed} km/h</span>
        </div>
        <div className="flex flex-col items-center text-center gap-0.5">
          <Sun size={14} className="text-muted-foreground" aria-hidden="true" />
          <span className="type-label text-muted-foreground">{t('wth.uv')}</span>
          <span className="type-small font-semibold type-num">{live.uvIndex}</span>
        </div>
        <div className="flex flex-col items-center text-center gap-0.5">
          <Gauge size={14} className="text-muted-foreground" aria-hidden="true" />
          <span className="type-label text-muted-foreground">{t('wth.pressure')}</span>
          <span className="type-small font-semibold type-num">{live.pressureHpa !== null ? live.pressureHpa : '—'}</span>
        </div>
      </div>

      {live.conditionDescription && (
        <button
          onClick={onOpenDetails}
          className="mt-4 w-full flex items-center justify-between gap-2 pt-3 border-t border-border type-small text-left text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="line-clamp-1">{live.conditionDescription}</span>
          <span className="flex items-center gap-0.5 shrink-0 font-semibold">
            {t('wth.details')}
            <ChevronRight size={14} />
          </span>
        </button>
      )}
    </div>
  );
};
