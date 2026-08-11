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
    <div className="mt-4 flex flex-col gap-3">
      {/* Hero: health + twin summary */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-emerald-500/5 p-4 shadow-card">
        <div className="flex items-center gap-4">
          <HealthRing score={health.score} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              {health.score >= 75 ? t('fos.health.good') : health.score >= 55 ? t('fos.health.fair') : t('fos.health.attention')}
            </p>
            <h2 className="font-display text-xl font-black tracking-tight text-foreground">{activeFarm.name}</h2>
            <p className="truncate text-xs font-semibold text-muted-foreground">
              {activeCrop
                ? `${activeCrop.crop} · ${t(`fos.stage.${activeCrop.stage}`)} · ${activeFarm.areaAcres} ${t('fos.unit.acres')}`
                : `${activeFarm.village}, ${activeFarm.district}`}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <TrendDots trend={health.trend} />
              <span className="text-[10px] font-bold text-muted-foreground">{t('fos.health.trend')}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border pt-3">
          <MiniStat icon={ThermometerSun} value={`${weather.temp}°C`} label="Weather" tint="text-orange-600 dark:text-orange-300" />
          <MiniStat icon={Droplets} value={`${weather.humidity}%`} label="Humidity" tint="text-sky-600 dark:text-sky-300" />
          <MiniStat
            icon={TrendingUp}
            value={market ? `₹${market.price}` : '—'}
            label={activeCrop?.crop ?? 'Market'}
            tint={market?.status === 'up' ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}
          />
          <MiniStat
            icon={Sprout}
            value={activeCrop ? t(`fos.stage.${activeCrop.stage}`) : '—'}
            label={t('fos.twin.crop')}
            tint="text-emerald-600 dark:text-emerald-300"
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
          <div className="flex flex-col gap-2">
            {todayRecs.map((r) => {
              const Icon = recCategoryIcons[r.category];
              return (
                <button
                  key={r.id}
                  onClick={() => onView('calendar')}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-card transition-colors hover:border-emerald-300 dark:hover:border-emerald-600"
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Icon size={16} />
                    <span className={cn('absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-card', priorityDot[r.priority])} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold leading-snug text-foreground">{r.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide', priorityStyles[r.priority])}>
                        {t(`fos.rec.priority.${r.priority}`)}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {t('fos.rec.confidence')} {r.confidence}%
                      </span>
                    </span>
                  </span>
                  <ArrowRight size={14} className="mt-1 shrink-0 text-muted-foreground" />
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
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-amber-500/10 to-card p-3.5 shadow-card">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <CalendarClock size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-foreground">{nextTask.title}</p>
              <p className="text-[11px] font-bold text-muted-foreground">
                {formatDay(nextTask.date)}
              </p>
            </div>
            {nextTask.autoAdjust && (
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">
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
  <div className="flex flex-col items-center gap-0.5 text-center">
    <Icon size={14} className={tint} />
    <span className="max-w-full truncate text-[11px] font-black text-foreground">{value}</span>
    <span className="max-w-full truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
  </div>
);

export const SectionHead: React.FC<{ title: string; actionLabel?: string; onAction?: () => void }> = ({ title, actionLabel, onAction }) => (
  <div className="mb-2 flex items-center justify-between">
    <h3 className="font-display text-sm font-black uppercase tracking-wide text-foreground">{title}</h3>
    {actionLabel && onAction && (
      <button onClick={onAction} className="flex items-center gap-0.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
        {actionLabel} <ArrowRight size={11} />
      </button>
    )}
  </div>
);

export const formatDay = (iso: string): string =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' });
