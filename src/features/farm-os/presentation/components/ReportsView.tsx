import React from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ReportKind } from '../../domain/farmOsTypes';
import type { UseFarmOsResult } from '../hooks/useFarmOs';
import { EmptyState } from './shared';
import { SectionHead } from './OverviewView';

interface Props {
  data: UseFarmOsResult;
  onToast: (msg: string) => void;
}

const KINDS: ReportKind[] = ['daily', 'weekly', 'monthly', 'season', 'harvest'];

const kindTint: Record<ReportKind, string> = {
  daily: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  weekly: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  monthly: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  season: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  harvest: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

export const ReportsView: React.FC<Props> = ({ data, onToast }) => {
  const { t } = useLanguage();
  const { reports, actions } = data;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <SectionHead title={t('fos.rep.title')} />

      {/* Generate row */}
      <div className="grid grid-cols-5 gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => {
              actions.generateReport(k);
              onToast(t('fos.toast.report'));
            }}
            className={`flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-1 py-2.5 text-center shadow-card transition-transform hover:-translate-y-0.5 ${kindTint[k]}`}
          >
            <Sparkles size={14} />
            <span className="text-[9px] font-black uppercase leading-tight">{t(`fos.rep.kind.${k}`)}</span>
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={FileText} text={t('fos.rep.empty')} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {reports.map((r) => (
            <article key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className={`flex items-center justify-between gap-2 px-3.5 py-2.5 ${kindTint[r.kind]}`}>
                <h4 className="text-[13px] font-black tracking-tight">{r.title}</h4>
                <span className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide">
                  {t(`fos.rep.kind.${r.kind}`)}
                </span>
              </div>
              <div className="px-3.5 py-3">
                <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">{r.summary}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {r.metrics.map((m) => (
                    <div key={m.label} className="rounded-xl bg-muted/60 px-2 py-2 text-center">
                      <p className="truncate text-[10px] font-bold text-muted-foreground">{m.label}</p>
                      <p className="mt-0.5 truncate text-[12px] font-black text-foreground">{m.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-right text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t('fos.rep.generatedAt')} · {new Date(r.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
