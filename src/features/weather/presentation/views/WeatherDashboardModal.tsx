import React, { useEffect, useRef } from 'react';
import { X, ShieldAlert, Sprout } from 'lucide-react';
import { IWeatherModuleData } from '../../domain/models/WeatherModels';
import { LiveWeatherHeroCard } from '../components/LiveWeatherHeroCard';
import { CropWeatherActionFlow } from '../components/CropWeatherActionFlow';
import { HourlyForecastTimeline } from '../components/HourlyForecastTimeline';
import { SevenDayForecastCard } from '../components/SevenDayForecastCard';
import { WeatherMetricsGrid } from '../components/WeatherMetricsGrid';
import { FarmWeatherEnvironment } from '../components/FarmWeatherEnvironment';
import { useFarm } from '@/contexts/FarmContext';
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
 * Enterprise Agriculture Weather Modal Drawer.
 * Unites the Farm Weather Environment, Live Hero Card, Crop Action Flow, 24-Hour Timeline, Sensor Grid, and 7-Day Outlook.
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
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t('wth.title')} onClick={onClose}>
        <div className="bg-card border border-border w-full max-w-3xl sm:rounded-2xl rounded-t-2xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-muted-foreground mt-4">{t('wth.loading') || 'Loading weather data…'}</p>
        </div>
      </div>
    );
  }

  const today = data.daily?.[0];
  const rainPct = today?.rainProbability ?? 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t('wth.title')} onClick={onClose}>
      <div
        ref={bodyRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border w-full max-w-3xl max-h-[92vh] sm:rounded-2xl rounded-t-2xl overflow-y-auto no-scrollbar flex flex-col shadow-2xl relative"
      >
        <FarmWeatherEnvironment
          condition={data.live.condition}
          temperature={data.live.temp}
          windSpeed={data.live.windSpeed}
          humidity={data.live.humidity}
          rainProbability={rainPct}
          sunriseTime={data.live.sunriseTime}
          sunsetTime={data.live.sunsetTime}
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-md px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Sprout size={18} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground leading-tight flex items-center gap-2">
                  Live Farm Weather
                  {data.isOfflineCached && (
                    <span className="inline-flex items-center rounded bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold">
                      {t('wth.estimated')}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {interpolate(t('wth.lastUpdated'), { time: new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label={t('wth.closeAria')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
              title={t('wth.closeTitle')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-4 sm:p-6 space-y-5">
            {/* Agro-Advisory Alert Banner if active */}
            {data.advisoryAlert && (
              <div className="p-4 bg-amber-500/15 backdrop-blur-md border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200">
                <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5">
                    {t('wth.advisory')}
                  </h4>
                  <p className="text-xs font-medium leading-relaxed">
                    {data.advisoryAlert.message}
                  </p>
                </div>
              </div>
            )}

            {/* 1. Live Weather Hero Card */}
            <LiveWeatherHeroCard
              live={data.live}
              location={data.location}
              formatTemp={formatTemp}
              onRefresh={onRefresh}
              refreshing={refreshing}
              isFahrenheit={isFahrenheit}
              onToggleUnit={onToggleUnit}
            />

            {/* 2. CROP CONDITION & FARM ACTION FLOW */}
            <CropWeatherActionFlow
              temperature={data.live.temp}
              condition={data.live.condition}
              rainProbability={rainPct}
              formatTemp={formatTemp}
            />

            {/* 3. 24-Hour Forecast Timeline */}
            <HourlyForecastTimeline
              hourly={data.hourly}
              formatTemp={formatTemp}
            />

            {/* 4. Sensor Metrics Grid */}
            <WeatherMetricsGrid
              live={data.live}
              formatTemp={formatTemp}
              rainProbability={rainPct}
            />

            {/* 5. 7-Day Agricultural Outlook */}
            <SevenDayForecastCard
              daily={data.daily}
              formatTemp={formatTemp}
            />
          </div>
        </FarmWeatherEnvironment>
      </div>
    </div>
  );
};
