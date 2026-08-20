import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Search, MapPin, TrendingUp, RefreshCw, Filter, ShieldCheck, WifiOff } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { ErrorState } from "@/components/ui/error-state";
import { fetchMandiPrices, type MandiPrice, type MandiResult } from "@/lib/mandi-api";

const MandiPrices: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<MandiPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCachedData, setIsCachedData] = useState(false);
  const [cachedAtText, setCachedAtText] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState("");

  const fetchMandiData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: MandiResult = await fetchMandiPrices(searchTerm);

      if (result.isError) {
        setError(result.errorMessage || "Live mandi prices are currently unavailable.");
        setData([]);
      } else {
        setData(result.prices);
        setIsCachedData(!!result.isCached);
        setCachedAtText(result.cachedAtText || null);
        setError(null);
      }
    } catch (err: unknown) {
      console.error("[MandiPrices Error]:", err);
      setError("Live mandi prices are currently unavailable.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchMandiData();
  }, [fetchMandiData]);

  const states = useMemo(() => {
    const uniqueStates = new Set(data.map((item) => item.state).filter(Boolean));
    return Array.from(uniqueStates).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.crop.toLowerCase().includes(lowerSearch) ||
          (item.cropHi || "").toLowerCase().includes(lowerSearch) ||
          item.market.toLowerCase().includes(lowerSearch) ||
          item.district.toLowerCase().includes(lowerSearch) ||
          item.state.toLowerCase().includes(lowerSearch)
      );
    }
    if (selectedState) {
      result = result.filter((item) => item.state === selectedState);
    }
    return result;
  }, [searchTerm, selectedState, data]);

  return (
    <div className="pb-24 pt-4 px-4 space-y-6 max-w-4xl mx-auto">
      {/* Offline banner */}
      {isCachedData && cachedAtText && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm">
          <span className="flex items-center gap-2">
            <WifiOff size={15} /> Showing cached prices from {cachedAtText} (Offline Mode)
          </span>
          <button onClick={fetchMandiData} className="underline font-extrabold ml-2">{t('agr111')}</button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <TrendingUp className="text-emerald-600" /> Real-Time Mandi Prices
          </h2>
          <p className="text-muted-foreground text-sm">{t('agr112')}</p>
        </div>
        <AgriButton variant="outline" size="sm" onClick={fetchMandiData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </AgriButton>
      </div>

      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Crop, Mandi, District or State..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium appearance-none"
          >
            <option value="">{t('agr113')}</option>
            {states.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card h-44 rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchMandiData} />
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <p className="text-muted-foreground font-medium">{t('agr114')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredData.slice(0, 100).map((record) => (
            <AgriCard key={record.id} className="p-0 flex flex-col justify-between overflow-hidden border border-border/80 rounded-2xl">
              <div className="relative h-24 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img src={record.cropImage} alt={record.crop} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=400'; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-2 left-3 text-white">
                  <h3 className="font-extrabold text-base leading-none drop-shadow">
                    {record.crop} {record.cropHi && record.cropHi !== record.crop && <span className="text-xs font-normal opacity-90">({record.cropHi})</span>}
                  </h3>
                </div>
              </div>

              <div className="p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin size={13} className="text-emerald-600 shrink-0" />
                  <span className="truncate font-medium">{record.market}, {record.district}, {record.state}</span>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">{t('agr115')}</p>
                    <p className="font-semibold text-xs text-foreground">₹{record.minPrice}</p>
                  </div>
                  <div className="border-x border-border">
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">{t('agr116')}</p>
                    <p className="font-extrabold text-sm text-emerald-700 dark:text-emerald-400">₹{record.price}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">{t('agr117')}</p>
                    <p className="font-semibold text-xs text-foreground">₹{record.maxPrice}</p>
                  </div>
                </div>
              </div>

              <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900/40 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck size={12} /> api.data.gov.in
                </span>
                <span>Arrival: {record.arrivalDate}</span>
              </div>
            </AgriCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default MandiPrices;