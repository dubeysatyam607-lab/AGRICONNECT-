import React from 'react';
import { Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { UseFarmOsResult } from '../hooks/useFarmOs';
import { HealthRing, TrendDots } from './shared';
import { SectionHead } from './OverviewView';

interface Props {
  data: UseFarmOsResult;
}

const FACTOR_ORDER = ['crop', 'weather', 'water', 'disease', 'tasks', 'soil'] as const;

export const HealthView: React.FC<Props> = ({ data }) => {
  const { t } = useLanguage();
  const { health } = data;

  return (
    <div className="mt-4 flex flex-col gap-5">
      <SectionHead title={t('fos.health.title')} />
      <div className="flex flex-col sm:flex-row items-center gap-5 rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-card via-card to-emerald-500/10 p-6 shadow-xl backdrop-blur-md">
        <div className="shrink-0 p-2 rounded-2xl bg-card border border-border/80 shadow-inner">
          <HealthRing score={health.score} size={108} />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
            health.score >= 75 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" :
            health.score >= 55 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30" :
            "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
          )}>
            {health.score >= 75 ? t('fos.health.good') : health.score >= 55 ? t('fos.health.fair') : t('fos.health.attention')}
          </span>
          <h3 className="text-xl font-black tracking-tight text-foreground mt-1">
            Overall Crop Health Index
          </h3>
          <div className="mt-3 flex items-center justify-center sm:justify-start gap-2.5">
            <TrendDots trend={health.trend} />
            <span className="text-xs font-semibold text-muted-foreground">{t('fos.health.trend')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FACTOR_ORDER.map((k) => {
          const v = health.factors[k];
          return (
            <div key={k} className="rounded-2xl border border-border/80 bg-card p-4 shadow-card hover:border-emerald-500/30 transition-all">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <Activity size={13} />
                  </div>
                  {t(`fos.health.factor.${k}`)}
                </span>
                <span className={cn('text-xs font-black', v >= 75 ? 'text-emerald-600 dark:text-emerald-400' : v >= 55 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}>
                  {v}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', v >= 75 ? 'bg-emerald-500' : v >= 55 ? 'bg-amber-500' : 'bg-rose-500')}
                  style={{ width: `${v}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
