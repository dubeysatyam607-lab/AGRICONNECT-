import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Search, MapPin, TrendingUp, RefreshCw, Filter, WifiOff, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { CommodityImage } from "@/components/agri/CommodityImage";
import { ErrorState } from "@/components/ui/error-state";
import { fetchMandiPrices, type MandiPrice, type MandiResult } from "@/lib/mandi-api";
import {
  getAllIndianStatesAndUTs,
  getDistrictsForState,
  getMandisForDistrict,
  getCommoditiesForSelection,
  filterIndiaMandiDataset,
  type MandiFilterState,
} from "@/lib/india-mandi-service";

const ITEMS_PER_PAGE = 24;

const MandiPrices: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<MandiPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCachedData, setIsCachedData] = useState(false);
  const [cachedAtText, setCachedAtText] = useState<string | null>(null);

  // Filter States
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMandi, setSelectedMandi] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Server-provided available meta lists
  const [availableStatesMeta, setAvailableStatesMeta] = useState<string[]>([]);

  const fetchMandiData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: MandiResult = await fetchMandiPrices(
        searchTerm,
        selectedState,
        selectedDistrict,
        selectedMandi,
        { includeMeta: true }
      );

      if (result.isError) {
        setError(result.errorMessage || t('mandi.hub.failed'));
        setData([]);
      } else {
        setData(result.prices);
        if (result.availableStates?.length) {
          setAvailableStatesMeta(result.availableStates);
        }
        setIsCachedData(!!result.isCached);
        setCachedAtText(result.cachedAtText || null);
        setError(null);
      }
    } catch (err: unknown) {
      console.error("[MandiPrices Error]:", err);
      setError(t('mandi.hub.failed'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedState, selectedDistrict, selectedMandi, t]);

  useEffect(() => {
    fetchMandiData();
  }, [fetchMandiData]);

  // 1. Cascading State List (Combines all 36 States/UTs + dynamic data)
  const statesList = useMemo(() => {
    const canonical = getAllIndianStatesAndUTs();
    const dynamic = Array.from(new Set([...availableStatesMeta, ...data.map((p) => p.state)]))
      .filter(Boolean);
    return Array.from(new Set([...canonical, ...dynamic])).sort((a, b) => a.localeCompare(b));
  }, [availableStatesMeta, data]);

  // 2. Cascading District List (Derived from selectedState)
  const districtsList = useMemo(() => {
    if (!selectedState) return [];
    return getDistrictsForState(selectedState, data);
  }, [selectedState, data]);

  // 3. Cascading Mandi List (Derived from selectedState & selectedDistrict)
  const mandisList = useMemo(() => {
    return getMandisForDistrict(selectedState, selectedDistrict, data);
  }, [selectedState, selectedDistrict, data]);

  // 4. Cascading Commodity List (Derived from selected State, District & Mandi)
  const commoditiesList = useMemo(() => {
    return getCommoditiesForSelection(selectedState, selectedDistrict, selectedMandi, data);
  }, [selectedState, selectedDistrict, selectedMandi, data]);

  // Handle Cascading Resets
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    setSelectedDistrict("");
    setSelectedMandi("");
    setSelectedCommodity("");
    setCurrentPage(1);
  };

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    setSelectedMandi("");
    setSelectedCommodity("");
    setCurrentPage(1);
  };

  const handleMandiChange = (newMandi: string) => {
    setSelectedMandi(newMandi);
    setSelectedCommodity("");
    setCurrentPage(1);
  };

  const handleCommodityChange = (newCommodity: string) => {
    setSelectedCommodity(newCommodity);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSelectedState("");
    setSelectedDistrict("");
    setSelectedMandi("");
    setSelectedCommodity("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    const filterState: MandiFilterState = {
      state: selectedState,
      district: selectedDistrict,
      mandi: selectedMandi,
      commodity: selectedCommodity,
      search: searchTerm,
    };
    return filterIndiaMandiDataset(data, filterState);
  }, [data, selectedState, selectedDistrict, selectedMandi, selectedCommodity, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const hasActiveFilters = Boolean(
    selectedState || selectedDistrict || selectedMandi || selectedCommodity || searchTerm
  );

  return (
    <div className="pb-24 pt-4 px-4 space-y-6 max-w-5xl mx-auto">
      {/* Offline/Cache Banner */}
      {isCachedData && cachedAtText && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm">
          <span className="flex items-center gap-2">
            <WifiOff size={15} /> {t('mandi.hub.offlineNotice', { time: cachedAtText })}
          </span>
          <button onClick={fetchMandiData} className="underline font-semibold ml-2">
            {t('agr111')}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="text-primary" /> {t('mandi.title')}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {t('agr112') || "Live Government Mandi Prices Across All Indian States & UTs"}
          </p>
        </div>
        <AgriButton variant="outline" size="sm" onClick={fetchMandiData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </AgriButton>
      </div>

      {/* Complete Cascading Location & Commodity Filter Bar */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-soft space-y-3">
        {/* Top Bar: Global Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder={t('mandi.hub.searchPlaceholder') || "Search State, District, Mandi, or Crop (e.g. Wheat, Jaipur, UP)..."}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus-visible:ring-ring text-sm font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Cascading Filter Controls: Grid for Mobile & Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 1. State / UT Dropdown */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 pointer-events-none" />
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus-visible:ring-ring appearance-none cursor-pointer"
            >
              <option value="">All India (36 States/UTs)</option>
              {statesList.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* 2. District Dropdown (Cascading) */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 pointer-events-none" />
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={!selectedState}
              className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus-visible:ring-ring appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedState ? "Select State first" : `All Districts in ${selectedState}`}
              </option>
              {districtsList.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Mandi / Market Dropdown (Cascading) */}
          <div className="relative">
            <select
              value={selectedMandi}
              onChange={(e) => handleMandiChange(e.target.value)}
              disabled={!selectedDistrict && mandisList.length === 0}
              className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus-visible:ring-ring appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedDistrict
                  ? "All Mandis"
                  : `All Mandis in ${selectedDistrict}`}
              </option>
              {mandisList.map((mandi) => (
                <option key={mandi} value={mandi}>
                  {mandi}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Commodity / Crop Dropdown */}
          <div className="relative">
            <select
              value={selectedCommodity}
              onChange={(e) => handleCommodityChange(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus-visible:ring-ring appearance-none cursor-pointer"
            >
              <option value="">All Commodities / Crops</option>
              {commoditiesList.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Reset Badge Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Active filters:</span>
              {selectedState && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">
                  State: {selectedState}
                  <button onClick={() => handleStateChange("")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedDistrict && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">
                  District: {selectedDistrict}
                  <button onClick={() => handleDistrictChange("")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedMandi && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">
                  Mandi: {selectedMandi}
                  <button onClick={() => handleMandiChange("")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedCommodity && (
                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">
                  Crop: {selectedCommodity}
                  <button onClick={() => handleCommodityChange("")}>
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={resetAllFilters}
              className="text-primary font-bold hover:underline shrink-0"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Results Header & Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-medium">
        <span>
          Showing {paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} -{" "}
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length} verified mandi records
        </span>
        <span>Source: AGMARKNET · Govt of India</span>
      </div>

      {/* Records Cards Container */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card h-44 rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchMandiData} />
      ) : filteredData.length === 0 ? (
        <div className="text-center py-14 bg-card rounded-2xl border border-border space-y-2">
          <p className="text-foreground font-bold text-base">No Government Mandi Data Found</p>
          <p className="text-muted-foreground text-xs max-w-md mx-auto">
            No published prices match your selected State, District, Mandi, or Commodity filter. Try broadening your location selection or resetting filters.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="mt-2 inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl shadow-sm hover:brightness-110"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedData.map((record) => (
            <AgriCard
              key={record.id}
              className="p-0 flex flex-col justify-between overflow-hidden border border-border/80 rounded-2xl shadow-soft hover:shadow-md transition-shadow"
            >
              <div className="relative h-28 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <CommodityImage
                  commodityName={record.crop}
                  commodityHi={record.cropHi}
                  category={record.category}
                  src={record.cropImage}
                  alt={record.crop}
                  className="w-full h-full object-cover"
                  containerClassName="absolute inset-0 w-full h-full"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white flex items-end justify-between">
                  <div>
                    <h3 className="font-bold text-base leading-tight drop-shadow">
                      {record.crop}
                    </h3>
                    {record.cropHi && (
                      <p className="text-xs text-emerald-200/90 font-medium">
                        {record.cropHi}
                      </p>
                    )}
                  </div>
                  {record.variety && (
                    <span className="text-[11px] bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md font-semibold text-white">
                      {record.variety}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 space-y-2.5 bg-card">
                {/* Location Badges */}
                <div className="flex items-center justify-between text-xs text-muted-foreground gap-1.5">
                  <span className="font-semibold text-foreground truncate flex items-center gap-1">
                    <MapPin size={12} className="text-primary shrink-0" />
                    {record.market}
                  </span>
                  <span className="shrink-0 text-[11px] bg-muted px-2 py-0.5 rounded-md font-medium">
                    {record.district}, {record.state}
                  </span>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline justify-between pt-1 border-t border-border">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Modal Price</span>
                    <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{record.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-muted-foreground">/Quintal</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-muted-foreground block font-medium">Range</span>
                    <span className="font-semibold text-foreground">
                      ₹{record.minPrice} - ₹{record.maxPrice}
                    </span>
                  </div>
                </div>

                {/* Source & Date Footer */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Date: {record.arrivalDate}</span>
                  {record.arrivalQuantity ? (
                    <span>Arr: {record.arrivalQuantity} Qtl</span>
                  ) : (
                    <span>Govt Verified</span>
                  )}
                </div>
              </div>
            </AgriCard>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border text-xs">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-input bg-card font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent"
          >
            <ChevronLeft size={15} /> Previous
          </button>
          <span className="font-semibold text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-input bg-card font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

export default MandiPrices;