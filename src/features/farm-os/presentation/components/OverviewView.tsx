import React from 'react';
import { ArrowRight, CalendarClock, Droplets, Sprout, ThermometerSun, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { UseFarmOsResult } from '../hooks/useFarmOs';
import { HealthRing, priorityDot, priorityStyles, recCategoryIcons, TrendDots } from './shared';

interface Props {
  data: UseFarmOsResult;
  onView: (tab: string) => void;
}

export const OverviewView: React.FC<Props> = ({ data, onView }) => {
  const { t } = useLanguage();
  const { activeFarm, activeCrop, health, recommendations, calendar, state } = data;
  const todayRecs = recommendations.filter((r) => !r.done).slice(0, 3);
  const nextTask = calendar[0];
  const weather = state.weather;
  const market = activeCrop ? state.market[activeCrop.crop] : undefined;

  return (
    <div className="mt-4 flex flex-col gap-5">
      {/* Hero: health + twin summary */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/10 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="shrink-0 p-2 rounded-2xl bg-card border border-border/80 shadow-inner">
            <HealthRing score={health.score} />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                health.score >= 75 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" :
                health.score >= 55 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30" :
                "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
              )}>
                {health.score >= 75 ? t('fos.health.good') : health.score >= 55 ? t('fos.health.fair') : t('fos.health.attention')}
              </span>
              <span className="text-xs text-muted-foreground font-mono">• {activeFarm.village}, {activeFarm.district}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground mt-1">{activeFarm.name}</h2>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">
              {activeCrop
                ? `${activeCrop.crop} · ${t(`fos.stage.${activeCrop.stage}`)} · ${activeFarm.areaAcres} ${t('fos.unit.acres')}`
                : `${activeFarm.areaAcres} ${t('fos.unit.acres')}`}
            </p>
            <div className="mt-3 flex items-center justify-center sm:justify-start gap-2.5">
              <TrendDots trend={health.trend} />
              <span className="text-xs font-semibold text-muted-foreground">{t('fos.health.trend')}</span>
            </div>
          </div>
        </div>

        {/* 4 Quick Stat Tiles */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/70 pt-4">
          <MiniStat icon={ThermometerSun} value={`${weather.temp}°C`} label="Weather" tint="text-orange-500" />
          <MiniStat icon={Droplets} value={`${weather.humidity}%`} label="Humidity" tint="text-sky-500" />
          <MiniStat
            icon={TrendingUp}
            value={market ? `₹${market.price}` : '—'}
            label={activeCrop?.crop ?? 'Market'}
            tint={market?.status === 'up' ? 'text-emerald-500' : 'text-rose-500'}
          />
          <MiniStat
            icon={Sprout}
            value={activeCrop ? t(`fos.stage.${activeCrop.stage}`) : '—'}
            label={t('fos.twin.crop')}
            tint="text-emerald-500"
          />
        </div>
      </div>

      {/* Today's priorities */}
      <section>
        <SectionHead title={t('fos.rec.today')} actionLabel={t('fos.tab.calendar')} onAction={() => onView('calendar')} />
        {todayRecs.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-xs font-semibold text-muted-foreground">
            {t('fos.rec.none')}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {todayRecs.map((r) => {
              const Icon = recCategoryIcons[r.category];
              return (
                <button
                  key={r.id}
                  onClick={() => onView('calendar')}
                  className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-all hover:border-emerald-500/40 hover:shadow-lg"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    <Icon size={18} />
                    <span className={cn('absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card', priorityDot[r.priority])} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-snug text-foreground">{r.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', priorityStyles[r.priority])}>
                        {t(`fos.rec.priority.${r.priority}`)}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">
                        {t('fos.rec.confidence')} {r.confidence}%
                      </span>
                    </span>
                  </span>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Next smart task */}
      {nextTask && (
        <section>
          <SectionHead title={t('fos.cal.title')} actionLabel={t('fos.seeAll')} onAction={() => onView('calendar')} />
          <div className="flex items-center gap-3.5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-card p-4 shadow-sm hover:border-amber-500/50 transition-all">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <CalendarClock size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{nextTask.title}</p>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                {formatDay(nextTask.date)}
              </p>
            </div>
            {nextTask.autoAdjust && (
              <span className="rounded-full bg-violet-500/15 border border-violet-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300 shrink-0">
                {t('fos.cal.auto')}
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

const MiniStat: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; value: string; label: string; tint: string }> = ({ icon: Icon, value, label, tint }) => (
  <div className="flex flex-col items-center gap-1 text-center bg-card/80 border border-border/80 rounded-2xl p-3 shadow-xs">
    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-muted/50", tint)}>
      <Icon size={16} />
    </div>
    <span className="max-w-full truncate text-sm font-black text-foreground">{value}</span>
    <span className="max-w-full truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
  </div>
);

export const SectionHead: React.FC<{ title: string; actionLabel?: string; onAction?: () => void }> = ({ title, actionLabel, onAction }) => (
  <div className="mb-2.5 flex items-center justify-between">
    <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">{title}</h3>
    {actionLabel && onAction && (
      <button onClick={onAction} className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
        {actionLabel} <ArrowRight size={12} />
      </button>
    )}
  </div>
);

export const formatDay = (iso: string): string =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' });
