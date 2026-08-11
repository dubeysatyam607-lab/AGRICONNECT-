import React, { useMemo, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { EntityCard } from './EntityCard';
import type { FarmerCategory, FarmerProfile } from '../../domain/networkTypes';

const SEGMENTS: Array<{ key: FarmerCategory | 'all' }> = [
  { key: 'all' },
  { key: 'verified' },
  { key: 'progressive' },
  { key: 'organic' },
  { key: 'women' },
  { key: 'young' },
  { key: 'fpo' },
  { key: 'nearby' },
];

interface FarmersViewProps {
  farmers: FarmerProfile[];
  onToast?: (message: string) => void;
}

export const FarmersView: React.FC<FarmersViewProps> = ({ farmers, onToast }) => {
  const { t } = useLanguage();
  const [segment, setSegment] = useState<FarmerCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    let base = farmers;
    if (segment !== 'all') base = base.filter((f) => f.farmerType === segment);
    if (query.trim()) {
      const q = query.toLowerCase();
      base = base.filter((f) =>
        [f.name, f.village, f.district, f.state, ...f.produce].join(' ').toLowerCase().includes(q),
      );
    }
    return [...base].sort((a, b) => a.distanceKm - b.distanceKm);
  }, [farmers, segment, query]);

  return (
    <div className="mt-4">
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {SEGMENTS.map(({ key }) => (
          <button
            key={key}
            onClick={() => setSegment(key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
              segment === key ? 'bg-forest text-primary-foreground' : 'border border-border bg-card text-muted-foreground',
            )}
          >
            {t(`fnet.segment.${key}`)}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label className="relative block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('fnet.search.farmer')}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-forest"
          />
        </label>
      </div>

      <div className="mt-3 space-y-3">
        {list.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
            <UserRound size={30} className="mb-2 text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">{t('fnet.empty.title')}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t('fnet.empty.farmers')}</p>
          </div>
        ) : (
          list.map((farmer) => <EntityCard key={farmer.id} entity={farmer} onToast={onToast} />)
        )}
      </div>
    </div>
  );
};
