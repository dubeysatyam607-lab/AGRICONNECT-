import React from 'react';
import { CalendarClock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { UseFarmOsResult } from '../hooks/useFarmOs';
import { calendarIcons, EmptyState } from './shared';
import { formatDay } from './OverviewView';

interface Props {
  data: UseFarmOsResult;
  onToast: (msg: string) => void;
}

export const CalendarView: React.FC<Props> = ({ data, onToast }) => {
  const { t } = useLanguage();
  const { calendar, actions } = data;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = calendar.filter((e) => !e.complete && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const done = calendar.filter((e) => e.complete || e.date < today);

  return (
    <div className="mt-4 flex flex-col gap-4">
      {upcoming.length === 0 && done.length === 0 ? (
        <EmptyState icon={CalendarClock} text={t('fos.cal.empty')} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {upcoming.map((e) => {
              const Icon = calendarIcons[e.type];
              const isToday = e.date === today;
              const diff = Math.round((new Date(e.date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      isToday ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn('truncate text-[13px] font-bold text-foreground', isToday && 'text-emerald-700 dark:text-emerald-300')}>
                        {e.title}
                      </p>
                      {e.autoAdjust && (
                        <span className="shrink-0 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">
                          {t('fos.cal.auto')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-muted-foreground">
                      {formatDay(e.date)}
                      {diff === 0 ? ` · ${t('fos.time.dueToday')}` : diff < 0 ? ` · ${t('fos.time.overdue')}` : ` · ${t('fos.time.daysLeft').replace('{n}', String(diff))}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      actions.toggleCalendarEntry(e.id);
                      onToast(t('fos.toast.done'));
                    }}
                    className="rounded-full border border-border px-3 py-1.5 text-[10px] font-black text-muted-foreground transition-colors hover:border-emerald-400 hover:text-emerald-700"
                  >
                    {t('fos.cal.markDone')}
                  </button>
                </div>
              );
            })}
          </div>

          {done.length > 0 && (
            <section>
              <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">{t('fos.cal.done')}</h3>
              <div className="flex flex-col gap-2">
                {done.map((e) => {
                  const Icon = calendarIcons[e.type];
                  return (
                    <div key={e.id} className="flex items-center gap-2.5 rounded-2xl border border-border bg-card/60 px-3 py-2.5 opacity-70">
                      <Icon size={14} className="shrink-0 text-emerald-500" />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-muted-foreground line-through">{e.title}</span>
                      <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{formatDay(e.date)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
