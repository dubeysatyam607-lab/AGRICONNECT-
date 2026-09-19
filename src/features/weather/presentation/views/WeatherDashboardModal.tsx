import React, { useEffect, useRef } from 'react';
import { X, ShieldAlert, Sprout } from 'lucide-react';
import { IWeatherModuleData } from '../../domain/models/WeatherModels';
import { LiveWeatherHeroCard } from '../components/LiveWeatherHeroCard';
import { HourlyForecastTimeline } from '../components/HourlyForecastTimeline';
import { SevenDayForecastCard } from '../components/SevenDayForecastCard';
import { WeatherMetricsGrid } from '../components/WeatherMetricsGrid';
import { useFarm } from '@/contexts/FarmContext';
import { deriveFarmAdvice } from '@/lib/farm-advisor';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';

interface WeatherDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: IWeatherModuleData;
  formatTemp: (celsius: number) => string;
  onRefresh: () => void;
  refreshing: boolean;
  isFahrenheit: boolean;
  onToggleUnit: () => void;
}

/**
 * Enterprise Google Weather Inspired Dashboard Modal.
 * Unites the Live Hero Card, 24-Hour Timeline, 6-Card Sensor Grid, and 7-Day Agricultural Forecast in a clean modal drawer.
 */
export const WeatherDashboardModal: React.FC<WeatherDashboardModalProps> = ({
  isOpen,
  onClose,
  data,
  formatTemp,
  onRefresh,
  refreshing,
  isFahrenheit,
  onToggleUnit,
}) => {
  const { t } = useLanguage();
  const { profile } = useFarm();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !data) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, data, onClose]);

  if (!isOpen) return null;

  if (!data) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" role="dialog" aria-modal="true" aria-label={t('wth.title')} onClick={onClose}>
        <div className="bg-card border border-border w-full max-w-3xl sm:rounded-xl rounded-t-xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="type-small text-muted-foreground mt-4">{t('wth.loading') || 'Loading weather data…'}</p>
        </div>
      </div>
    );
  }

  const farm = deriveFarmAdvice(profile, data);
  const today = data.daily?.[0];
  const rainPct = today?.rainProbability;

  const scrollToForecast = () => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" role="dialog" aria-modal="true" aria-label={t('wth.title')} onClick={onClose}>
      <div ref={bodyRef} className="bg-card border border-border w-full max-w-3xl max-h-[92vh] sm:rounded-xl rounded-t-xl overflow-y-auto no-scrollbar flex flex-col">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-card px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sprout size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 className="type-h2 leading-tight">
                {t('wth.title')}
              </h2>
              <p className="type-meta">
                {interpolate(t('wth.lastUpdated'), { time: new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
                {data.isOfflineCached && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 px-2 py-0.5 font-semibold">
                    {t('wth.estimated')}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label={t('wth.closeAria')}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              title={t('wth.closeTitle')}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-5">
          
          {/* Critical Agro-Advisory Banner (if active) */}
          {data.advisoryAlert && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-3">
              <ShieldAlert size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <h4 className="type-label text-amber-700 dark:text-amber-300 mb-0.5">
                  {t('wth.advisory')}
                </h4>
                <p className="type-small text-foreground">
                  {data.advisoryAlert.message}
                </p>
              </div>
            </div>
          )}

          {/* Today's Farm Plan — crop-aware action strip */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="type-label text-muted-foreground flex items-center gap-1.5">
                <Sprout size={13} aria-hidden="true" />
                {t('wth.todaysPlan')} · {profile.crop} · {profile.stage}
              </h4>
              {rainPct != null && (
                <span
                  className={cn(
                    "type-label rounded px-2 py-1 border",
                    rainPct >= 40
                      ? "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/25"
                      : "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25"
                  )}
                >
                  {interpolate(t('wth.rain'), { pct: Math.round(rainPct) })}
                </span>
              )}
            </div>
            <p className="type-h3 leading-snug">{farm.heroLine}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {farm.items.slice(0, 4).map((it, i) => (
                <div key={i} className="rounded-lg bg-muted/50 border border-border p-2.5">
                  <p className="type-small font-semibold text-foreground">{it.title}</p>
                  <p className="type-meta mt-0.5 leading-snug">{it.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 1. Live Weather Hero Card */}
          <LiveWeatherHeroCard
            live={data.live}
            location={data.location}
            formatTemp={formatTemp}
            onRefresh={onRefresh}
            onOpenDetails={scrollToForecast}
            refreshing={refreshing}
            isFahrenheit={isFahrenheit}
            onToggleUnit={onToggleUnit}
          />

          {/* 2. 24-Hour Forecast Timeline */}
          <HourlyForecastTimeline
            hourly={data.hourly}
            formatTemp={formatTemp}
          />

          {/* 3. CRED/Apple Inspired 6-Card Sensor Grid */}
          <WeatherMetricsGrid
            live={data.live}
            formatTemp={formatTemp}
            rainProbability={today?.rainProbability}
          />

          {/* 4. 7-Day Agricultural Outlook */}
          <SevenDayForecastCard
            daily={data.daily}
            formatTemp={formatTemp}
          />

          {/* Bottom Footer Info */}
          <div className="pt-2 pb-6 text-center text-muted-foreground type-meta space-y-1">
            <p>{t('wth.footerData')}</p>
            <p>{t('wth.footerPerf')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
