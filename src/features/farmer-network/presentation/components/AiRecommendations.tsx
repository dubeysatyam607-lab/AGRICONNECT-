import React from 'react';
import { ArrowRight, Bot, CircleDollarSign, Crown, Flame, Sparkles, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
import { StarRating } from './StarRating';
import type { BuyerScored, FarmerScored, ProviderScored } from '../../domain/networkAI';

interface AiRecommendationsProps {
  onGoTab: (tab: string) => void;
  onOpenProvider: (id: string) => void;
  crop: string;
  trusted: ProviderScored[];
  cheapest: ProviderScored[];
  fastest: ProviderScored[];
  buyers: BuyerScored[];
  farmers: FarmerScored[];
  discussions: string[];
  onToast?: (message: string) => void;
}

export const AiRecommendations: React.FC<AiRecommendationsProps> = ({
  onGoTab,
  onOpenProvider,
  crop,
  trusted,
  cheapest,
  fastest,
  buyers,
  farmers,
  discussions,
  onToast,
}) => {
  const { t } = useLanguage();

  return (
    <div className="mt-4 space-y-4">
      {/* AI banner */}
      <div className="rounded-2xl gradient-ai p-4 text-primary-foreground shadow-colorful">
        <div className="flex items-center gap-2">
          <Bot size={16} />
          <h2 className="text-sm font-black">{t('fnet.ai.title')}</h2>
        </div>
        <p className="mt-1.5 text-xs font-semibold leading-relaxed opacity-90">
          {interpolate(t('fnet.ai.subtitle'), { crop })}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {discussions.map((d) => (
            <button
              key={d}
              onClick={() => { onGoTab('community'); onToast?.(d); }}
              className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold backdrop-blur hover:bg-white/25"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <RecSection
        icon={Crown}
        tint="bg-amber-500/10 text-amber-600 dark:text-amber-300"
        title={t('fnet.ai.trusted')}
        cta={t('fnet.ai.seeAll')}
        onCta={() => onGoTab('providers')}
      >
        {trusted.slice(0, 3).map(({ provider, reasons }) => (
          <button
            key={provider.id}
            onClick={() => onOpenProvider(provider.id)}
            className="flex w-full items-center gap-3 rounded-xl bg-background/60 p-3 text-left transition-colors hover:bg-background"
          >
            <Avatar user={provider} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-black text-foreground">{provider.name}</span>
                <span className="shrink-0 text-[10px] font-black text-forest">{provider.pricing}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <StarRating rating={provider.rating} reviews={provider.reviews} size={10} showCount={false} />
                <span className="truncate text-[10px] font-semibold text-muted-foreground">{reasons.join(' · ')}</span>
              </div>
            </div>
          </button>
        ))}
      </RecSection>

      <RecSection
        icon={CircleDollarSign}
        tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        title={t('fnet.ai.cheapest')}
        cta={t('fnet.ai.seeAll')}
        onCta={() => onGoTab('providers')}
      >
        {cheapest.slice(0, 2).map(({ provider, reasons }) => (
          <button
            key={provider.id}
            onClick={() => onOpenProvider(provider.id)}
            className="flex w-full items-center gap-3 rounded-xl bg-background/60 p-3 text-left transition-colors hover:bg-background"
          >
            <Avatar user={provider} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-foreground">
                {provider.name} · <span className="text-forest">{provider.pricing}</span>
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">{reasons.join(' · ')}</p>
            </div>
          </button>
        ))}
      </RecSection>

      <RecSection
        icon={Flame}
        tint="bg-rose-500/10 text-rose-600 dark:text-rose-300"
        title={t('fnet.ai.fastest')}
        cta={t('fnet.ai.seeAll')}
        onCta={() => onGoTab('providers')}
      >
        {fastest.slice(0, 2).map(({ provider, reasons }) => (
          <button
            key={provider.id}
            onClick={() => onOpenProvider(provider.id)}
            className="flex w-full items-center gap-3 rounded-xl bg-background/60 p-3 text-left transition-colors hover:bg-background"
          >
            <Avatar user={provider} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-foreground">{provider.name}</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">{reasons.join(' · ')}</p>
            </div>
          </button>
        ))}
      </RecSection>

      <RecSection
        icon={Users}
        tint="bg-violet-500/10 text-violet-600 dark:text-violet-300"
        title={t('fnet.ai.buyers')}
        cta={t('fnet.ai.seeAll')}
        onCta={() => onGoTab('buyers')}
      >
        {buyers.map(({ buyer, reasons }) => (
          <button
            key={buyer.id}
            onClick={() => onGoTab('buyers')}
            className="flex w-full items-center gap-3 rounded-xl bg-background/60 p-3 text-left transition-colors hover:bg-background"
          >
            <Avatar user={buyer} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-foreground">
                {buyer.name} · <span className="text-violet-500">{buyer.lookingFor}</span>
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">{reasons.join(' · ')}</p>
            </div>
          </button>
        ))}
      </RecSection>

      <RecSection
        icon={Sparkles}
        tint="bg-sky-500/10 text-sky-600 dark:text-sky-300"
        title={t('fnet.ai.farmers')}
        cta={t('fnet.ai.seeAll')}
        onCta={() => onGoTab('directory')}
      >
        {farmers.slice(0, 2).map(({ farmer, reasons }) => (
          <button
            key={farmer.id}
            onClick={() => onGoTab('directory')}
            className="flex w-full items-center gap-3 rounded-xl bg-background/60 p-3 text-left transition-colors hover:bg-background"
          >
            <Avatar user={farmer} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-foreground">{farmer.name}</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">{reasons.join(' · ')}</p>
            </div>
          </button>
        ))}
      </RecSection>
    </div>
  );
};

const RecSection: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tint: string;
  title: string;
  cta: string;
  onCta: () => void;
  children: React.ReactNode;
}> = ({ icon: Icon, tint, title, cta, onCta, children }) => (
  <section className="rounded-2xl border border-border bg-card p-3.5 shadow-card">
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg', tint)}>
          <Icon size={13} />
        </span>
        {title}
      </h3>
      <button onClick={onCta} className="flex items-center gap-0.5 text-[11px] font-bold text-forest hover:underline">
        {cta}
        <ArrowRight size={11} />
      </button>
    </div>
    <div className="mt-2.5 space-y-1.5">{children}</div>
  </section>
);
