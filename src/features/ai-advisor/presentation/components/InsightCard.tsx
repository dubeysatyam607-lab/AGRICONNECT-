import React, { useState } from 'react';
import {
  CloudRain, Sun, Snowflake, Droplets, Bug, TrendingUp, Sprout, Waves,
  IndianRupee, ListChecks, Wheat, Landmark, Sparkles, ArrowRight,
  ChevronDown, CheckCheck, BrainCircuit,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate, localeFor } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import type { AdvisorInsight, InsightSeverity, InsightType } from '../../domain/advisorTypes';
import { ackInsight, markEngaged } from '../../domain/advisorStore';

const TYPE_ICON: Record<InsightType, React.ComponentType<{ size?: number; className?: string }>> = {
  rain: CloudRain,
  heat: Sun,
  frost: Snowflake,
  drought: Sun,
  disease: Bug,
  market: TrendingUp,
  yield: Sprout,
  water: Waves,
  profit: IndianRupee,
  task: ListChecks,
  harvest: Wheat,
  scheme: Landmark,
  general: Sparkles,
};

const SEVERITY_STYLE: Record<InsightSeverity, { ring: string; badge: string; dot: string; label: string }> = {
  critical: { ring: 'border-l-rose-600', badge: 'bg-rose-600 text-white', dot: 'bg-rose-500', label: 'Severe' },
  warning: { ring: 'border-l-amber-500', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', label: 'Watch' },
  info: { ring: 'border-l-sky-500', badge: 'bg-sky-500/12 text-sky-700 dark:text-sky-400', dot: 'bg-sky-500', label: 'Info' },
  positive: { ring: 'border-l-emerald-500', badge: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Good news' },
};

const CONFIDENCE_LABEL = (c: number): string => (c >= 80 ? 'High' : c >= 55 ? 'Medium' : 'Low');

interface InsightCardProps {
  insight: AdvisorInsight;
  onNavigate: (tab: string) => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight, onNavigate }) => {
  const { t, language } = useLanguage();
  const [showWhy, setShowWhy] = useState(false);
  const Icon = TYPE_ICON[insight.type] || Sparkles;
  const style = SEVERITY_STYLE[insight.severity];

  const resolveParams = (): Record<string, string | number> =>
    Object.fromEntries(
      Object.entries(insight.params || {}).map(([k, v]) => [
        k,
        typeof v === 'string' && v.startsWith('i18n:') ? t(v.slice(5)) : v,
      ]),
    );
  const params = resolveParams();
  const title = interpolate(t(insight.titleKey), params);
  const body = interpolate(t(insight.bodyKey), params);
  const when = new Date(insight.createdAt).toLocaleDateString(localeFor(language), { weekday: 'short', day: 'numeric' });

  return (
    <article
      className={cn(
        'rounded-2xl border border-border bg-card p-4 shadow-card transition-all',
        insight.severity === 'critical' && !insight.acked && 'bg-rose-500/[0.03]',
        insight.acked && 'opacity-70',
        'border-l-4',
        style.ring,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-ai text-primary-foreground shadow-colorful">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              {t(`adv.type.${insight.type}`)}
            </span>
            <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide', style.badge)}>
              {style.label}
            </span>
            <span className="ml-auto text-[10px] font-semibold text-muted-foreground">{when}</span>
          </div>

          <h3 className="mt-1 text-sm font-black text-foreground">{title}</h3>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{body}</p>

          {/* FIX 6: Trust signal instead of raw confidence % */}
          <div className="mt-3 flex items-center gap-2">
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              insight.confidence >= 80 ? 'bg-emerald-500' : insight.confidence >= 55 ? 'bg-amber-500' : 'bg-rose-500',
            )} />
            <span className="text-[10px] font-black text-muted-foreground">
              {insight.confidence >= 80
                ? 'Verified recommendation'
                : insight.confidence >= 65
                  ? 'High confidence · Based on your farm data'
                  : 'Based on your farm data'}
            </span>
          </div>

          {/* Why (reasoning) */}
          <button
            onClick={() => setShowWhy((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
          >
            <BrainCircuit size={12} />
            {t('adv.why')}
            <ChevronDown size={12} className={cn('transition-transform', showWhy && 'rotate-180')} />
          </button>
          {showWhy && (
            <ul className="mt-2 space-y-1.5 rounded-xl border border-border bg-background/60 p-3">
              {insight.reasoning.map((r, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground">
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
                  {interpolate(t(r.reasonKey), r.params || {})}
                </li>
              ))}
            </ul>
          )}

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {insight.action && (
              <button
                onClick={() => {
                  markEngaged(insight.type);
                  onNavigate(insight.action!.tab);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 dark:bg-emerald-600"
              >
                {t(insight.action.labelKey)}
                <ArrowRight size={13} />
              </button>
            )}
            {!insight.acked && (
              <button
                onClick={() => ackInsight(insight.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <CheckCheck size={13} />
                {t('adv.ack')}
              </button>
            )}
            {insight.acked && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{t('adv.acked')}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
