import React, { useMemo, useState } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { EntityCard } from './EntityCard';
import type { BuyerType, Buyer } from '../../domain/networkTypes';

const TYPES: Array<{ key: BuyerType | 'all' }> = [
  { key: 'all' },
  { key: 'wholesaler' },
  { key: 'retailer' },
  { key: 'processor' },
  { key: 'exporter' },
  { key: 'fpo' },
];

interface BuyersViewProps {
  buyers: Buyer[];
  onToast?: (message: string) => void;
}

export const BuyersView: React.FC<BuyersViewProps> = ({ buyers, onToast }) => {
  const { t } = useLanguage();
  const [type, setType] = useState<BuyerType | 'all'>('all');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    let base = buyers;
    if (type !== 'all') base = base.filter((b) => b.buyerType === type);
    if (query.trim()) {
      const q = query.toLowerCase();
      base = base.filter((b) =>
        [b.name, b.lookingFor, b.village, b.state].join(' ').toLowerCase().includes(q),
      );
    }
    return base;
  }, [buyers, type, query]);

  return (
    <div className="mt-4">
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TYPES.map(({ key }) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
              type === key ? 'bg-forest text-primary-foreground' : 'border border-border bg-card text-muted-foreground',
            )}
          >
            {t(`fnet.buyerType.${key}`)}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label className="relative block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('fnet.search.buyer')}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:border-forest"
          />
        </label>
      </div>

      <div className="mt-3 space-y-3">
        {list.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
            <ShoppingBag size={30} className="mb-2 text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">{t('fnet.empty.title')}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t('fnet.empty.buyers')}</p>
          </div>
        ) : (
          list.map((buyer) => <EntityCard key={buyer.id} entity={buyer} onToast={onToast} />)
        )}
      </div>
    </div>
  );
};
