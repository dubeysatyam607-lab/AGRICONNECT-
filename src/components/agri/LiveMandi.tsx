import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Search, MapPin, Star,
  Bell, BarChart3, LineChart as LineChartIcon, Store, Heart, X, ChevronRight,
  Navigation, Phone, Clock, Bot, ShieldCheck, ArrowUpDown, Filter, AlertCircle, WifiOff,
  Sparkles, Calculator, CheckCircle2, AlertTriangle, Layers, Info
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart,
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";
import { fetchMandiPrices, normalizeCropKey, type MandiPrice, type MandiResult } from "@/lib/mandi-api";
import { searchAgriImages } from "@/lib/pexels-api";
import { ErrorState } from "@/components/ui/error-state";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { useLanguage } from "@/contexts/LanguageContext";

interface NearbyPlace {
  id: string;
  name: string;
  nameHi: string;
  type: "market" | "shop";
  distance: string | null;
  address: string;
  addressHi: string;
  phone: string;
  timings: string;
  rating: number;
  lat: number;
  lng: number;
}

type Tab = "prices" | "advisor" | "trends" | "compare" | "nearby" | "alerts";
type SortOption = "highest" | "lowest" | "latest" | "alphabetical";

const FAVORITES_KEY = "mandi_favorites_v2";

const PEXELS_QUERY_ALIASES: Record<string, string> = {
  tur: "tur dal",
  arhar: "pigeon pea",
  moong: "green gram",
  chana: "chickpea",
  gram: "chickpea",
  bhindi: "okra",
  paddy: "paddy rice",
  masoor: "red lentils",
  jowar: "sorghum",
  bajra: "pearl millet",
  groundnut: "peanuts",
};

const formatINR = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const parseChange = (change?: string): number => {
  if (!change) return 0;
  const num = parseFloat(change.replace("%", "").replace(",", ""));
  return isNaN(num) ? 0 : num;
};

interface LiveMandiProps {
  onToast?: (message: string) => void;
  onNavigateToAuth?: () => void;
}

const CATEGORIES = ["All", "Cereals", "Pulses", "Vegetables", "Fruits", "Spices", "Oilseeds", "Commercial"];

