import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Search, MapPin, Heart,
  X, ChevronRight, Clock, Bot, ShieldCheck, Filter, AlertCircle, WifiOff,
  Sparkles, Calculator, CheckCircle2, Store, Calendar, ArrowUpRight, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";
import { fetchMandiPrices, normalizeCropKey, type MandiPrice, type MandiResult } from "@/lib/mandi-api";
import {
  getAllIndianStatesAndUTs,
  getDistrictsForState,
  getMandisForDistrict,
} from "@/lib/india-mandi-service";
import { ErrorState } from "@/components/ui/error-state";
import { AgriButton } from "@/components/ui/agri-button";
import { CommodityImage } from "@/components/agri/CommodityImage";
import { useLanguage } from "@/contexts/LanguageContext";

interface LiveMandiProps {
  onToast?: (message: string) => void;
  onNavigateToAuth?: () => void;
}

type Tab = "prices" | "advisor" | "compare" | "nearby" | "alerts";
type SortOption = "highest" | "lowest" | "latest" | "alphabetical";

const FAVORITES_KEY = "mandi_favorites_v3";
const LAST_FETCH_KEY = "mandi_last_successful_fetch_v1";
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

const formatINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const parseChange = (change?: string): number => {
  if (!change) return 0;
  const num = parseFloat(change.replace("%", "").replace(",", ""));
  return isNaN(num) ? 0 : num;
};

// Hinglish & Hindi Search Alias Map
const SEARCH_ALIASES: Record<string, string[]> = {
  tomato: ["tamatar", "टमाटर"],
  potato: ["aloo", "alu", "आलू"],
  onion: ["pyaj", "pyaaz", "kanda", "प्याज"],
  wheat: ["gehu", "gehun", "गेहूं", "गेहू"],
  rice: ["chawal", "चावल", "basmati"],
  paddy: ["dhan", "धान"],
  maize: ["makka", "corn", "मक्का"],
  soybean: ["soyabean", "soya", "सोयाबीन"],
  mustard: ["sarson", "sarso", "rai", "सरसों", "राई"],
  cotton: ["kapas", "कपास"],
  garlic: ["lahsun", "lasun", "लहसुन"],
  ginger: ["adrak", "अदरक"],
  banana: ["kela", "केला"],
  mango: ["aam", "आम"],
  chilli: ["mirch", "mirchi", "मिर्च"],
  gram: ["chana", "चना"],
  groundnut: ["mungfali", "मूंगफली"],
};

const CATEGORIES = ["All", "Cereals", "Pulses", "Vegetables", "Fruits", "Spices", "Oilseeds", "Commercial", "Other"];

