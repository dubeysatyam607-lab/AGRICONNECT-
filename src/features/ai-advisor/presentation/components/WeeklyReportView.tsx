import React from 'react';
import { CalendarRange, Gauge } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate, localeFor } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import type { WeeklyReport } from '../../domain/advisorTypes';
import { InsightCard } from './InsightCard';

interface WeeklyReportViewProps {
  report: WeeklyReport;
  onNavigate: (tab: string) => void;
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({ report, onNavigate }) => {
  const { t, language } = useLanguage();

  const resolve = (key: string, params?: Record<string, string | number>): string =>
    interpolate(t(key), params || {});

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarRange size={15} className="text-indigo-500" />
          <span className="text-[11px] font-black uppercase tracking-wider">{t('adv.report.week')}</span>
          <span className="ml-auto text-[11px] font-bold">
            {new Date(report.id.slice(0, 4) + '-01-01').toLocaleDateString(localeFor(language), { month: 'long', year: 'numeric' })} · {report.id}
          </span>
        </div>
        <h2 className="mt-2 font-display text-base font-black text-foreground">
          {resolve(report.summaryKey, report.summaryParams)}
        </h2>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{t('adv.report.subtitle')}</p>
      </div>

      {report.sections.map((section, idx) => (
        <section key={idx} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <Gauge size={14} className={cn(section.confidence >= 80 ? 'text-emerald-500' : 'text-amber-500')} />
            <h3 className="text-sm font-black text-foreground">{t(section.titleKey)}</h3>
            <span className="ml-auto text-[10px] font-black text-muted-foreground">
              {section.confidence >= 80
                ? 'Verified'
                : section.confidence >= 65
                  ? 'High confidence'
                  : 'Based on your data'}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
            {resolve(section.bodyKey, section.params)}
          </p>
        </section>
      ))}

      {report.recommendations.length > 0 && (
        <div>
          <h3 className="mb-2 px-1 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            {t('adv.report.topPicks')}
          </h3>
          <div className="space-y-2.5">
            {report.recommendations.map((r) => (
              <InsightCard key={r.id} insight={r} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
