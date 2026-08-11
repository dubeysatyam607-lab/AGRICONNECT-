import React, { useState } from 'react';
import { AlertCircle, ClipboardList, MapPin, Plus, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import type { RequirementPost, RequirementType } from '../../domain/networkTypes';

const TYPES: Array<{ key: RequirementType; icon: string }> = [
  { key: 'tractor', icon: '🚜' },
  { key: 'labour', icon: '👷' },
  { key: 'harvester', icon: '🌾' },
  { key: 'transport', icon: '🚚' },
  { key: 'buyer', icon: '🤝' },
  { key: 'seeds', icon: '🌱' },
  { key: 'fertilizer', icon: '🧪' },
  { key: 'cold-storage', icon: '❄️' },
];

const URGENCY_DOT: Record<RequirementPost['urgency'], string> = {
  today: 'bg-rose-500',
  week: 'bg-amber-400',
  flexible: 'bg-sky-500',
};

interface RequirementsViewProps {
  requirements: RequirementPost[];
  onPost: (input: { type: RequirementType; title: string; description: string; location: string; amount?: string; urgency: 'today' | 'week' | 'flexible' }) => void;
  onRespond: (id: string) => void;
  onToast?: (message: string) => void;
}

export const RequirementsView: React.FC<RequirementsViewProps> = ({ requirements, onPost, onRespond, onToast }) => {
  const { t } = useLanguage();
  const [openForm, setOpenForm] = useState(false);
  const [filter, setFilter] = useState<RequirementType | 'all'>('all');

  const list = filter === 'all' ? requirements : requirements.filter((r) => r.type === filter);

  return (
    <div className="mt-4">
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
            filter === 'all' ? 'bg-forest text-primary-foreground' : 'border border-border bg-card text-muted-foreground',
          )}
        >
          {t('fnet.req.all')}
        </button>
        {TYPES.map(({ key, icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
              filter === key ? 'bg-forest text-primary-foreground' : 'border border-border bg-card text-muted-foreground',
            )}
          >
            <span aria-hidden>{icon}</span>
            {t(`fnet.category.${key}`)}
          </button>
        ))}
      </div>

      <button
        onClick={() => setOpenForm(true)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-forest/40 bg-forest/5 px-3 py-2.5 text-xs font-black text-forest hover:bg-forest/10"
      >
        <Plus size={14} />
        {t('fnet.req.post')}
      </button>

      <div className="mt-3 space-y-3">
        {list.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
            <ClipboardList size={30} className="mb-2 text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">{t('fnet.empty.title')}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t('fnet.empty.reqs')}</p>
          </div>
        ) : (
          list.map((req) => {
            const ago = timeAgoLabel(t, req.createdAt);
            return (
              <article key={req.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-base">
                      {TYPES.find((x) => x.key === req.type)?.icon ?? '📋'}
                    </span>
                    <div>
                      <h3 className="text-sm font-black leading-tight text-foreground">{req.title}</h3>
                      <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                        {req.postedByName} · {ago}
                      </p>
                    </div>
                  </div>
                  <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', URGENCY_DOT[req.urgency])} aria-hidden />
                </div>

                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{req.description}</p>

                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5">
                    <MapPin size={10} className="text-forest" />
                    {req.location}
                  </span>
                  {req.amount && (
                    <span className="inline-flex items-center rounded-full border border-border bg-background/60 px-2 py-0.5 text-forest">
                      {req.amount}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5">
                    <AlertCircle size={10} />
                    {t(`fnet.urgency.${req.urgency}`)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {interpolate(t('fnet.req.responses'), { count: req.responses })}
                  </span>
                  {req.open ? (
                    <button
                      onClick={() => {
                        onRespond(req.id);
                        onToast?.(t('fnet.toast.responded'));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 dark:bg-emerald-600"
                    >
                      <Send size={12} />
                      {t('fnet.req.respond')}
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-muted-foreground/60">{t('fnet.req.closed')}</span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {openForm && (
        <RequirementForm
          onClose={() => setOpenForm(false)}
          onSubmit={(input) => {
            onPost(input);
            onToast?.(t('fnet.toast.posted'));
          }}
        />
      )}
    </div>
  );
};

const timeAgoLabel = (t: (k: string) => string, iso: string): string => {
  const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (diffH < 1) return t('fnet.time.now');
  if (diffH < 24) return interpolate(t('fnet.time.hours'), { n: diffH });
  const days = Math.floor(diffH / 24);
  return interpolate(t('fnet.time.days'), { n: days });
};

const RequirementForm: React.FC<{
  onClose: () => void;
  onSubmit: (input: { type: RequirementType; title: string; description: string; location: string; amount?: string; urgency: 'today' | 'week' | 'flexible' }) => void;
}> = ({ onClose, onSubmit }) => {
  const { t } = useLanguage();
  const [type, setType] = useState<RequirementType>('tractor');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [amount, setAmount] = useState('');
  const [urgency, setUrgency] = useState<'today' | 'week' | 'flexible'>('week');

  const valid = title.trim() && description.trim() && location.trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-soft sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-foreground">{t('fnet.req.formTitle')}</h4>
          <button onClick={onClose} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground" aria-label={t('common.back')}>
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
            {TYPES.map(({ key, icon }) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors',
                  type === key ? 'bg-forest text-primary-foreground' : 'border border-border text-muted-foreground',
                )}
              >
                <span aria-hidden>{icon}</span>
                {t(`fnet.category.${key}`)}
              </button>
            ))}
          </div>

          <Field label={t('fnet.req.title')}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('fnet.req.titlePh')} className={inputCls} />
          </Field>
          <Field label={t('fnet.req.desc')}>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t('fnet.req.descPh')} className={cn(inputCls, 'resize-none')} />
          </Field>
          <Field label={t('fnet.req.place')}>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('fnet.req.placePh')} className={inputCls} />
          </Field>
          <Field label={`${t('fnet.req.amount')} (${t('fnet.req.optional')})`}>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹" className={inputCls} />
          </Field>

          <div className="flex gap-1.5">
            {(['today', 'week', 'flexible'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUrgency(u)}
                className={cn(
                  'flex-1 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors',
                  urgency === u ? 'bg-forest text-primary-foreground' : 'border border-border text-muted-foreground',
                )}
              >
                {t(`fnet.urgency.${u}`)}
              </button>
            ))}
          </div>

          <button
            disabled={!valid}
            onClick={() => {
              onSubmit({ type, title, description, location, amount: amount || undefined, urgency });
              onClose();
            }}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-sm',
              valid ? 'bg-forest hover:brightness-110 dark:bg-emerald-600' : 'cursor-not-allowed opacity-40',
            )}
          >
            <Send size={13} />
            {t('fnet.req.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

const inputCls = 'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-forest';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);
