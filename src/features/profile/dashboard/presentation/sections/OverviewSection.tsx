import React from 'react';
import { ArrowRight, CloudSun, HeartPulse, ListTodo, Package, TrendingUp, Wallet, CheckCircle2, Sparkles, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UseDigitalProfileReturn } from '../types';

interface OverviewSectionProps {
  data: UseDigitalProfileReturn;
  onNavigate: (tab: string) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ data, onNavigate }) => {
  const { t } = useLanguage();
  const { recommendations, advice, cropStage } = data;

  const healthTone =
    cropStage === 'Harvested' ? 'healthy'
    : cropStage === 'Harvesting' || cropStage === 'Flowering' ? 'monitor'
    : 'attention';

  const healthLabel =
    healthTone === 'healthy' ? t('prof.healthHealthy')
    : healthTone === 'monitor' ? t('prof.healthMonitor')
    : t('prof.healthAttention');

  const statCards = [
    {
      icon: <Package size={18} />,
      label: t('prof.statEquipment'),
      value: String(data.equipment.length),
      tone: 'bg-blue-500/12 text-blue-600 dark:text-blue-400',
      onClick: () => onNavigate('equipment'),
    },
    {
      icon: <ListTodo size={18} />,
      label: t('prof.statTasksDue'),
      value: String(data.todayTasks.length + data.upcomingTasks.length),
      tone: 'bg-orange-500/12 text-orange-600 dark:text-orange-400',
      onClick: () => onNavigate('tasks'),
    },
    {
      icon: <Wallet size={18} />,
      label: t('prof.statIncome'),
      value: `₹${data.totalIncome.toLocaleString('en-IN')}`,
      tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
      onClick: () => onNavigate('analytics'),
    },
    {
      icon: <TrendingUp size={18} />,
      label: t('prof.statBookings'),
      value: String(data.bookings.length + data.invoices.length),
      tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
      onClick: () => onNavigate('bookings'),
    },
  ];

  return (
    <div className="space-y-5 pb-24">
      {/* Quick stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="group rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft active:scale-[0.98]"
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${s.tone}`}>{s.icon}</span>
            <p className="mt-2.5 text-lg font-extrabold text-foreground tabular-nums leading-none">{s.value}</p>
            <p className="mt-1 text-[11px] font-bold text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Today's AI recommendation */}
      <div className="rounded-[28px] border border-feature-ai/25 bg-card p-5 sm:p-6 shadow-card relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-feature-ai/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full gradient-ai px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
              <Sparkles size={12} />
              {t('prof.aiToday')}
            </span>
            <span className="text-xs font-bold text-muted-foreground">{advice?.cropLabel || recommendations.mandi.crop}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Weather impact */}
            <div className="rounded-2xl bg-feature-weather/10 border border-feature-weather/20 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-feature-weather mb-1.5">
                <CloudSun size={13} /> {t('prof.weatherImpact')}
              </p>
              <p className="text-sm font-semibold text-foreground leading-snug">
                {recommendations.weather.emoji} {recommendations.weather.title} · {recommendations.weather.temp}
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{recommendations.weather.detail}</p>
            </div>

            {/* Crop health */}
            <div className="rounded-2xl bg-feature-doctor/10 border border-feature-doctor/20 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-feature-doctor mb-1.5">
                <HeartPulse size={13} /> {t('prof.cropHealth')}
              </p>
              <p className="text-sm font-semibold text-foreground">{cropStage}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-live-pulse" />
                {healthLabel}
              </p>
            </div>

            {/* Market opportunity */}
            <div className="rounded-2xl bg-feature-mandi/10 border border-feature-mandi/20 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-feature-mandi mb-1.5">
                <TrendingUp size={13} /> {t('prof.marketOpp')}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {recommendations.mandi.crop} · <span className="text-marigold font-extrabold">{recommendations.mandi.price}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {recommendations.mandi.note} @ {recommendations.mandi.market}
              </p>
            </div>

            {/* Recommended tasks */}
            <div className="rounded-2xl bg-feature-loans/10 border border-feature-loans/20 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-feature-loans mb-1.5">
                <CheckCircle2 size={13} /> {t('prof.recTasks')}
              </p>
              <ul className="space-y-1.5">
                {recommendations.tasks.slice(0, 3).map((task, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground leading-snug">
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-feature-loans shrink-0" />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Eligible schemes */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <span className="text-base">🏛️</span> {t('prof.schemesEligible')}
          </p>
          <button
            onClick={() => onNavigate('schemes')}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            {t('prof.viewAll')} <ArrowRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {recommendations.schemes.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:bg-muted/70">
              <p className="text-xs font-extrabold text-foreground">{s.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming tasks mini + recent activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <ListTodo size={16} className="text-primary" /> {t('prof.upcomingMini')}
            </p>
            <button onClick={() => onNavigate('tasks')} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              {t('prof.viewAll')} <ArrowRight size={12} />
            </button>
          </div>
          {data.upcomingTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('prof.noTasksHint')}</p>
          ) : (
            <ul className="space-y-2.5">
              {data.upcomingTasks.slice(0, 3).map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground line-clamp-1">{task.label}</span>
                  <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
                    {task.date}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Activity size={16} className="text-primary" /> {t('prof.recentActivity')}
            </p>
            <button onClick={() => onNavigate('activity')} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              {t('prof.viewAll')} <ArrowRight size={12} />
            </button>
          </div>
          <ul className="space-y-2.5">
            {data.activities.slice(0, 3).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground line-clamp-1">{a.title}</span>
                <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{a.date}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
