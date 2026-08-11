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
    <div className="mt-4 flex flex-col gap-4">
      <SectionHead title={t('fos.health.title')} />
      <div className="flex items-center gap-5 rounded-2xl border border-border bg-gradient-to-br from-card to-emerald-500/5 p-5 shadow-card">
        <HealthRing score={health.score} size={108} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-black tracking-tight text-foreground">
            {health.score >= 75 ? t('fos.health.good') : health.score >= 55 ? t('fos.health.fair') : t('fos.health.attention')}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <TrendDots trend={health.trend} />
            <span className="text-[10px] font-bold text-muted-foreground">{t('fos.health.trend')}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {FACTOR_ORDER.map((k) => {
          const v = health.factors[k];
          return (
            <div key={k} className="rounded-2xl border border-border bg-card p-3 shadow-card">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-foreground">
                  <Activity size={13} className="text-emerald-600 dark:text-emerald-300" />
                  {t(`fos.health.factor.${k}`)}
                </span>
                <span className={cn('text-[11px] font-black', v >= 75 ? 'text-emerald-600 dark:text-emerald-300' : v >= 55 ? 'text-amber-600 dark:text-amber-300' : 'text-rose-600 dark:text-rose-300')}>
                  {v}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
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
