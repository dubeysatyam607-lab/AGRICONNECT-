import React, { useMemo, useState } from 'react';
import { Search, Tractor, ArrowDownAZ, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { EntityCard } from './EntityCard';
import { recommendTrustedProviders } from '../../domain/networkAI';
import type { ServiceCategory, ServiceProvider } from '../../domain/networkTypes';

type SortMode = 'recommended' | 'price' | 'fastest';

const CATEGORIES: Array<{ key: ServiceCategory | 'all'; icon: string }> = [
  { key: 'all', icon: '🌾' },
  { key: 'tractor', icon: '🚜' },
  { key: 'harvesting', icon: '🌾' },
  { key: 'threshing', icon: '🪘' },
  { key: 'drone', icon: '🛸' },
  { key: 'soil-testing', icon: '🧪' },
  { key: 'cold-storage', icon: '❄️' },
  { key: 'transport', icon: '🚚' },
  { key: 'labour', icon: '👷' },
  { key: 'mechanic', icon: '🔧' },
  { key: 'veterinary', icon: '🐄' },
  { key: 'consultant', icon: '🧑‍🌾' },
];

interface ProvidersViewProps {
  providers: ServiceProvider[];
  onToast?: (message: string) => void;
  onBook?: (provider: ServiceProvider, date: string) => void;
}

export const ProvidersView: React.FC<ProvidersViewProps> = ({ providers, onToast, onBook }) => {
  const { t } = useLanguage();
  const [category, setCategory] = useState<ServiceCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('recommended');

  const list = useMemo(() => {
    let base = providers;
    if (category !== 'all') base = base.filter((p) => p.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      base = base.filter((p) =>
        [p.name, p.village, p.district, p.state, ...p.skills].join(' ').toLowerCase().includes(q),
      );
    }
    if (sort === 'price') {
      const amount = (p: ServiceProvider) => Number(p.pricing.replace(/[^\d]/g, '')) || 0;
      return [...base].sort((a, b) => amount(a) - amount(b));
    }
    if (sort === 'fastest') {
      return [...base].sort((a, b) => a.responseMins - b.responseMins);
    }
    return recommendTrustedProviders(category === 'all' ? undefined : category, 15, {
      version: 1, myName: '', myVillage: '', myCrop: '', providers: base,
      farmers: [], buyers: [], requirements: [], community: [], threads: [], bookings: [], reviews: [],
    }).map(({ provider }) => provider);
  }, [providers, category, query, sort]);

  return (
    <div className="mt-4">
      {/* Category chips */}
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {CATEGORIES.map(({ key, icon }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
              category === key ? 'bg-forest text-primary-foreground' : 'border border-border bg-card text-muted-foreground',
            )}
          >
            <span aria-hidden>{icon}</span>
            {t(`fnet.category.${key}`)}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="mt-3 flex gap-2">
        <label className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('fnet.search.provider')}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-forest"
          />
        </label>
        <button
          onClick={() => setSort(sort === 'recommended' ? 'price' : sort === 'price' ? 'fastest' : 'recommended')}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold text-muted-foreground"
          aria-label={t('fnet.sort')}
        >
          {sort === 'recommended' && <Tractor size={13} />}
          {sort === 'price' && <ArrowDownAZ size={13} />}
          {sort === 'fastest' && <Clock size={13} />}
          {t(`fnet.sort.${sort}`)}
        </button>
      </div>

      {/* List */}
      <div className="mt-3 space-y-3">
        {list.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
            <Search size={30} className="mb-2 text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">{t('fnet.empty.title')}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t('fnet.empty.providers')}</p>
          </div>
        ) : (
          list.map((provider) => (
            <EntityCard key={provider.id} entity={provider} onToast={onToast} onBook={onBook} />
          ))
        )}
      </div>
    </div>
  );
};
