import React from 'react';
import { Bot, ArrowRight, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { useAdvisor } from '../hooks/useAdvisor';
import { buildDailyBrief } from '../../domain/advisorStore';

interface AdvisorBriefCardProps {
  onNavigate: (tab: string) => void;
}

/**
 * Personalized home card — surfaces the day's top AI insights with confidence
 * and a one-tap path to the full advisor.
 */
export const AdvisorBriefCard: React.FC<AdvisorBriefCardProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { state, topInsights, regenerating } = useAdvisor();
  const memory = state.memory;

  const handleRefresh = () => {
    try {
      buildDailyBrief();
    } catch { /* noop */ }
  };

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="relative bg-gradient-to-br from-violet-600 to-indigo-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Bot size={19} />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-live-pulse" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-black leading-tight">{t('adv.home.title')}</p>
            <p className="text-[11px] font-semibold text-white/80">
              {interpolate(t('adv.home.subtitle'), { name: memory.farmer.name, crop: memory.farm.crop })}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            aria-label={t('adv.home.refresh')}
            className="ml-auto shrink-0 rounded-xl bg-white/15 p-2 text-white transition-colors hover:bg-white/25"
          >
            <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            memory.farmer.village,
            `${memory.farm.crop} · ${memory.farm.stage}`,
            `${memory.farm.area} acres`,
            `${t('adv.home.memory')} ${memory.dataCompleteness}%`,
          ].map((chip) => (
            <span key={chip} className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold">
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 p-4">
        {topInsights.length === 0 ? (
          <p className="px-1 py-2 text-xs font-semibold text-muted-foreground">{t('adv.home.empty')}</p>
        ) : (
          topInsights.slice(0, 3).map((insight) => (
            <button
              key={insight.id}
              onClick={() => onNavigate('advisor')}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/60 p-3 text-left transition-colors hover:bg-muted/40"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  insight.severity === 'critical' ? 'bg-rose-500' : insight.severity === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-foreground">
                  {interpolate(t(insight.titleKey), insight.params || {})}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {t('adv.confidence')} {insight.confidence}%
                  </span>
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-emerald-500"
                      style={{ width: `${insight.confidence}%` }}
                    />
                  </span>
                </div>
              </div>
              <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
            </button>
          ))
        )}
      </div>

      <button
        onClick={() => onNavigate('advisor')}
        className="flex w-full items-center justify-center gap-2 border-t border-border bg-muted/30 py-3 text-[13px] font-black text-violet-600 transition-colors hover:bg-muted/50 dark:text-violet-400"
      >
        {t('adv.home.open')}
        <ArrowRight size={14} />
      </button>
    </section>
  );
};
