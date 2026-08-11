import React, { useState } from 'react';
import {
  ArrowLeft, BarChart3, CalendarClock, ChevronDown, HeartPulse, Layers,
  ListTree, MapPinned, Sparkles, Sprout, Wallet,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useFarmOs } from './hooks/useFarmOs';
import { OverviewView } from './components/OverviewView';
import { TimelineView } from './components/TimelineView';
import { CalendarView } from './components/CalendarView';
import { HealthView } from './components/HealthView';
import { FinanceView } from './components/FinanceView';
import { ReportsView } from './components/ReportsView';
import { FarmsView } from './components/FarmsView';

type HubTab = 'today' | 'timeline' | 'calendar' | 'health' | 'finance' | 'reports' | 'farms';

interface FarmOsHubProps {
  onNavigate: (tab: string) => void;
  onToast?: (message: string) => void;
}

export const FarmOsHub: React.FC<FarmOsHubProps> = ({ onNavigate, onToast }) => {
  const { t } = useLanguage();
  const data = useFarmOs();
  const [tab, setTab] = useState<HubTab>('today');
  const [farmOpen, setFarmOpen] = useState(false);

  const tabs: Array<{ key: HubTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { key: 'today', label: t('fos.tab.today'), icon: Sparkles },
    { key: 'timeline', label: t('fos.tab.timeline'), icon: ListTree },
    { key: 'calendar', label: t('fos.tab.calendar'), icon: CalendarClock },
    { key: 'health', label: t('fos.tab.health'), icon: HeartPulse },
    { key: 'finance', label: t('fos.tab.finance'), icon: Wallet },
    { key: 'reports', label: t('fos.tab.reports'), icon: BarChart3 },
    { key: 'farms', label: t('fos.tab.farms'), icon: Layers },
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
              aria-label={t('common.back')}
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-primary-foreground shadow-colorful">
            <Sprout size={19} />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-background">
              <Sparkles size={8} className="text-white" />
            </span>
          </span>
          <div>
            <h1 className="font-display text-lg font-black tracking-tight text-foreground">{t('fos.title')}</h1>
            <p className="text-[11px] font-semibold text-muted-foreground">{t('fos.subtitle')}</p>
          </div>
        </div>
        {/* Farm switcher */}
        <div className="relative">
          <button
            onClick={() => setFarmOpen((o) => !o)}
            className="flex max-w-[150px] items-center gap-1 rounded-full border border-border bg-card py-1.5 pl-2.5 pr-2 text-[11px] font-black text-foreground shadow-card hover:border-emerald-300"
          >
            <MapPinned size={12} className="shrink-0 text-emerald-600 dark:text-emerald-300" />
            <span className="truncate">{data.activeFarm.name}</span>
            <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
          </button>
          {farmOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFarmOpen(false)} />
              <div className="absolute right-0 top-9 z-50 w-52 rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                {data.state.farms.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      if (f.id !== data.activeFarm.id) {
                        data.actions.switchFarm(f.id);
                        onToast?.(t('fos.toast.switched').replace('{name}', f.name));
                      }
                      setFarmOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold transition-colors',
                      f.id === data.activeFarm.id ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-[9px] font-black text-muted-foreground">{f.areaAcres} ac</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <nav className="scrollbar-none -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors',
              tab === key ? 'bg-forest text-primary-foreground shadow-sm dark:bg-emerald-600' : 'border border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </nav>

      {/* Views */}
      {tab === 'today' && <OverviewView data={data} onView={(v) => setTab(v as HubTab)} />}
      {tab === 'timeline' && <TimelineView data={data} onToast={(m) => onToast?.(m)} />}
      {tab === 'calendar' && <CalendarView data={data} onToast={(m) => onToast?.(m)} />}
      {tab === 'health' && <HealthView data={data} />}
      {tab === 'finance' && <FinanceView data={data} onToast={(m) => onToast?.(m)} />}
      {tab === 'reports' && <ReportsView data={data} onToast={(m) => onToast?.(m)} />}
      {tab === 'farms' && <FarmsView data={data} onToast={(m) => onToast?.(m)} />}
    </div>
  );
};
