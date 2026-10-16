import React, { useState } from 'react';
import {
  ArrowLeft, BarChart3, CalendarClock, ChevronDown, Cpu, HeartPulse, Layers,
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
import HardwareDashboard from '@/components/agri/HardwareDashboard';

type HubTab = 'today' | 'timeline' | 'calendar' | 'health' | 'finance' | 'reports' | 'farms' | 'iot';

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
    { key: 'iot', label: 'IoT Sensors', icon: Cpu },
    { key: 'timeline', label: t('fos.tab.timeline'), icon: ListTree },
    { key: 'calendar', label: t('fos.tab.calendar'), icon: CalendarClock },
    { key: 'health', label: t('fos.tab.health'), icon: HeartPulse },
    { key: 'finance', label: t('fos.tab.finance'), icon: Wallet },
    { key: 'reports', label: t('fos.tab.reports'), icon: BarChart3 },
    { key: 'farms', label: t('fos.tab.farms'), icon: Layers },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pb-36 pt-4 space-y-6">
      {/* ── FLAGSHIP HERO HEADER ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/20 via-card to-emerald-900/10 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            {onNavigate && (
              <button
                onClick={() => onNavigate('home')}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card/80 text-muted-foreground shadow-sm hover:text-foreground hover:border-emerald-500/40 transition-all shrink-0"
                aria-label={t('common.back')}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-md shrink-0">
              <Sprout size={24} />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-background">
                <Sparkles size={8} />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  {t('fos.title') || 'Digital Farm Twin'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  Farm OS
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {t('fos.subtitle') || 'Living digital twin · health score · smart calendar · crop ledger'}
              </p>
            </div>
          </div>

          {/* Farm switcher pill */}
          <div className="relative self-start md:self-auto">
            <button
              onClick={() => setFarmOpen((o) => !o)}
              className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-card/90 px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:border-emerald-500 hover:bg-emerald-500/5 transition-all"
            >
              <div className="w-5 h-5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MapPinned size={12} />
              </div>
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{data.activeFarm.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-mono">
                {data.activeFarm.areaAcres} ac
              </span>
              <ChevronDown size={14} className="shrink-0 text-muted-foreground ml-0.5" />
            </button>

            {farmOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFarmOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-border bg-card p-2 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1">
                    Select Farm Twin
                  </p>
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
                        'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition-all',
                        f.id === data.activeFarm.id
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold'
                          : 'text-foreground hover:bg-muted',
                      )}
                    >
                      <div className="truncate">
                        <p className="truncate">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground font-normal">{f.village}, {f.district}</p>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {f.areaAcres} ac
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION BAR ──────────────────────────────────────────────── */}
      <nav className="scrollbar-none flex gap-2 overflow-x-auto pb-1 p-1 bg-muted/40 rounded-2xl border border-border/70 backdrop-blur-sm">
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'relative inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200',
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/70',
              )}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-muted-foreground'} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── VIEWS CONTENT ────────────────────────────────────────────────────── */}
      <div className="pt-1">
        {tab === 'today' && <OverviewView data={data} onView={(v) => setTab(v as HubTab)} />}
        {tab === 'iot' && <HardwareDashboard />}
        {tab === 'timeline' && <TimelineView data={data} onToast={(m) => onToast?.(m)} />}
        {tab === 'calendar' && <CalendarView data={data} onToast={(m) => onToast?.(m)} />}
        {tab === 'health' && <HealthView data={data} />}
        {tab === 'finance' && <FinanceView data={data} onToast={(m) => onToast?.(m)} />}
        {tab === 'reports' && <ReportsView data={data} onToast={(m) => onToast?.(m)} />}
        {tab === 'farms' && <FarmsView data={data} onToast={(m) => onToast?.(m)} />}
      </div>
    </div>
  );
};
