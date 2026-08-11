import React, { Component, lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { LayoutDashboard, Sprout, Wrench, CalendarCheck2, Activity, ListTodo, BarChart3, Bell, Settings, ArrowLeft, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useDigitalProfile } from './hooks/useDigitalProfile';
import { ProfileHero } from './components/ProfileHero';
import { EditFarmerProfileView } from '@/features/profile/presentation/views/EditFarmerProfileView';

const OverviewSection = lazy(() => import('./sections/OverviewSection').then((m) => ({ default: m.OverviewSection })));
const MyFarmSection = lazy(() => import('./sections/MyFarmSection').then((m) => ({ default: m.MyFarmSection })));
const EquipmentSection = lazy(() => import('./sections/EquipmentSection').then((m) => ({ default: m.EquipmentSection })));
const BookingsSection = lazy(() => import('./sections/BookingsSection').then((m) => ({ default: m.BookingsSection })));
const ActivitiesSection = lazy(() => import('./sections/ActivitiesSection').then((m) => ({ default: m.ActivitiesSection })));
const TaskManagerSection = lazy(() => import('./sections/TaskManagerSection').then((m) => ({ default: m.TaskManagerSection })));
const AnalyticsSection = lazy(() => import('./sections/AnalyticsSection').then((m) => ({ default: m.AnalyticsSection })));
const NotificationsSection = lazy(() => import('./sections/NotificationsSection').then((m) => ({ default: m.NotificationsSection })));
const SettingsSection = lazy(() => import('./sections/SettingsSection').then((m) => ({ default: m.SettingsSection })));

type SectionId = 'overview' | 'my-farm' | 'equipment' | 'bookings' | 'activity' | 'tasks' | 'analytics' | 'notifications' | 'settings';

const SECTION_IDS: SectionId[] = ['overview', 'my-farm', 'equipment', 'bookings', 'activity', 'tasks', 'analytics', 'notifications', 'settings'];

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

class SectionBoundary extends Component<ErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-bold text-foreground">Something went wrong while loading this section.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset?.();
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground active:scale-95 transition-transform"
          >
            <RefreshCw size={13} /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface DigitalProfileDashboardProps {
  onNavigate: (tab: string) => void;
}

const SectionFallback: React.FC = () => (
  <div className="space-y-4">
    {[0, 1, 2].map((i) => (
      <Skeleton key={i} className="h-28 rounded-2xl" />
    ))}
  </div>
);

export const DigitalProfileDashboard: React.FC<DigitalProfileDashboardProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const data = useDigitalProfile();
  const [section, setSection] = useState<SectionId>('overview');
  const [editing, setEditing] = useState(false);
  const [pull, setPull] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const pullRef = useRef(0);

  const tabs = useMemo(
    () =>
      SECTION_IDS.map((id) => ({
        id,
        icon:
          id === 'overview' ? LayoutDashboard
          : id === 'my-farm' ? Sprout
          : id === 'equipment' ? Wrench
          : id === 'bookings' ? CalendarCheck2
          : id === 'activity' ? Activity
          : id === 'tasks' ? ListTodo
          : id === 'analytics' ? BarChart3
          : id === 'notifications' ? Bell
          : Settings,
        label: t(
          id === 'overview' ? 'prof.overview'
          : id === 'my-farm' ? 'prof.myFarm'
          : id === 'equipment' ? 'prof.equipment'
          : id === 'bookings' ? 'prof.bookings'
          : id === 'activity' ? 'prof.activities'
          : id === 'tasks' ? 'prof.tasks'
          : id === 'analytics' ? 'prof.analytics'
          : id === 'notifications' ? 'prof.notifications'
          : 'prof.settings',
        ),
      })),
    [t],
  );

  const handleSectionNav = useCallback(
    (tab: string) => {
      if ((SECTION_IDS as string[]).includes(tab)) {
        setSection(tab as SectionId);
        return;
      }
      onNavigate(tab);
    },
    [onNavigate],
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      touchStartY.current = e.touches[0].clientY;
      pullRef.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && window.scrollY <= 0) {
      pullRef.current = Math.min(120, delta * 0.6);
      setPull(pullRef.current);
    }
  };

  const handleTouchEnd = () => {
    if (pullRef.current >= 80) {
      data.refresh();
    }
    touchStartY.current = null;
    pullRef.current = 0;
    setPull(0);
  };

  const renderSection = () => {
    const common = {
      data,
      onNavigate: handleSectionNav,
    };
    switch (section) {
      case 'overview': return <OverviewSection {...common} />;
      case 'my-farm': return <MyFarmSection data={data} />;
      case 'equipment': return <EquipmentSection data={data} />;
      case 'bookings': return <BookingsSection data={data} />;
      case 'activity': return <ActivitiesSection data={data} />;
      case 'tasks': return <TaskManagerSection data={data} />;
      case 'analytics': return <AnalyticsSection data={data} />;
      case 'notifications': return <NotificationsSection {...common} />;
      case 'settings': return <SettingsSection {...common} />;
      default: return <OverviewSection {...common} />;
    }
  };

  if (editing) {
    return (
      <div className="min-h-screen w-full bg-background">
        <div className="w-full mx-auto lg:max-w-4xl xl:max-w-6xl px-4 pt-4">
          <EditFarmerProfileView onSuccess={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full bg-background pb-2"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pull, opacity: pull > 0 ? 1 : 0 }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[10px] font-extrabold text-muted-foreground">
          <RefreshCw size={11} className={`${pull >= 80 ? 'animate-spin' : ''}`} />
          {pull >= 80 ? t('prof.releaseRefresh') : t('prof.pullRefresh')}
        </span>
      </div>

      <div className="w-full mx-auto lg:max-w-4xl xl:max-w-6xl px-4">
        <div className="pt-3 flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-card hover:text-foreground transition-colors"
          >
            <ArrowLeft size={13} /> {t('prof.backHome')}
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">{t('prof.digitalProfile')}</span>
        </div>

        {/* Hero */}
        <div className="mt-4">
          <ProfileHero
            profile={data.profile}
            loading={data.profileLoading}
            memberSince={data.memberSince}
            completion={data.completion}
            farmScore={data.farmScore}
            aiReadiness={data.aiReadiness}
            onEdit={() => setEditing(true)}
            onRefresh={data.refresh}
          />
        </div>

        {/* Section tabs */}
        <nav aria-label="Profile sections" className="sticky top-2 z-30 -mx-4 mt-5 px-4 py-1 bg-background/85 backdrop-blur-lg">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === section;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSection(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-extrabold transition-all ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-glow'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground shadow-card'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Active section */}
        <SectionBoundary onReset={() => setSection('overview')}>
          <Suspense fallback={<SectionFallback />}>
            <div className="mt-5" key={section}>
              {renderSection()}
            </div>
          </Suspense>
        </SectionBoundary>
      </div>
    </div>
  );
};