const LiveMandi: React.FC<LiveMandiProps> = ({ onToast }) => {
  const { t, language } = useLanguage();
  const hi = language === "hi";

  const L = {
    title: hi ? "लाइव मंडी भाव एवं बाजार गुप्तचर" : "Live Mandi Bhav & Market Intelligence",
    subtitle: hi ? "भारत की सभी मंडियों के सत्यापित APMC सरकारी भाव" : "Verified APMC rates across all Indian States & Mandis",
    updated: hi ? "अंतिम अपडेट" : "Last updated",
    nextUpdate: hi ? "अगला ऑटो अपडेट" : "Next refresh in",
    search: hi ? "फसल, मंडी, जिला या राज्य खोजें (जैसे: टमाटर, Shivpuri, इंदौर)..." : "Search crop, mandi, district or state (e.g. Tomato, Shivpuri)...",
    allStates: hi ? "सभी राज्य / केंद्र शासित प्रदेश" : "All States / UTs",
    allDistricts: hi ? "सभी जिले" : "All Districts",
    allMandis: hi ? "सभी मंडियां" : "All Mandis",
    onlyFavs: hi ? "पसंदीदा" : "Favorites",
    tabPrices: hi ? "लाइव भाव" : "Market Prices",
    tabAdvisor: hi ? "AI मंडी सलाह" : "AI Selling Advisor",
    tabCompare: hi ? "मंडी तुलना" : "Mandi Comparison",
    perQuintal: "/ quintal",
    min: hi ? "न्यूनतम" : "Min",
    max: hi ? "अधिकतम" : "Max",
    modal: hi ? "मॉडल मूल्य" : "Modal Price",
    loading: hi ? "नवीनतम सरकारी मंडी भाव लोड हो रहे हैं..." : "Fetching live APMC mandi prices...",
    failed: hi ? "मंडी डेटा अस्थायी रूप से अनुपलब्ध है।" : "Mandi data is temporarily unavailable.",
    retry: hi ? "पुनः प्रयास करें" : "Retry Sync",
    verifiedSource: hi ? "सत्यापित सरकारी डेटा: api.data.gov.in" : "Verified Government Data: api.data.gov.in",
    loadMore: hi ? "और फसलें देखें" : "Load More Crops",
    confidence: hi ? "% सटीक पूर्वाअनुसार" : "% Confidence",
  };

  const CATEGORY_LABELS: Record<string, string> = {
    All: hi ? "सभी" : "All",
    Cereals: hi ? "अनाज" : "Cereals",
    Pulses: hi ? "दलहन" : "Pulses",
    Vegetables: hi ? "सब्जियां" : "Vegetables",
    Fruits: hi ? "फल" : "Fruits",
    Spices: hi ? "मसाले" : "Spices",
    Oilseeds: hi ? "तिलहन" : "Oilseeds",
    Commercial: hi ? "व्यावसायिक" : "Commercial",
    Other: hi ? "अन्य" : "Other",
  };

  // Main State
  const [data, setData] = useState<MandiPrice[]>([]);
  const [availableStatesMeta, setAvailableStatesMeta] = useState<string[]>([]);
  const [servedFrom, setServedFrom] = useState<"database" | "live" | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 5-Hour Update Timestamps
  const [lastSuccessfulUpdate, setLastSuccessfulUpdate] = useState<Date | null>(() => {
    try {
      const stored = localStorage.getItem(LAST_FETCH_KEY);
      return stored ? new Date(parseInt(stored, 10)) : null;
    } catch {
      return null;
    }
  });

  const [timeUntilNextUpdate, setTimeUntilNextUpdate] = useState<string>("");

  // Filters State
  const [tab, setTab] = useState<Tab>("prices");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMandi, setSelectedMandi] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState<SortOption>("highest");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [compareCrop, setCompareCrop] = useState("");

  // Pagination
  const [visibleCount, setVisibleCount] = useState(24);

  // Favorites & Selection
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<MandiPrice | null>(null);

  // In-flight fetch guard
  const isFetchingRef = useRef(false);

  // Load favorites from local storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const toggleFavorite = useCallback((c: MandiPrice) => {
    setFavorites(prev => {
      const next = prev.includes(c.id) ? prev.filter(k => k !== c.id) : [c.id, ...prev];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFav = useCallback((c: MandiPrice) => favorites.includes(c.id), [favorites]);

  // Main Fetch Mandi Function with 5-Hour Update Logic
  const fetchMandi = useCallback(async (showSpinner = false, opts: { sync?: boolean } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (showSpinner) setRefreshing(true);
    else if (data.length === 0) setLoading(true);

    try {
      const result: MandiResult = await fetchMandiPrices(
        searchTerm || undefined,
        selectedState || undefined,
        selectedDistrict || undefined,
        selectedMandi || undefined,
        { includeMeta: true, sync: opts.sync ?? false, timeoutMs: 60000 }
      );

      if (result.isError) {
        if (data.length === 0) {
          setError(result.errorMessage || L.failed);
        }
      } else {
        setData(result.prices);
        if (result.availableStates?.length) setAvailableStatesMeta(result.availableStates);
        setServedFrom(result.servedFrom);
        setError(null);

        // Record successful update timestamp
        const now = new Date();
        setLastSuccessfulUpdate(now);
        try {
          localStorage.setItem(LAST_FETCH_KEY, now.getTime().toString());
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("[Mandi Fetch Error]:", err);
      if (data.length === 0) setError(L.failed);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [selectedState, selectedDistrict, selectedMandi, searchTerm, data.length, L.failed]);

  // Initial Load & Automatic 5-Hour Refresh Trigger
  useEffect(() => {
    const lastTs = lastSuccessfulUpdate ? lastSuccessfulUpdate.getTime() : 0;
    const now = Date.now();
    const isStale5Hours = now - lastTs >= FIVE_HOURS_MS;

    if (data.length === 0 || isStale5Hours) {
      void fetchMandi(false, { sync: isStale5Hours });
    }
  }, [selectedState, selectedDistrict, selectedMandi]);

  // Background timer to compute "Next Update" countdown & trigger 5-hour auto refresh
  useEffect(() => {
    const updateCountdown = () => {
      if (!lastSuccessfulUpdate) {
        setTimeUntilNextUpdate("Pending sync");
        return;
      }

      const nextTs = lastSuccessfulUpdate.getTime() + FIVE_HOURS_MS;
      const diff = nextTs - Date.now();

      if (diff <= 0) {
        setTimeUntilNextUpdate("Due now");
        void fetchMandi(false, { sync: true });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeUntilNextUpdate(`${hours}h ${mins}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // update every minute
    return () => clearInterval(interval);
  }, [lastSuccessfulUpdate, fetchMandi]);

  // 1. Cascading State List (Combines all 36 Indian States/UTs + dynamic dataset)
  const states = useMemo(() => {
    const canonical = getAllIndianStatesAndUTs();
    const dynamic = Array.from(new Set([...availableStatesMeta, ...data.map((p) => p.state)])).filter(Boolean);
    return Array.from(new Set([...canonical, ...dynamic])).sort((a, b) => a.localeCompare(b));
  }, [availableStatesMeta, data]);

  // 2. Cascading District List (Derived strictly from selectedState)
  const districts = useMemo(() => {
    if (!selectedState) return [];
    return getDistrictsForState(selectedState, data);
  }, [selectedState, data]);

  // 3. Cascading Mandi List (Derived strictly from selectedState & selectedDistrict)
  const mandis = useMemo(() => {
    return getMandisForDistrict(selectedState, selectedDistrict, data);
  }, [selectedState, selectedDistrict, data]);

  // Cascading Selection Resets
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    setSelectedDistrict("");
    setSelectedMandi("");
    setVisibleCount(24);
  };

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    setSelectedMandi("");
    setVisibleCount(24);
  };

  const handleMandiChange = (newMandi: string) => {
    setSelectedMandi(newMandi);
    setVisibleCount(24);
  };

  // Filter & Search Logic (including Hinglish Aliases)
  const filteredData = useMemo(() => {
    let list = [...data];

    // Location Filters
    if (selectedState) {
      const s = selectedState.toLowerCase().trim();
      list = list.filter((p) => p.state && p.state.toLowerCase() === s);
    }
    if (selectedDistrict) {
      const d = selectedDistrict.toLowerCase().trim();
      list = list.filter((p) => p.district && p.district.toLowerCase() === d);
    }
    if (selectedMandi) {
      const m = selectedMandi.toLowerCase().trim();
      list = list.filter((p) => p.market && p.market.toLowerCase() === m);
    }

    // Category Filter
    if (selectedCategory && selectedCategory !== "All") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Favorites Filter
    if (favoritesOnly) {
      list = list.filter(isFav);
    }

    // Search Query (with Aliases)
    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();

      list = list.filter((item) => {
        const cropEn = item.crop.toLowerCase();
        const cropHi = (item.cropHi || "").toLowerCase();
        const market = item.market.toLowerCase();
        const district = item.district.toLowerCase();
        const state = item.state.toLowerCase();
        const variety = (item.variety || "").toLowerCase();

        // Check direct string match
        if (
          cropEn.includes(q) ||
          cropHi.includes(q) ||
          market.includes(q) ||
          district.includes(q) ||
          state.includes(q) ||
          variety.includes(q)
        ) {
          return true;
        }

        // Check search aliases (e.g. 'tamatar' matches 'tomato')
        for (const [key, aliases] of Object.entries(SEARCH_ALIASES)) {
          if (cropEn.includes(key)) {
            if (aliases.some((alias) => alias.includes(q) || q.includes(alias))) {
              return true;
            }
          }
        }

        return false;
      });
    }

    // Sorting
    switch (sortOption) {
      case "highest":
        list.sort((a, b) => b.price - a.price);
        break;
      case "lowest":
        list.sort((a, b) => a.price - b.price);
        break;
      case "latest":
        list.sort((a, b) => (b.arrivalDate || "").localeCompare(a.arrivalDate || ""));
        break;
      case "alphabetical":
        list.sort((a, b) => a.crop.localeCompare(b.crop));
        break;
    }

    return list;
  }, [data, selectedState, selectedDistrict, selectedMandi, selectedCategory, favoritesOnly, searchTerm, sortOption, isFav]);

  // Paginated List
  const visibleItems = useMemo(() => filteredData.slice(0, visibleCount), [filteredData, visibleCount]);

  // Market Summary stats when a mandi is selected
  const marketSummary = useMemo(() => {
    if (!selectedMandi || filteredData.length === 0) return null;
    const latestDate = filteredData[0]?.arrivalDate || "Today";
    const prices = filteredData.map(d => d.price).filter(p => p > 0);
    const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

    return {
      name: selectedMandi,
      district: selectedDistrict || filteredData[0]?.district,
      state: selectedState || filteredData[0]?.state,
      count: filteredData.length,
      latestDate,
      avgPrice,
    };
  }, [selectedMandi, selectedDistrict, selectedState, filteredData]);

  const changeBadge = (c: MandiPrice) => {
    const ch = parseChange(c.change);
    return (
      <span className={cn(
        "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-bold",
        c.status === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        c.status === "down" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        (!c.status || c.status === "stable") && "bg-slate-100 dark:bg-slate-800 text-muted-foreground",
      )}>
        {c.status === "up" && <TrendingUp size={12} />}
        {c.status === "down" && <TrendingDown size={12} />}
        {(!c.status || c.status === "stable") && <Minus size={12} />}
        {ch > 0 ? `+${ch.toFixed(0)}%` : `${ch.toFixed(0)}%`}
      </span>
    );
  };

  const renderCardGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {visibleItems.map((c) => {
        const fav = isFav(c);
        return (
          <div
            key={c.id}
            onClick={() => setSelectedCrop(c)}
            className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            {/* Real Crop Image Container */}
            <div className="relative h-44 w-full bg-muted overflow-hidden">
              <CommodityImage
                commodityName={c.crop}
                commodityHi={c.cropHi}
                category={c.category}
                src={c.cropImage}
                alt={c.crop}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

              {/* Category Badge & Favorite Button */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600/90 text-white shadow-sm">
                  {c.category}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(c); }}
                  className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
                >
                  <Heart size={14} className={fav ? "fill-rose-500 text-rose-500" : "text-white"} />
                </button>
              </div>

              {/* Mandi & District Overlay */}
              <div className="absolute bottom-2.5 left-3 right-3 text-white">
                <p className="text-xs font-semibold drop-shadow-sm truncate">
                  <MapPin size={11} className="inline mr-1 text-emerald-400" />
                  {c.market}, {c.district}
                </p>
              </div>
            </div>

            {/* Card Content Body */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-foreground group-hover:text-emerald-600 transition-colors line-clamp-1">
                    {c.crop} {c.cropHi && <span className="text-xs font-normal text-muted-foreground">({c.cropHi})</span>}
                  </h3>
                  {changeBadge(c)}
                </div>

                {c.variety && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hi ? "किस्म" : "Variety"}: <span className="font-medium text-foreground">{c.variety}</span>
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-muted/40 p-3 rounded-xl border border-border/50 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">{L.modal}</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatINR(c.price)}</span>
                    <span className="text-[11px] text-muted-foreground"> / quintal</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-1.5 font-medium">
                  <span>{L.min}: <b className="text-foreground">{c.minPrice > 0 ? formatINR(c.minPrice) : "N/A"}</b></span>
                  <span>{L.max}: <b className="text-foreground">{c.maxPrice > 0 ? formatINR(c.maxPrice) : "N/A"}</b></span>
                </div>
              </div>

              {/* Footer Date & Action */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {c.arrivalDate || "Latest"}
                </span>
                <span className="font-bold text-emerald-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  {hi ? "विवरण" : "Details"} <ChevronRight size={13} />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">

      {/* Hero Header Section */}
      <div className="relative rounded-3xl border border-border bg-gradient-to-br from-emerald-900/10 via-card to-card p-6 sm:p-8 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <ShieldCheck size={14} />
              {L.verifiedSource}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {L.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {L.subtitle}
            </p>
          </div>

          {/* Refresh & Update Status Panel */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-2xl shadow-sm shrink-0">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {L.updated}: <span className="text-emerald-600 font-bold">{lastSuccessfulUpdate ? lastSuccessfulUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Just now"}</span>
              </div>
              <p className="text-muted-foreground">
                {L.nextUpdate}: <span className="font-semibold text-foreground">{timeUntilNextUpdate}</span>
              </p>
            </div>

            <AgriButton
              size="sm"
              variant="outline"
              onClick={() => fetchMandi(true, { sync: true })}
              disabled={refreshing}
              className="w-full sm:w-auto"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin mr-1" : "mr-1"} />
              {refreshing ? (hi ? "ताज़ा हो रहा है..." : "Refreshing...") : (hi ? "अभी रिफ्रेश करें" : "Refresh Now")}
            </AgriButton>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar Section */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder={L.search}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(24); }}
            className="w-full pl-11 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-medium transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Cascading Location Selectors (State -> District -> Mandi) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* 1. State Selector (All 36 Indian States/UTs) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{hi ? "राज्य चुनें" : "State / UT"}</label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 truncate"
            >
              <option value="">{L.allStates}</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 2. District Selector (Cascading from State) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{hi ? "जिला चुनें" : "District"}</label>
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={!selectedState && districts.length === 0}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 truncate disabled:opacity-60"
            >
              <option value="">{L.allDistricts}</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 3. Mandi Selector (Cascading from District) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{hi ? "मंडी चुनें" : "Mandi / Market"}</label>
            <select
              value={selectedMandi}
              onChange={(e) => handleMandiChange(e.target.value)}
              disabled={mandis.length === 0}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 truncate disabled:opacity-60"
            >
              <option value="">{L.allMandis}</option>
              {mandis.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 4. Sort Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{hi ? "क्रमबद्ध करें" : "Sort By"}</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 truncate"
            >
              <option value="highest">{hi ? "उच्चतम मूल्य पहले" : "Highest Price First"}</option>
              <option value="lowest">{hi ? "न्यूनतम मूल्य पहले" : "Lowest Price First"}</option>
              <option value="latest">{hi ? "नवीनतम आवक तिथि" : "Latest Arrival Date"}</option>
              <option value="alphabetical">{hi ? "वर्णानुक्रम (A-Z)" : "Alphabetical (A-Z)"}</option>
            </select>
          </div>
        </div>

        {/* Category Pills & Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setVisibleCount(24); }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setFavoritesOnly((f) => !f); setVisibleCount(24); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors shrink-0",
              favoritesOnly
                ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                : "bg-background text-muted-foreground border-input hover:text-foreground"
            )}
          >
            <Heart size={13} className={favoritesOnly ? "fill-rose-500 text-rose-500" : ""} />
            {L.onlyFavs}
          </button>
        </div>
      </div>

      {/* Selected Mandi Market Summary Header Banner */}
      {marketSummary && (
        <div className="rounded-2xl bg-emerald-950 text-white p-5 border border-emerald-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
              {hi ? "चयनित मंडी बाजार सारांश" : "Selected Market Overview"}
            </span>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <Store className="text-emerald-400" size={20} />
              {marketSummary.name}
              <span className="text-xs font-normal text-emerald-200">({marketSummary.district}, {marketSummary.state})</span>
            </h2>
          </div>

          <div className="flex items-center gap-6 text-xs text-emerald-100 divide-x divide-emerald-800">
            <div>
              <span className="block opacity-75">{hi ? "कुल उपलब्ध फसलें" : "Total Commodities"}</span>
              <span className="text-lg font-bold text-white">{marketSummary.count} {hi ? "फसलें" : "Crops"}</span>
            </div>
            <div className="pl-6">
              <span className="block opacity-75">{hi ? "नवीनतम आवक तिथि" : "Latest Arrival"}</span>
              <span className="text-lg font-bold text-white">{marketSummary.latestDate}</span>
            </div>
            <div className="pl-6">
              <span className="block opacity-75">{hi ? "औसत मॉडल मूल्य" : "Avg Modal Rate"}</span>
              <span className="text-lg font-bold text-emerald-300">{formatINR(marketSummary.avgPrice)} / q</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid / State Render */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-muted/50 border border-border animate-pulse" />
          ))}
        </div>
      ) : error && data.length === 0 ? (
        <ErrorState message={error} onRetry={() => fetchMandi(true, { sync: true })} />
      ) : filteredData.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card rounded-3xl border border-border space-y-4 shadow-sm">
          <Store className="mx-auto w-12 h-12 text-muted-foreground opacity-50" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              {hi ? "कोई सरकारी मंडी रिकॉर्ड नहीं मिला" : "No Government Mandi Records Found"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              {hi
                ? "चयनित राज्य, जिले या मंडी के लिए कोई पंजीकृत फसल रेट उपलब्ध नहीं है। कृपया फ़िल्टर बदलें।"
                : "No registered commodity prices returned for this combination of State, District, or Mandi. Try choosing another district or clearing filters."}
            </p>
          </div>
          <AgriButton
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedState("");
              setSelectedDistrict("");
              setSelectedMandi("");
              setSelectedCategory("All");
              setFavoritesOnly(false);
              setVisibleCount(24);
            }}
          >
            {hi ? "सभी फ़िल्टर हटाएं" : "Clear All Filters"}
          </AgriButton>
        </div>
      ) : (
        <>
          {renderCardGrid()}

          {/* Load More Button */}
          {visibleItems.length < filteredData.length && (
            <div className="flex justify-center pt-4">
              <AgriButton
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + 24)}
                className="px-8 py-3 rounded-xl border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-500/10"
              >
                {L.loadMore} ({filteredData.length - visibleItems.length} {hi ? "और बाकी" : "remaining"})
              </AgriButton>
            </div>
          )}
        </>
      )}

      {/* Selected Crop Detail Modal Sheet */}
      {selectedCrop && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="relative w-full max-w-2xl bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            {/* Header Close & Favorite Bar */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <button
                onClick={() => toggleFavorite(selectedCrop)}
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
              >
                <Heart size={18} className={isFav(selectedCrop) ? "fill-rose-500 text-rose-500" : "text-white"} />
              </button>
              <button
                onClick={() => setSelectedCrop(null)}
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Image Header */}
            <div className="relative h-64 w-full bg-muted">
              <CommodityImage
                commodityName={selectedCrop.crop}
                commodityHi={selectedCrop.cropHi}
                category={selectedCrop.category}
                src={selectedCrop.cropImage}
                alt={selectedCrop.crop}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

              <div className="absolute bottom-4 left-5 right-5 text-white space-y-1">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white inline-block mb-1">
                  {selectedCrop.category}
                </span>
                <h2 className="text-2xl font-extrabold drop-shadow-md">
                  {selectedCrop.crop} {selectedCrop.cropHi && <span className="text-lg font-semibold opacity-90">({selectedCrop.cropHi})</span>}
                </h2>
                <p className="text-xs text-emerald-200 flex items-center gap-1 font-medium">
                  <MapPin size={12} /> {selectedCrop.market} · {selectedCrop.district}, {selectedCrop.state}
                </p>
              </div>
            </div>

            {/* Modal Details Body */}
            <div className="p-6 space-y-6">

              {/* Modal Price Highlight Box */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{L.modal}</span>
                  <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                    {formatINR(selectedCrop.price)}
                    <span className="text-xs font-medium text-muted-foreground"> / quintal</span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  {changeBadge(selectedCrop)}
                  <p className="text-xs text-muted-foreground font-medium">
                    {hi ? "आवक तिथि" : "Arrival Date"}: <b className="text-foreground">{selectedCrop.arrivalDate}</b>
                  </p>
                </div>
              </div>

              {/* Price Range Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                  <span className="text-xs font-bold text-muted-foreground block">{L.min}</span>
                  <span className="text-lg font-bold text-foreground">
                    {selectedCrop.minPrice > 0 ? formatINR(selectedCrop.minPrice) : "N/A"}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                  <span className="text-xs font-bold text-muted-foreground block">{L.max}</span>
                  <span className="text-lg font-bold text-foreground">
                    {selectedCrop.maxPrice > 0 ? formatINR(selectedCrop.maxPrice) : "N/A"}
                  </span>
                </div>
              </div>

              {/* Selling Advice if Available */}
              {selectedCrop.sellingAdvice && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Sparkles size={14} /> {hi ? "AI स्मार्ट मंडी सलाह" : "AI Farmer Advisory"}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {selectedCrop.sellingAdvice.confidence}{L.confidence}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {hi ? selectedCrop.sellingAdvice.reasonHi : selectedCrop.sellingAdvice.reasonEn}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <AgriButton className="flex-1 py-3" onClick={() => setSelectedCrop(null)}>
                  {hi ? "बंद करें" : "Close"}
                </AgriButton>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveMandi;
