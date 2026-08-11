import React, { useMemo, useState } from 'react';
import {
  Bot, Sparkles, CalendarRange, BrainCircuit, ArrowLeft, RefreshCw,
  MapPin, Sprout, Ruler, Droplet, CheckCheck, Trash2, TrendingUp, MessageSquareText,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import { useAdvisor } from './hooks/useAdvisor';
import { InsightCard } from './components/InsightCard';
import { WeeklyReportView } from './components/WeeklyReportView';
import {
  ackAll,
  buildDailyBrief,
  ensureWeeklyReport,
  clearAdvisorMemory,
  resetAdvisorData,
} from '../domain/advisorStore';
import type { InsightSeverity } from '../domain/advisorTypes';

type HubTab = 'daily' | 'weekly' | 'memory';

const SEVERITY_FILTERS: Array<{ value: InsightSeverity | 'all'; label: string; dot: string }> = [
  { value: 'all', label: 'All', dot: 'bg-slate-400' },
  { value: 'critical', label: 'Severe', dot: 'bg-rose-500' },
  { value: 'warning', label: 'Watch', dot: 'bg-amber-500' },
  { value: 'info', label: 'Info', dot: 'bg-sky-500' },
  { value: 'positive', label: 'Good news', dot: 'bg-emerald-500' },
];

interface AdvisorHubProps {
  onNavigate: (tab: string) => void;
  onToast?: (message: string) => void;
}

export const AdvisorHub: React.FC<AdvisorHubProps> = ({ onNavigate, onToast }) => {
  const { t } = useLanguage();
  const { state, regenerating } = useAdvisor();
  const [tab, setTab] = useState<HubTab>('daily');
  const [severity, setSeverity] = useState<InsightSeverity | 'all'>('all');

  const memory = state.memory;
  const brief = state.brief;
  const weekly = useMemo(() => ensureWeeklyReport(), []);

  const insights = useMemo(() => {
    const list = tab === 'weekly' ? (weekly?.recommendations ?? []) : state.insights;
    return severity === 'all' ? list : list.filter((i) => i.severity === severity);
  }, [state, weekly, tab, severity]);

  const unackedCount = state.insights.filter((i) => !i.acked).length;

  const handleRefresh = () => {
    buildDailyBrief();
    onToast?.(t('adv.toast.refreshed'));
  };

  const tabs: Array<{ key: HubTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { key: 'daily', label: t('adv.tab.daily'), icon: Sparkles },
    { key: 'weekly', label: t('adv.tab.weekly'), icon: CalendarRange },
    { key: 'memory', label: t('adv.tab.memory'), icon: BrainCircuit },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-36 pt-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('home')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card hover:text-foreground"
              aria-label={t('adv.back')}
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl gradient-ai text-primary-foreground shadow-colorful">
            <Bot size={19} />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background animate-live-pulse" />
          </span>
          <div>
            <h1 className="font-display text-lg font-black tracking-tight text-foreground">{t('adv.title')}</h1>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {memory.farmer.name} · {t('adv.subtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground shadow-card hover:text-foreground"
          aria-label={t('adv.refresh')}
        >
          <RefreshCw size={15} className={regenerating ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Memory chips — what the advisor knows about you */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { icon: MapPin, label: memory.farmer.village },
          { icon: Sprout, label: `${memory.farm.crop} · ${memory.farm.stage}` },
          { icon: Ruler, label: `${memory.farm.area} acres` },
          { icon: Droplet, label: memory.farm.soilType },
          { icon: TrendingUp, label: `${t('adv.memory.level')} ${memory.dataCompleteness}%` },
        ].map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-card"
          >
            <Icon size={12} className="text-forest" />
            {label}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <nav className="mt-4 flex rounded-2xl border border-border bg-card p-1 shadow-card">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
              tab === key ? 'bg-forest text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={13} />
            {label}
            {key === 'daily' && unackedCount > 0 && (
              <span className="rounded-full bg-rose-600 px-1.5 text-[9px] font-black text-white">{unackedCount}</span>
            )}
          </button>
        ))}
      </nav>

      {tab === 'daily' && (
        <>
          {/* Brief header */}
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-violet-500" />
              <h2 className="text-sm font-black text-foreground">
                {t('adv.brief.title')} {brief?.id ?? ''}
              </h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {brief
                ? interpolateBrief(t, memory, brief)
                : t('adv.brief.empty')}
            </p>
            {unackedCount > 0 && (
              <button
                onClick={ackAll}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground"
              >
                <CheckCheck size={13} />
                {t('adv.ackAll')}
              </button>
            )}
          </div>

          {/* Severity filter */}
          <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {SEVERITY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setSeverity(f.value)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                  severity === f.value ? 'bg-forest text-primary-foreground' : 'border border-border bg-card text-muted-foreground',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', severity === f.value ? 'bg-white' : f.dot)} />
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2.5">
            {insights.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 py-14 text-center">
                <Sparkles size={34} className="mb-3 text-muted-foreground/40" />
                <p className="text-sm font-bold text-foreground">{t('adv.empty.title')}</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t('adv.empty.body')}</p>
              </div>
            ) : (
              insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} onNavigate={onNavigate} />
              ))
            )}
          </div>
        </>
      )}

      {tab === 'weekly' && (
        <div className="mt-4">
          {weekly ? (
            <WeeklyReportView report={weekly} onNavigate={onNavigate} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('adv.empty.body')}</p>
          )}
        </div>
      )}

      {tab === 'memory' && (
        <div className="mt-4 space-y-3">
          {/* What the advisor remembers */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <BrainCircuit size={16} className="text-violet-500" />
              <h2 className="text-sm font-black text-foreground">{t('adv.memory.knows')}</h2>
            </div>
            <ul className="mt-3 space-y-2.5">
              {[
                { icon: MapPin, line: interpolate(t('adv.memory.farmer'), { name: memory.farmer.name, village: memory.farmer.village }) },
                { icon: Sprout, line: interpolate(t('adv.memory.crop'), { crop: memory.farm.crop, variety: memory.farm.variety, stage: memory.farm.stage }) },
                { icon: Ruler, line: interpolate(t('adv.memory.farm'), { area: memory.farm.area, soil: memory.farm.soilType }) },
                { icon: MessageSquareText, line: interpolate(t('adv.memory.activity'), { chats: memory.activities.chatCount, scans: memory.activities.scanCount, orders: memory.activities.orderCount, bookings: memory.activities.bookingCount }) },
              ].map(({ icon: Icon, line }, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon size={13} />
                  </span>
                  <p className="text-[13px] leading-snug text-muted-foreground">{line}</p>
                </li>
              ))}
            </ul>

            {/* Learned patterns */}
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{t('adv.memory.learned')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(memory.learned.patterns.length > 0 || memory.learned.preferredAlerts.length > 0 ? [...memory.learned.preferredAlerts, ...memory.learned.patterns] : []).length === 0 ? (
                  <p className="text-xs font-semibold text-muted-foreground/70">{t('adv.memory.learning')}</p>
                ) : (
                  [...memory.learned.preferredAlerts].map((p) => (
                    <span key={p} className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                      {t(`adv.type.${p}`)}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { clearAdvisorMemory(); onToast?.(t('adv.toast.memoryCleared')); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <Trash2 size={13} />
              {t('adv.memory.clear')}
            </button>
            <button
              onClick={() => { resetAdvisorData(); onToast?.(t('adv.toast.reseeded')); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <RefreshCw size={13} />
              {t('adv.memory.reset')}
            </button>
            <button
              onClick={() => onNavigate('ai-chat')}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 dark:bg-emerald-600"
            >
              <MessageSquareText size={13} />
              {t('adv.action.ask')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Brief subtitle line — "{crop} · {stage} · {place}" with weekday. */
function interpolateBrief(t: (k: string) => string, memory: { farm: { crop: string; stage: string; area: number }; weather: { location: string }; farmer: { village: string } }, brief: { location: string; crop: string; stage: string }): string {
  const place = memory.weather.location || brief.location || memory.farmer.village;
  const weekday = new Date().toLocaleDateString('en-IN', { weekday: 'long' });
  return t('adv.brief.line')
    .replace('{weekday}', weekday)
    .replace('{crop}', brief.crop)
    .replace('{stage}', brief.stage)
    .replace('{place}', place);
}
