import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { UseFarmOsResult } from '../hooks/useFarmOs';
import { EmptyState, timelineIcons } from './shared';
import { SectionHead, formatDay } from './OverviewView';

interface Props {
  data: UseFarmOsResult;
  onToast: (msg: string) => void;
}

const TL_TYPES = ['sowing', 'irrigation', 'fertilizer', 'pesticide', 'disease', 'weather', 'equipment', 'expense', 'harvest', 'sale'] as const;

export const TimelineView: React.FC<Props> = ({ data, onToast }) => {
  const { t } = useLanguage();
  const { timeline, activeFarm, activeCrop, actions } = data;
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TL_TYPES)[number]>('irrigation');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    actions.logTimelineEvent({
      farmId: activeFarm.id,
      type,
      title: title.trim(),
      detail: detail.trim() || undefined,
      amount: amount ? Number(amount) : undefined,
      crop: activeCrop?.crop,
    });
    setTitle('');
    setDetail('');
    setAmount('');
    setOpen(false);
    onToast(t('fos.toast.logged'));
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      <SectionHead title={t('fos.timeline.title')} />
      {timeline.length === 0 ? (
        <EmptyState icon={timelineIcons.sowing} text={t('fos.timeline.empty')} />
      ) : (
        <ol className="relative ml-2 flex flex-col gap-4 border-l-2 border-border pl-4">
          {timeline.map((e) => {
            const Icon = timelineIcons[e.type];
            return (
              <li key={e.id} className="relative">
                <span className="absolute -left-[25px] top-0 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-bold leading-snug text-foreground">{e.title}</p>
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-muted-foreground">
                          {t(`fos.tltype.${e.type}`)}
                        </span>
                      </div>
                      {e.detail && <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-muted-foreground">{e.detail}</p>}
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground">{formatDay(e.date)}</span>
                        {e.amount != null && (
                          <span className="text-[11px] font-black text-foreground">₹{e.amount.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Log form */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-black tracking-tight text-foreground">{t('fos.timeline.formTitle')}</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X size={15} />
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {TL_TYPES.map((ty) => (
                <button
                  key={ty}
                  onClick={() => setType(ty)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-black transition-colors',
                    type === ty ? 'bg-forest text-primary-foreground' : 'border border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`fos.tltype.${ty}`)}
                </button>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('fos.timeline.titlePh')}
              className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-emerald-400 focus:outline-none"
            />
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={t('fos.timeline.detailPh')}
              className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-emerald-400 focus:outline-none"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              placeholder={t('fos.timeline.amountPh')}
              className="mb-4 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={!title.trim()}
              className="w-full rounded-xl bg-forest py-2.5 text-sm font-black text-primary-foreground transition-colors disabled:opacity-40"
            >
              {t('fos.timeline.submit')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-dashed border-emerald-300 bg-emerald-500/5 py-3 text-sm font-black text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-300"
        >
          + {t('fos.timeline.log')}
        </button>
      )}
    </div>
  );
};
