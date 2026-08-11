import React, { useEffect, useRef } from 'react';
import { X, ShieldAlert, Sparkles, Sprout } from 'lucide-react';
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

  if (!isOpen || !data) return null;

  const farm = deriveFarmAdvice(profile, data);
  const today = data.daily?.[0];
  const rainPct = today?.rainProbability;

  const scrollToForecast = () => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300" role="dialog" aria-modal="true" aria-label={t('wth.title')}>
      <div ref={bodyRef} className="bg-slate-950/95 border-t sm:border border-white/15 w-full max-w-3xl max-h-[92vh] sm:rounded-3xl rounded-t-3xl overflow-y-auto no-scrollbar flex flex-col shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/30 text-emerald-400">
              <Sparkles size={18} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">
                {t('wth.title')}
              </h2>
              <p className="text-[11px] text-slate-400">
                {interpolate(t('wth.lastUpdated'), { time: new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
                {data.isOfflineCached && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 px-2 py-0.5 font-bold">
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
              className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full text-slate-300 hover:text-white transition-all"
              title={t('wth.closeTitle')}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-6">
          
          {/* Critical Agro-Advisory Banner (if active) */}
          {data.advisoryAlert && (
            <div className="p-4 bg-gradient-to-r from-emerald-900/60 to-teal-900/60 border border-emerald-500/40 rounded-2xl flex items-start gap-3 text-white shadow-lg">
              <ShieldAlert size={22} className="text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300 mb-0.5">
                  {t('wth.advisory')}
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {data.advisoryAlert.message}
                </p>
              </div>
            </div>
          )}

          {/* Today's Farm Plan — crop-aware action strip */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1.5">
                <Sprout size={13} className="animate-pulse" />
                {t('wth.todaysPlan')} · {profile.crop} · {profile.stage}
              </h4>
              {rainPct != null && (
                <span
                  className={cn(
                    "text-[10px] font-bold rounded-full px-2.5 py-1 border",
                    rainPct >= 40
                      ? "text-sky-300 bg-sky-500/10 border-sky-500/25"
                      : "text-amber-300 bg-amber-500/10 border-amber-500/25"
                  )}
                >
                  {interpolate(t('wth.rain'), { pct: Math.round(rainPct) })}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-white leading-snug">{farm.heroLine}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {farm.items.slice(0, 4).map((it, i) => (
                <div key={i} className="rounded-xl bg-white/[0.04] border border-white/10 p-2.5">
                  <p className="text-[10px] font-bold text-slate-300">{it.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{it.sub}</p>
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
          <div className="pt-2 pb-6 text-center text-slate-500 text-[11px] space-y-1">
            <p>{t('wth.footerData')}</p>
            <p>{t('wth.footerPerf')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
