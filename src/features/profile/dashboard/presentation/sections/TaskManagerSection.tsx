import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmptyState } from '@/components/ui/error-state';
import type { UseDigitalProfileReturn } from '../types';

interface TaskManagerSectionProps {
  data: UseDigitalProfileReturn;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TaskManagerSection: React.FC<TaskManagerSectionProps> = ({ data }) => {
  const { t } = useLanguage();
  const [view, setView] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const week = useMemo(() => {
    const days: { iso: string; label: string; day: number }[] = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push({ iso: d.toISOString().split('T')[0], label: DAY_LABELS[d.getDay()], day: d.getDate() });
    }
    return days;
  }, []);

  const countsFor = (iso: string) => data.tasks.filter((task) => task.date === iso && !task.done).length;

  const list = view === 'today' ? data.todayTasks : view === 'upcoming' ? data.upcomingTasks : data.completedTasks;

  const handleAdd = () => {
    if (!label.trim()) return;
    data.addTask(label.trim(), date);
    setLabel('');
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{t('prof.tasks')}</h2>
      </div>

      {/* Week strip calendar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="text-xs font-extrabold text-foreground mb-3">{t('prof.thisWeek')}</p>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d, i) => {
            const count = countsFor(d.iso);
            const isToday = i === 0;
            return (
              <div key={d.iso} className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 ${isToday ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-muted/50'}`}>
                <span className={`text-[10px] font-bold ${isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{d.label}</span>
                <span className="text-sm font-extrabold">{d.day}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${count > 0 ? (isToday ? 'bg-secondary' : 'bg-primary') : 'bg-transparent'}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Add task */}
      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={t('prof.taskPh')}
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-2xl border border-border bg-card px-3 py-3 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button onClick={handleAdd} aria-label={t('prof.addTask')} className="rounded-2xl bg-primary px-4 text-primary-foreground shadow-glow hover:bg-primary/90 active:scale-95 transition-all">
          <Plus size={18} />
        </button>
      </div>

      {/* View tabs */}
      <div className="flex rounded-full border border-border bg-card p-1 shadow-card w-fit">
        {(['today', 'upcoming', 'completed'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition-all ${view === v ? 'bg-primary text-primary-foreground shadow-glow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {v === 'today' ? t('prof.today') : v === 'upcoming' ? t('prof.upcoming') : t('prof.completed')}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border/60">
        {list.length === 0 ? (
          <div className="p-6">
            <EmptyState compact emoji="✅" title={t('prof.noTasks')} description={t('prof.noTasksHint')} />
          </div>
        ) : (
          list.slice(0, 10).map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-4">
              <button
                onClick={() => data.toggleTask(task.id)}
                aria-label={t('prof.markDone')}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${task.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border hover:border-primary'}`}
              >
                {task.done && <Check size={13} strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${task.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.label}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  {task.date}
                  {task.source === 'ai' && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-feature-ai/10 px-1.5 py-px text-[9px] font-extrabold text-feature-ai uppercase">
                      <Sparkles size={8} /> {t('prof.aiSuggested')}
                    </span>
                  )}
                </p>
              </div>
              {task.done && view === 'completed' && (
                <button onClick={() => data.toggleTask(task.id)} aria-label={t('prof.delete')} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* AI suggested tasks */}
      <section>
        <h3 className="mb-2.5 text-sm font-extrabold text-foreground flex items-center gap-2">
          <Sparkles size={15} className="text-feature-ai" /> {t('prof.aiSuggested')}
        </h3>
        <div className="rounded-2xl border border-feature-ai/20 bg-feature-ai/5 p-4">
          <ul className="space-y-2">
            {data.recommendations.tasks.map((task, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-feature-ai" />
                <span className="leading-snug">{task}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};