const LiveMandi: React.FC<LiveMandiProps> = ({ onToast, onNavigateToAuth }) => {
  const { t, language } = useLanguage();
  const hi = language === "hi";

  const L = {
    title: hi ? "लाइव मंडी सलाह और भाव" : "Live Mandi Advisor & Prices",
    subtitle: hi ? "भारत सरकार APMC आधिकारिक मंडी डेटा और AI बिक्री सलाह" : "Verified APMC rates & AI Selling Intelligence",
    live: hi ? "लाइव APMC" : "LIVE APMC",
    updated: hi ? "अपडेटेड" : "Updated",
    search: hi ? "फसल, मंडी, जिला या राज्य खोजें..." : "Search crop, mandi, district or state...",
    allStates: hi ? "सभी राज्य" : "All States",
    allDistricts: hi ? "सभी जिले" : "All Districts",
    onlyFavs: hi ? "पसंदीदा" : "Favorites",
    tabPrices: hi ? "भाव लिस्ट" : "Prices",
    tabAdvisor: hi ? "AI बिक्री सलाह" : "AI Advisor",
    tabTrends: hi ? "मूल्य रुझान" : "Trends",
    tabCompare: hi ? "मंडी तुलना" : "Compare",
    tabNearby: hi ? "पास की मंडी" : "Nearby",
    tabAlerts: hi ? "मूल्य अलर्ट" : "Alerts",
    perQuintal: hi ? "/क्विंटल" : "/quintal",
    min: hi ? "न्यूनतम" : "Min",
    max: hi ? "अधिकतम" : "Max",
    msp: hi ? "एमएसपी (MSP)" : "MSP",
    loading: hi ? "लाइव मंडी डेटा लोड हो रहा है..." : "Fetching live APMC mandi prices...",
    failed: hi ? "लाइव मंडी भाव वर्तमान में अनुपलब्ध हैं।" : "Live mandi prices are currently unavailable.",
    retry: hi ? "पुनः प्रयास करें" : "Retry Sync",
    verifiedSource: hi ? "सत्यापित डेटा: api.data.gov.in" : "Verified Source: api.data.gov.in",
  };

  const [data, setData] = useState<MandiPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isCachedData, setIsCachedData] = useState(false);
  const [cachedAtText, setCachedAtText] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("prices");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState<SortOption>("highest");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 20; // number of cards per page

  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<MandiPrice | null>(null);
  const [harvestQuantity, setHarvestQuantity] = useState<number>(50);
  // Reset pagination when filters/search change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedState, selectedDistrict, selectedCategory, favoritesOnly, sortOption]);

  // Real crop photos (Pexels) keyed by normalized crop name
  const [cropImages, setCropImages] = useState<Record<string, string>>({});
  const loadingImages = useRef<Set<string>>(new Set());

  // Nearby state
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const [alertPrefill, setAlertPrefill] = useState<{ commodity: string; price: number } | null>(null);

  const isFav = useCallback((c: MandiPrice) => favorites.includes(c.id), [favorites]);

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

  const fetchMandi = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result: MandiResult = await fetchMandiPrices(searchTerm);

      if (result.isError) {
        setError(result.errorMessage || L.failed);
        setData([]);
      } else {
        setData(result.prices);
        setIsCachedData(!!result.isCached);
        setCachedAtText(result.cachedAtText || null);
        setLastUpdated(result.lastUpdated ? new Date(result.lastUpdated) : new Date());
        setError(null);
      }
    } catch (err: unknown) {
      console.error("[UI Mandi Fetch Error]:", err);
      setError(L.failed);
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, L.failed]);

  useEffect(() => {
    fetchMandi();
  }, [fetchMandi]);

  // Upgrade card images to real, verified Pexels photos (one per unique crop)
  useEffect(() => {
    const uniqueCrops = new Map<string, string>();
    for (const c of data) {
      const key = normalizeCropKey(c.crop);
      if (!uniqueCrops.has(key)) uniqueCrops.set(key, c.crop);
    }

    let cancelled = false;
    (async () => {
      for (const [key, name] of uniqueCrops) {
        if (cancelled || cropImages[key] || loadingImages.current.has(key)) continue;
        loadingImages.current.add(key);
        try {
          const query = PEXELS_QUERY_ALIASES[key] || name;
          const photos = await searchAgriImages(`${query} crop`, 1);
          const photo = photos.find(p => p.photographer !== "AgriConnect Media");
          if (!cancelled && photo && photo.src) {
            const url = photo.src.medium || photo.src.large || photo.src.small;
            if (url) setCropImages(prev => ({ ...prev, [key]: url }));
          }
        } catch {
          // keep the curated fallback image
        }
      }
    })();

    return () => { cancelled = true; };
  }, [data, cropImages]);

  const fetchNearby = useCallback(async () => {
    setNearbyLoading(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 8000, maximumAge: 300000,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch { /* permission denied */ }
      }

      const { data: result, error: fetchError } = await invokeEdgeWithTimeout<{
        places?: NearbyPlace[];
      }>("nearby-services", { latitude: lat, longitude: lng, type: "markets" }, 12000);

      if (fetchError) throw new Error(fetchError);
      setNearbyPlaces((result?.places || []) as NearbyPlace[]);
      setNearbyError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load nearby markets";
      setNearbyError(msg.includes("took too long") ? "Nearby markets took too long to load." : msg);
    } finally {
      setNearbyLoading(false);
    }
  }, []);

  const openInMaps = (p: NearbyPlace) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, "_blank");
  };

  // States & Districts
  const states = useMemo(() => Array.from(new Set(data.map(c => c.state))).filter(Boolean).sort(), [data]);
  const districts = useMemo(() => {
    let subset = data;
    if (selectedState) subset = subset.filter(c => c.state === selectedState);
    return Array.from(new Set(subset.map(c => c.district))).filter(Boolean).sort();
  }, [data, selectedState]);

  // Autocomplete Suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const q = searchTerm.toLowerCase();
    const matches = new Set<string>();

    for (const c of data) {
      if (c.crop.toLowerCase().includes(q)) matches.add(c.crop);
      if (c.cropHi && c.cropHi.toLowerCase().includes(q)) matches.add(c.cropHi);
      if (c.market.toLowerCase().includes(q)) matches.add(c.market);
      if (c.district.toLowerCase().includes(q)) matches.add(c.district);
      if (c.state.toLowerCase().includes(q)) matches.add(c.state);
      if (matches.size >= 6) break;
    }
    return Array.from(matches);
  }, [data, searchTerm]);

  // Filtered & Sorted Mandi List
  const filtered = useMemo(() => {
    let list = [...data];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c =>
        c.crop.toLowerCase().includes(q) ||
        (c.cropHi || "").toLowerCase().includes(q) ||
        c.market.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q)
      );
    }

    if (selectedState) list = list.filter(c => c.state === selectedState);
    if (selectedDistrict) list = list.filter(c => c.district === selectedDistrict);
    if (selectedCategory && selectedCategory !== "All") list = list.filter(c => c.category === selectedCategory);
    if (favoritesOnly) list = list.filter(isFav);

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
  }, [data, searchTerm, selectedState, selectedDistrict, selectedCategory, favoritesOnly, sortOption, isFav]);

  // Paginated slice of filtered results
  const paginated = useMemo(() => filtered.slice(0, page * pageSize), [filtered, page, pageSize]);

  const changeBadge = (c: MandiPrice) => {
    const ch = parseChange(c.change);
    return (
      <span className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-full border",
        c.status === "up" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        c.status === "down" && "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
        (!c.status || c.status === "stable") && "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      )}>
        {c.status === "up" && <TrendingUp size={11} />}
        {c.status === "down" && <TrendingDown size={11} />}
        {(!c.status || c.status === "stable") && <Minus size={11} />}
        {ch > 0 ? `+${ch.toFixed(1)}%` : `${ch.toFixed(1)}%`}
      </span>
    );
  };

  const renderAdviceBadge = (c: MandiPrice) => {
    const advice = c.sellingAdvice;
    if (!advice) return null;

    const bgMap = {
      emerald: "bg-emerald-600 text-white border-emerald-500",
      amber: "bg-amber-500 text-slate-950 border-amber-400 font-extrabold",
      rose: "bg-rose-600 text-white border-rose-500",
    };

    return (
      <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm flex items-center gap-1", bgMap[advice.badgeColor])}>
        <Sparkles size={11} />
        {hi ? advice.badgeLabelHi : advice.badgeLabel}
      </span>
    );
  };

  const renderCard = (c: MandiPrice, index: number) => {
    const fav = isFav(c);
    const mspDiff = c.msp ? c.price - c.msp : null;
    const imgSrc = cropImages[normalizeCropKey(c.crop)] || c.cropImage;

    return (
      <AgriCard
        key={c.id}
        className="p-0 animate-fade-up hover:shadow-xl active:scale-[0.98] transition-all duration-200 cursor-pointer relative overflow-hidden group border border-border/80 bg-card rounded-2xl flex flex-col justify-between"
        style={{ animationDelay: `${Math.min(index * 35, 300)}ms` } as React.CSSProperties}
        onClick={() => setSelectedCrop(c)}
      >
        <div>
          {/* Top Banner Image & AI Badge */}
          <div className="relative h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={imgSrc}
              alt={c.crop}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=400'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              {renderAdviceBadge(c)}
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(c); }}
              className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors"
              aria-label={fav ? "Remove favorite" : "Add favorite"}
            >
              <Heart size={16} className={fav ? "fill-rose-500 text-rose-500" : "text-white"} />
            </button>

            <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between text-white">
              <div>
                <h3 className="font-extrabold text-base tracking-tight leading-none text-white drop-shadow">
                  {c.crop} {c.cropHi && c.cropHi !== c.crop && <span className="text-xs font-normal opacity-90">({c.cropHi})</span>}
                </h3>
                <p className="text-[10px] opacity-80 mt-0.5">{c.category} · {c.arrivalQuantity} क्विंटल आवक</p>
              </div>
              {changeBadge(c)}
            </div>
          </div>

          {/* Price Header */}
          <div className="p-3.5 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">{t('agr223')}</span>
                <p className="font-black text-2xl text-emerald-700 dark:text-emerald-400 leading-tight">
                  {formatINR(c.price)} <span className="text-xs font-semibold text-muted-foreground">{L.perQuintal}</span>
                </p>
              </div>

              {/* MSP comparison */}
              {c.msp && (
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">{L.msp}: {formatINR(c.msp)}</span>
                  {mspDiff !== null && (
                    <span className={cn(
                      "text-[10px] font-extrabold px-1.5 py-0.5 rounded-md inline-block mt-0.5",
                      mspDiff >= 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    )}>
                      {mspDiff >= 0 ? `+${formatINR(mspDiff)} Above MSP` : `${formatINR(mspDiff)} Below MSP`}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* AI Recommendation Reasoning Banner */}
            {c.sellingAdvice && (
              <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 flex items-start gap-2 text-xs">
                <Bot size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-snug line-clamp-2">
                  <strong className="text-foreground font-semibold">AI सलाह: </strong>
                  {hi ? c.sellingAdvice.reasonHi : c.sellingAdvice.reasonEn}
                </p>
              </div>
            )}

            {/* Min / Max Range */}
            <div className="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-2 flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>{L.min}: <b className="text-foreground">{formatINR(c.minPrice)}</b></span>
              <span className="h-3 w-px bg-border" />
              <span>{L.max}: <b className="text-foreground">{formatINR(c.maxPrice)}</b></span>
            </div>

            {/* Location & Market Hours */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1 truncate font-medium">
                <MapPin size={13} className="text-emerald-600 shrink-0" />
                {c.market}, {c.district}
              </span>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0", c.operatingStatus === "OPEN" ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-200 dark:bg-slate-800 text-muted-foreground")}>
                {c.operatingStatus === "OPEN" ? "🟢 मंडी खुली है" : "🔴 बंद"}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={13} /> {L.verifiedSource}
          </span>
          <span className="flex items-center gap-1 font-semibold text-emerald-600">
            सलाह देखें <ChevronRight size={13} />
          </span>
        </div>
      </AgriCard>
    );
  };

  const renderAdvisorTab = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-foreground">{t('agr224')}</h3>
            <p className="text-xs text-muted-foreground">लाइव APMC मंडी भाव, MSP और बाजार रुझान का AI विश्लेषण</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed pt-1">
          यह सिस्टम सरकारी मंडियों के वास्तविक भाव, MSP सुरक्षा कवर, और आवक दबाव का गहराई से विश्लेषण करके आपको सही समय पर फसल बेचने की सलाह देता है।
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginated.map((c, i) => renderCard(c, i))}
      </div>
      {paginated.length < filtered.length && (
        <div className="flex justify-center mt-4">
          <AgriButton variant="outline" onClick={() => setPage(p => p + 1)} className="px-6">
            Load More
          </AgriButton>
        </div>
      )}
    </div>
  );

  const TAB_ITEMS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "prices", label: L.tabPrices, icon: TrendingUp },
    { id: "advisor", label: L.tabAdvisor, icon: Bot },
    { id: "trends", label: L.tabTrends, icon: LineChartIcon },
    { id: "compare", label: L.tabCompare, icon: BarChart3 },
    { id: "nearby", label: L.tabNearby, icon: MapPin },
    { id: "alerts", label: L.tabAlerts, icon: Bell },
  ];

  const renderDetailSheet = () => {
    if (!selectedCrop) return null;
    const c = selectedCrop;
    const advice = c.sellingAdvice;
    const fav = isFav(c);

    const calculatedExtraEarnings = advice ? advice.extraProfit50Qtl * (harvestQuantity / 50) : 0;

    return (
      <div className="fixed inset-0 z-[60]">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedCrop(null)} />
        <div className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border animate-sheet-up shadow-2xl" role="dialog" aria-modal="true" aria-label={`${c.crop} ${c.cropHi ? `(${c.cropHi})` : ""}`}>
          <div className="sticky top-0 bg-card/95 backdrop-blur-md pt-3 pb-2 px-5 flex items-center justify-between border-b border-border z-10">
            <div className="mx-auto absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="pt-3">
              <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                {c.crop} {c.cropHi && <span className="text-sm font-semibold opacity-80">({c.cropHi})</span>}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin size={11} /> {c.market}, {c.district}, {c.state}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-3">
              <button onClick={() => toggleFavorite(c)} aria-label="Favorite" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Heart size={18} className={fav ? "fill-rose-500 text-rose-500" : "text-slate-400"} />
              </button>
              <button onClick={() => setSelectedCrop(null)} aria-label="Close" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Advice Hero Banner */}
            {advice && (
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 space-y-3">
                <div className="flex items-center justify-between">
                  {renderAdviceBadge(c)}
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    {advice.confidence}% सटीक पूर्वानुमान
                  </span>
                </div>

                <div>
                  <p className="text-sm font-extrabold text-foreground mb-1">कारण एवं विश्लेषण:</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {hi ? advice.reasonHi : advice.reasonEn}
                  </p>
                </div>

                <div className="bg-card p-3 rounded-xl border border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">अनुमानित संभावित मूल्य दायरा:</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                    {formatINR(advice.minExpectedPrice)} - {formatINR(advice.maxExpectedPrice)} {L.perQuintal}
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Harvest Extra Earnings Calculator */}
            {advice && (
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                    <Calculator size={15} className="text-emerald-600" /> आपकी उपज पर संभावित अतिरिक्त लाभ
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                    +{formatINR(calculatedExtraEarnings)} लाभ
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground font-semibold flex justify-between">
                    <span>आपकी उपज मात्रा (क्विंटल):</span>
                    <b className="text-foreground">{harvestQuantity} क्विंटल</b>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={harvestQuantity}
                    onChange={(e) => setHarvestQuantity(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Price Details */}
            <div className="flex items-end justify-between border-t border-border pt-4">
              <div>
                <span className="text-xs text-muted-foreground font-semibold block">वर्तमान मॉडल मूल्य</span>
                <p className="text-3xl font-black text-foreground">{formatINR(c.price)}</p>
                <p className="text-xs text-muted-foreground">{L.perQuintal}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {changeBadge(c)}
                <div className="flex gap-3 text-[10px] text-muted-foreground font-medium">
                  <span>{L.min}: <b className="text-foreground">{formatINR(c.minPrice)}</b></span>
                  <span>{L.max}: <b className="text-foreground">{formatINR(c.maxPrice)}</b></span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <AgriButton className="flex-1" onClick={() => { setAlertPrefill({ commodity: c.crop, price: c.price }); setSelectedCrop(null); setTab("alerts"); }}>
                <Bell size={15} /> {L.tabAlerts}
              </AgriButton>
              <AgriButton variant="outline" className="flex-1" onClick={() => setSelectedCrop(null)}>
                {hi ? "बंद करें" : "Close"}
              </AgriButton>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-28 pt-4 px-4 space-y-4 max-w-5xl mx-auto">
      {/* Offline Cache Timestamp Banner */}
      {isCachedData && cachedAtText && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold animate-fade-in shadow-sm">
          <span className="flex items-center gap-2">
            <WifiOff size={15} className="shrink-0" />
            Showing cached prices from {cachedAtText} (Offline Mode)
          </span>
          <button onClick={() => fetchMandi(true)} className="underline hover:no-underline font-extrabold shrink-0 ml-2">
            {L.retry}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2 tracking-tight">
            <TrendingUp className="text-emerald-700 dark:text-emerald-400" size={22} /> {L.title}
            <span className="flex items-center gap-1 text-[9px] font-black tracking-widest text-white bg-emerald-600 rounded-md px-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-live-dot" /> {L.live}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">{L.subtitle}</p>
        </div>

        <AgriButton size="sm" variant="outline" onClick={() => fetchMandi(true)} disabled={refreshing} aria-label="Refresh">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </AgriButton>
      </div>

      {/* Search & Autocomplete Dropdown */}
      <div className="space-y-3 bg-card p-3.5 rounded-2xl border border-border shadow-sm relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder={L.search}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
              setShowSearchSuggestions(true);
            }}
            onFocus={() => setShowSearchSuggestions(true)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium"
          />

          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden py-1">
              {searchSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSearchTerm(s);
                    setPage(1);
                    setShowSearchSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                >
                  <span>{s}</span>
                  <ChevronRight size={12} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors",
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filters & Sorting */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            aria-label="Filter State"
            value={selectedState}
            onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict(""); setPage(1); }}
            className="px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 truncate"
          >
            <option value="">{L.allStates}</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            aria-label="Filter District"
            value={selectedDistrict}
            onChange={(e) => { setSelectedDistrict(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 truncate"
          >
            <option value="">{L.allDistricts}</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            aria-label="Sort Prices"
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value as SortOption); setPage(1); }}
            className="px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 truncate"
          >
            <option value="highest">{t('agr225')}</option>
            <option value="lowest">{t('agr226')}</option>
            <option value="latest">{t('agr227')}</option>
            <option value="alphabetical">{t('agr228')}</option>
          </select>

          <button
            onClick={() => { setFavoritesOnly(f => !f); setPage(1); }}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
              favoritesOnly
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-400/40"
                : "bg-background text-muted-foreground border-input hover:text-foreground"
            )}
          >
            <Heart size={13} className={favoritesOnly ? "fill-rose-500 text-rose-500" : ""} />
            {L.onlyFavs}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {TAB_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => { setTab(item.id); setPage(1); }}
            className={cn(
              "flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-300 active:scale-95",
              tab === item.id
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-card text-muted-foreground border border-border hover:text-foreground"
            )}
          >
            <item.icon size={13} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-2xl border border-border animate-shimmer" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchMandi(true)} />
      ) : tab === "advisor" ? (
        renderAdvisorTab()
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((c, i) => renderCard(c, i))}
          {paginated.length < filtered.length && (
            <div className="flex items-center justify-center col-span-full mt-4">
              <AgriButton onClick={() => setPage(p => p + 1)}>{L.loadMore || "Load More"}</AgriButton>
            </div>
          )}
        </div>
      )}

      {/* Detail Bottom Sheet */}
      {renderDetailSheet()}
    </div>
  );
};

export default LiveMandi;
