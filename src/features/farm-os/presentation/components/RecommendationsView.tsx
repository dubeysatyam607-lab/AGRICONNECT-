import React from 'react';
import { Check, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { UseFarmOsResult } from '../hooks/useFarmOs';
import { EmptyState, priorityDot, priorityStyles, recCategoryIcons } from './shared';
import { SectionHead } from './OverviewView';

interface Props {
  data: UseFarmOsResult;
  onToast: (msg: string) => void;
}

export const RecommendationsView: React.FC<Props> = ({ data, onToast }) => {
  const { t } = useLanguage();
  const { recommendations, actions } = data;
  const pending = recommendations.filter((r) => !r.done);
  const done = recommendations.filter((r) => r.done);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <SectionHead title={t('fos.rec.title')} />
      {pending.length === 0 && done.length === 0 ? (
        <EmptyState icon={Lightbulb} text={t('fos.rec.none')} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {pending.map((r) => {
              const Icon = recCategoryIcons[r.category];
              return (
                <article key={r.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-card">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[13px] font-bold leading-snug text-foreground">{r.title}</h4>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide', priorityStyles[r.priority])}>
                          {t(`fos.rec.priority.${r.priority}`)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium leading-relaxed text-muted-foreground">{r.body}</p>
                    </div>
                  </div>

                  {/* Confidence bar */}
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-black">
                      <span className="text-muted-foreground">{t('fos.rec.confidence')}</span>
                      <span className="text-foreground">{r.confidence}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', r.confidence >= 85 ? 'bg-emerald-500' : r.confidence >= 75 ? 'bg-amber-500' : 'bg-sky-500')}
                        style={{ width: `${r.confidence}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-700 dark:text-emerald-300">
                      ✓ {t('fos.rec.benefit')}: {r.benefit}
                    </span>
                    {r.reasons.slice(0, 2).map((reason, i) => (
                      <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                        {t('fos.rec.reasons')}: {reason}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      actions.completeRecommendation(r.id);
                      onToast(t('fos.toast.done'));
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-forest py-2 text-xs font-black text-primary-foreground transition-colors hover:opacity-90"
                  >
                    <Check size={13} /> {t('fos.rec.doneBtn')}
                  </button>
                </article>
              );
            })}
          </div>

          {done.length > 0 && (
            <section>
              <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">{t('fos.rec.done')}</h3>
              <div className="flex flex-col gap-2">
                {done.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 rounded-2xl border border-border bg-card/60 px-3 py-2.5 opacity-70">
                    <Check size={14} className="shrink-0 text-emerald-500" />
                    <span className="text-xs font-bold text-muted-foreground line-through">{r.title}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
