import React, { useMemo, useState } from 'react';
import { MapPin, LocateFixed, Search, X, Plus, Trash2, Check } from 'lucide-react';
import { useLocation, FarmLocation } from '@/features/location/LocationContext';
import { forwardGeocode, ForwardGeocodeResult } from '@/features/location/forwardGeocode';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface LocationSelectorProps {
  className?: string;
  onLocationSelected?: () => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ className, onLocationSelected }) => {
  const { t } = useLanguage();
  const { location, farms, farmsLoading, requestGps, setManual, setActiveFarm, addFarm, removeFarm } = useLocation();

  const [showManual, setShowManual] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ForwardGeocodeResult[]>([]);
  const [showAddFarm, setShowAddFarm] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [selectedResult, setSelectedResult] = useState<ForwardGeocodeResult | null>(null);

  const status = location.status;

  const runSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await forwardGeocode(q));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (r: ForwardGeocodeResult) => {
    setManual({
      latitude: r.latitude,
      longitude: r.longitude,
      city: r.city || r.displayName.split(',')[0],
      district: r.district,
      state: r.state,
      pincode: r.pincode,
    });
    setShowManual(false);
    setQuery('');
    setResults([]);
    setSelectedResult(null);
    onLocationSelected?.();
  };

  const addFarmFromResult = async () => {
    if (!selectedResult) return;
    const farm = await addFarm({
      name: farmName.trim() || selectedResult.city || selectedResult.displayName.split(',')[0],
      latitude: selectedResult.latitude,
      longitude: selectedResult.longitude,
      state: selectedResult.state,
      district: selectedResult.district,
      village: selectedResult.city,
      pincode: selectedResult.pincode,
    });
    if (farm) {
      setShowAddFarm(false);
      setFarmName('');
      setSelectedResult(null);
    }
  };

  const currentLabel = useMemo(() => {
    if (status === 'loading') return t('loc.pleaseWait');
    if (status === 'error') return t('loc.unavailable');
    return [location.city || location.village, location.district, location.state]
      .filter(Boolean)
      .join(', ') || t('loc.yourLocation');
  }, [status, location, t]);

  return (
    <div className={cn('rounded-2xl border border-border bg-card p-4 shadow-card', className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest/10 text-forest dark:bg-emerald-600/15 dark:text-emerald-400">
          <MapPin size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t('loc.title')}</p>
          <p className="mt-0.5 truncate text-sm font-black text-foreground">{currentLabel}</p>

          {status === 'error' && (
            <p className="mt-1 text-[12px] leading-snug text-rose-600 dark:text-rose-400">
              {location.error || t('loc.permissionDenied')}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => { requestGps(); onLocationSelected?.(); }}
              disabled={status === 'loading'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50 dark:bg-emerald-600"
            >
              <LocateFixed size={13} />
              {t('loc.allowLocation')}
            </button>
            <button
              onClick={() => setShowManual((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <Search size={13} />
              {t('loc.chooseManually')}
            </button>
          </div>
        </div>
      </div>

      {/* Manual location search */}
      {showManual && (
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-background/60 p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => runSearch(e.target.value)}
                placeholder={t('loc.searchPlaceholder')}
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-8 text-xs font-medium outline-none focus:border-forest dark:focus:border-emerald-600"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setResults([]); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {searching && <p className="text-[11px] font-semibold text-muted-foreground">{t('loc.searching')}</p>}

          {results.length > 0 && (
            <ul className="max-h-44 space-y-1 overflow-y-auto">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => selectResult(r)}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold text-foreground hover:bg-muted"
                  >
                    <MapPin size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2">{r.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {results.length === 0 && !searching && query.trim().length >= 3 && (
            <p className="text-[11px] font-semibold text-muted-foreground">{t('loc.noResults')}</p>
          )}

          {/* Save as farm */}
          {selectedResult && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2">
              <input
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder={t('loc.farmNamePlaceholder')}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium outline-none focus:border-forest dark:focus:border-emerald-600"
              />
              <button
                onClick={addFarmFromResult}
                className="inline-flex items-center gap-1 rounded-lg bg-forest px-2.5 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 dark:bg-emerald-600"
              >
                <Plus size={13} />
                {t('loc.saveFarm')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Saved farms */}
      {farms.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t('loc.myFarms')}</p>
          <ul className="space-y-1">
            {farms.map((f) => (
              <li key={f.id}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setActiveFarm(f); onLocationSelected?.(); }}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold',
                      f.is_active ? 'bg-forest/10 text-forest dark:bg-emerald-600/15 dark:text-emerald-400' : 'hover:bg-muted'
                    )}
                  >
                    {f.is_active && <Check size={13} className="shrink-0" />}
                    <span className="truncate">{f.name}</span>
                    {f.district && <span className="truncate text-[10px] font-bold text-muted-foreground">· {f.district}</span>}
                  </button>
                  <button
                    onClick={() => removeFarm(f.id)}
                    className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-rose-600"
                    aria-label="Remove farm"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {farmsLoading && <p className="mt-1 text-[10px] font-semibold text-muted-foreground">{t('loc.loadingFarms')}</p>}
        </div>
      )}
    </div>
  );
};
