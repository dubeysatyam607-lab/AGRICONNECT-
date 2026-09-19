import React from 'react';
import { Droplets, Sun, Wind, Gauge, Sunrise, Sunset } from 'lucide-react';
import { ILiveWeather } from '../../domain/models/WeatherModels';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';

interface WeatherMetricsGridProps {
  live: ILiveWeather;
  formatTemp: (celsius: number) => string;
  rainProbability?: number;
}

interface MetricTileProps {
  label: string;
  value: React.ReactNode;
  hint: React.ReactNode;
  icon: React.ReactNode;
  bar?: { pct: number; className?: string } | null;
  footer?: React.ReactNode;
}

const MetricTile: React.FC<MetricTileProps> = ({ label, value, hint, icon, bar, footer }) => (
  <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2">
      <span className="type-label text-muted-foreground">{label}</span>
      <span className="text-muted-foreground" aria-hidden="true">{icon}</span>
    </div>
    <div>
      <div className="type-h1 type-num leading-none">{value}</div>
      <p className="type-meta mt-1.5 leading-snug">{hint}</p>
    </div>
    {bar && (
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar.className || 'bg-primary'}`} style={{ width: `${bar.pct}%` }} />
      </div>
    )}
    {footer && <div className="type-meta text-muted-foreground pt-2 border-t border-border mt-auto">{footer}</div>}
  </div>
);

/**
 * Detailed environmental metrics for farm decisions.
 */
export const WeatherMetricsGrid: React.FC<WeatherMetricsGridProps> = ({ live, formatTemp, rainProbability }) => {
  const { t } = useLanguage();
  const rainProb =
    typeof rainProbability === 'number' && Number.isFinite(rainProbability)
      ? Math.min(100, Math.max(0, Math.round(rainProbability)))
      : null;

  const getUvLevel = (uv: number) => {
    if (uv <= 2) return { label: t('wth.uvLow'), className: 'text-primary' };
    if (uv <= 5) return { label: t('wth.uvMod'), className: 'text-amber-600 dark:text-amber-400' };
    if (uv <= 7) return { label: t('wth.uvHigh'), className: 'text-orange-600 dark:text-orange-400' };
    if (uv <= 10) return { label: t('wth.uvVHigh'), className: 'text-destructive' };
    return { label: t('wth.uvExtreme'), className: 'text-destructive' };
  };
  const uvVal = typeof live?.uvIndex === 'number' ? live.uvIndex : 0;
  const uvLevel = getUvLevel(uvVal);

  const pressure = typeof live?.pressureHpa === 'number' ? live.pressureHpa : null;
  const pressureTrendLabel =
    live.pressureTrend === 'Rising' ? t('wth.rising') : live.pressureTrend === 'Falling' ? t('wth.falling') : t('wth.steady');
  const pressureTrendClass =
    live.pressureTrend === 'Rising' ? 'text-primary' : live.pressureTrend === 'Falling' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400';
  const pressureArrow = live.pressureTrend === 'Rising' ? '↗' : live.pressureTrend === 'Falling' ? '↘' : '→';

  const progressPercent = typeof live?.daylightProgressPercent === 'number' ? live.daylightProgressPercent : 50;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <MetricTile
        label={t('wth.rainChance')}
        icon={<Droplets size={16} />}
        value={rainProb != null ? `${rainProb}%` : '—'}
        hint={rainProb == null ? t('wth.dataUnavailable') : rainProb >= 50 ? t('wth.rainfallExpected') : t('wth.precipUnlikely')}
        bar={{ pct: rainProb != null ? rainProb : 0, className: 'bg-sky-500' }}
      />

      <MetricTile
        label={t('wth.uvIndex')}
        icon={<Sun size={16} />}
        value={
          <span className="flex items-baseline gap-1.5">
            {uvVal > 0 ? uvVal : '—'}
            <span className={`type-meta font-semibold ${uvVal > 0 ? uvLevel.className : 'text-muted-foreground'}`}>
              {uvVal > 0 ? uvLevel.label : t('wth.uvNa')}
            </span>
          </span>
        }
        hint={uvVal > 0 ? (uvVal >= 6 ? t('wth.uvProtection') : t('wth.uvSafe')) : t('wth.uvNotMeasured')}
        footer={<span className="flex justify-between"><span>0 ({t('wth.uvLow')})</span><span>11+ ({t('wth.uvExtreme')})</span></span>}
      />

      <MetricTile
        label={t('wth.windDirection')}
        icon={<Wind size={16} />}
        value={
          <span className="flex items-baseline gap-1.5">
            {live.windSpeed}
            <span className="type-meta text-muted-foreground font-semibold">{t('wth.kmh')}</span>
          </span>
        }
        hint={
          <>
            {t('wth.direction')} <strong className="text-foreground">{live.windDirection} ({live.windDegrees}°)</strong>
          </>
        }
        footer={live.windSpeed <= 15 ? t('wth.goodSpray') : t('wth.tooWindy')}
      />

      <MetricTile
        label={t('wth.humidity')}
        icon={<Droplets size={16} />}
        value={`${live.humidity}%`}
        hint={
          <>
            {t('wth.dewPointLabel')} <strong className="text-foreground">{formatTemp(live.dewPoint)}</strong>
          </>
        }
        bar={{ pct: live.humidity, className: 'bg-sky-500' }}
      />

      <MetricTile
        label={t('wth.barometer')}
        icon={<Gauge size={16} />}
        value={
          <span className="flex items-baseline gap-1.5">
            {pressure != null ? pressure : '—'}
            <span className="type-meta text-muted-foreground font-semibold">{t('wth.hpa')}</span>
          </span>
        }
        hint={
          <>
            {t('wth.trend')} <strong className={pressureTrendClass}>{pressureTrendLabel} {pressureArrow}</strong>
          </>
        }
        footer={<span className="flex justify-between"><span>980 hPa</span><span>1040 hPa</span></span>}
      />

      <MetricTile
        label={t('wth.sunTrajectory')}
        icon={
          <span className="flex items-center gap-1">
            <Sunrise size={14} />
            <Sunset size={14} />
          </span>
        }
        value={`${progressPercent}%`}
        hint={interpolate(t('wth.daylight'), { pct: live.daylightProgressPercent })}
        bar={{ pct: Math.min(100, Math.max(0, progressPercent)), className: 'bg-amber-500' }}
        footer={
          <span className="flex justify-between">
            <span>Sunrise {live.sunriseTime || '—'}</span>
            <span>Sunset {live.sunsetTime || '—'}</span>
          </span>
        }
      />
    </div>
  );
};
