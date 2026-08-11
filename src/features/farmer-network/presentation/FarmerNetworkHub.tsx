import React, { useState } from 'react';
import {
  ArrowLeft, Building2, CalendarCheck, ClipboardList, Handshake, Home, MessageCircle,
  ShieldCheck, Sprout, Store, Users, Wrench,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useFarmerNetwork } from './hooks/useFarmerNetwork';
import { AiRecommendations } from './components/AiRecommendations';
import { FarmersView } from './components/FarmersView';
import { ProvidersView } from './components/ProvidersView';
import { BuyersView } from './components/BuyersView';
import { RequirementsView } from './components/RequirementsView';
import { CommunityView } from './components/CommunityView';
import { ChatsView } from './components/ChatsView';
import { BookingsView } from './components/BookingsView';
import type { ServiceProvider } from '../domain/networkTypes';

type HubTab = 'home' | 'directory' | 'providers' | 'buyers' | 'requirements' | 'community' | 'chat' | 'bookings';

interface FarmerNetworkHubProps {
  onNavigate: (tab: string) => void;
  onToast?: (message: string) => void;
}

export const FarmerNetworkHub: React.FC<FarmerNetworkHubProps> = ({ onNavigate, onToast }) => {
  const { t } = useLanguage();
  const { state, unreadCount, openThreads, myBookings, recommendations, actions } = useFarmerNetwork();
  const [tab, setTab] = useState<HubTab>('home');
  const [focusProvider, setFocusProvider] = useState<string | null>(null);

  const tabs: Array<{ key: HubTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge?: number }> = [
    { key: 'home', label: t('fnet.tab.home'), icon: Home },
    { key: 'directory', label: t('fnet.tab.directory'), icon: Users },
    { key: 'providers', label: t('fnet.tab.providers'), icon: Wrench },
    { key: 'buyers', label: t('fnet.tab.buyers'), icon: Building2 },
    { key: 'requirements', label: t('fnet.tab.requirements'), icon: ClipboardList },
    { key: 'community', label: t('fnet.tab.community'), icon: Handshake },
    { key: 'chat', label: t('fnet.tab.chat'), icon: MessageCircle, badge: unreadCount },
    { key: 'bookings', label: t('fnet.tab.bookings'), icon: CalendarCheck },
  ];

  const handleBook = (provider: ServiceProvider, date: string) => {
    actions.createBooking({
      providerName: provider.name,
      providerId: provider.id,
      service: `${provider.category === 'tractor' ? 'Tractor' : provider.name.split(' ')[0]} — ${provider.pricing}`,
      date,
      amount: provider.pricing,
    });
    onToast?.(t('fnet.toast.bookingSent'));
  };

  const openProvider = (id: string) => {
    setFocusProvider(id);
    setTab('providers');
  };

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
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 shadow-colorful dark:text-amber-300">
            <Handshake size={19} />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-background">
              <ShieldCheck size={8} className="text-white" />
            </span>
          </span>
          <div>
            <h1 className="font-display text-lg font-black tracking-tight text-foreground">{t('fnet.title')}</h1>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {state.myVillage} · {state.myCrop}
            </p>
          </div>
        </div>
        <button
          onClick={() => setTab('chat')}
          className="relative rounded-xl border border-border bg-card p-2.5 text-muted-foreground shadow-card hover:text-foreground"
          aria-label={t('fnet.tab.chat')}
        >
          <MessageCircle size={15} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Stat strip */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <StatCard icon={Sprout} value={String(state.farmers.length)} label={t('fnet.stat.farmers')} tint="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" />
        <StatCard icon={Wrench} value={String(state.providers.length)} label={t('fnet.stat.providers')} tint="bg-amber-500/10 text-amber-700 dark:text-amber-300" />
        <StatCard icon={Building2} value={String(state.buyers.length)} label={t('fnet.stat.buyers')} tint="bg-violet-500/10 text-violet-700 dark:text-violet-300" />
        <StatCard icon={CalendarCheck} value={String(myBookings.length)} label={t('fnet.stat.bookings')} tint="bg-sky-500/10 text-sky-700 dark:text-sky-300" />
      </div>

      {/* Tabs */}
      <nav className="scrollbar-none -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
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
            {badge ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white">
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {tab === 'home' && (
        <AiRecommendations
          onGoTab={setTab}
          onOpenProvider={openProvider}
          crop={state.myCrop}
          trusted={recommendations.trusted}
          cheapest={recommendations.cheapest}
          fastest={recommendations.fastest}
          buyers={recommendations.buyers}
          farmers={recommendations.farmers}
          discussions={recommendations.discussions}
          onToast={onToast}
        />
      )}

      {tab === 'directory' && <FarmersView farmers={state.farmers} onToast={onToast} />}

      {tab === 'providers' && (
        <ProvidersView providers={state.providers} onToast={onToast} onBook={handleBook} />
      )}

      {tab === 'buyers' && <BuyersView buyers={state.buyers} onToast={onToast} />}

      {tab === 'requirements' && (
        <RequirementsView
          requirements={state.requirements}
          onPost={actions.postRequirement}
          onRespond={actions.respondToRequirement}
          onToast={onToast}
        />
      )}

      {tab === 'community' && (
        <CommunityView posts={state.community} onPost={actions.postCommunity} onLike={actions.likePost} onToast={onToast} />
      )}

      {tab === 'chat' && (
        <ChatsView threads={openThreads} onStart={actions.startThread} onSend={actions.sendMessage} onRead={actions.markThreadRead} onToast={onToast} />
      )}

      {tab === 'bookings' && (
        <BookingsView
          bookings={myBookings}
          onStatus={actions.setBookingStatus}
          onReview={actions.addReview}
          onToast={onToast}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  label: string;
  tint: string;
}> = ({ icon: Icon, value, label, tint }) => (
  <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-2 py-3 text-center shadow-card">
    <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', tint)}>
      <Icon size={14} />
    </span>
    <span className="mt-1.5 text-base font-black leading-none text-foreground">{value}</span>
    <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
  </div>
);
