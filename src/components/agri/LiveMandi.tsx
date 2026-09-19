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
import { getCropImage } from "@/lib/crop-images";
import { ErrorState } from "@/components/ui/error-state";
import { AgriCard } from "@/components/ui/agri-card";
import { AgriButton } from "@/components/ui/agri-button";
import { AgriImage } from "@/components/ui/agri-image";
import { CommodityImage } from "@/components/agri/CommodityImage";
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

const CATEGORIES = ["All", "Cereals", "Pulses", "Vegetables", "Fruits", "Spices", "Oilseeds", "Commercial", "Other"];

const LiveMandi: React.FC<LiveMandiProps> = ({ onToast, onNavigateToAuth }) => {
  const { t, language } = useLanguage();
  const hi = language === "hi";

  const L = {
    title: t("mandi.hub.title") || "Live Mandi Advisor & Prices",
    subtitle: t("mandi.hub.subtitle") || "Verified APMC rates & Market Intelligence",
    live: t("mandi.hub.liveBadge") || "LIVE APMC",
    updated: t("mandi.updated") || "Updated",
    search: t("mandi.hub.searchPlaceholder") || "Search crop, mandi, district or state...",
    allStates: t("mandi.allStates") || "All States",
    allDistricts: t("mandi.hub.allDistricts") || "All Districts",
    onlyFavs: t("mandi.onlyFavs") || "Favorites",
    tabPrices: t("mandi.tabPrices") || "Prices",
    tabAdvisor: t("mandi.hub.tabAdvisor") || "AI Advisor",
    tabTrends: t("mandi.tabTrends") || "Trends",
    tabCompare: t("mandi.tabCompare") || "Market Comparison",
    tabNearby: t("mandi.tabNearby") || "Nearby",
    tabAlerts: t("mandi.tabAlerts") || "Alerts",
    perQuintal: t("mandi.perQuintal") || "/quintal",
    min: t("mandi.min") || "Min",
    max: t("mandi.max") || "Max",
    msp: t("mandi.hub.msp") || "MSP",
    loading: t("mandi.hub.loading") || "Fetching latest verified government mandi prices...",
    failed: t("mandi.hub.failed") || "Government mandi data is temporarily unavailable.",
    retry: t("mandi.hub.retrySync") || "Retry Sync",
    verifiedSource: t("mandi.hub.verifiedSource") || "Verified Government Data: api.data.gov.in",
    loadMore: t("mandi.hub.loadMore") || "Load More",
    quintalArrival: t("mandi.hub.quintalArrival") || "क्विंटल आवक",
    mandiOpen: t("mandi.hub.mandiOpen") || "मंडी खुली है",
    mandiClosed: t("mandi.hub.mandiClosed") || "बंद",
    viewAdvice: t("mandi.hub.viewAdvice") || "सलाह देखें",
    aiAdvisorTitle: t("mandi.hub.aiAdvisorTitle") || "AI मंडी सलाहकार",
    aiAdvisorDesc: t("mandi.hub.aiAdvisorDesc") || "लाइव APMC मंडी भाव, MSP और बाजार रुझान का AI विश्लेषण",
    aiAdvisorLongDesc: t("mandi.hub.aiAdvisorLongDesc") || "यह सिस्टम सरकारी मंडियों के वास्तविक भाव, MSP सुरक्षा कवर, और आवक दबाव का गहराई से विश्लेषण करके आपको सही समय पर फसल बेचने की सलाह देता है।",
    analysisTitle: t("mandi.hub.analysisTitle") || "कारण एवं विश्लेषण:",
    dailyArrival: t("mandi.hub.dailyArrival") || "दैनिक आवक",
    priceRangeLabel: t("mandi.hub.priceRangeLabel") || "अनुमानित संभावित मूल्य दायरा:",
    yieldBenefitTitle: t("mandi.hub.yieldBenefitTitle") || "आपकी उपज पर संभावित अतिरिक्त लाभ",
    yieldBenefitLabel: t("mandi.hub.yieldBenefitLabel") || "लाभ",
    yieldQtyLabel: t("mandi.hub.yieldQtyLabel") || "आपकी उपज मात्रा (क्विंटल):",
    currentModalPrice: t("mandi.hub.currentModalPrice") || "वर्तमान मॉडल मूल्य",
    closeBtn: t("mandi.hub.close") || "बंद करें",
    confidence: t("mandi.hub.confidence") || "% सटीक पूर्वानुमान",
    arrivalLabel: t("mandi.hub.arrivalLabel") || "आवक:",
    nullRange: t("mandi.hub.nullRange") || "Not available",
  };

  const CATEGORY_LABELS: Record<string, string> = {
    All: t("mandi.hub.categoryAll"),
    Cereals: t("mandi.hub.categoryCereals"),
    Pulses: t("mandi.hub.categoryPulses"),
    Vegetables: t("mandi.hub.categoryVegetables"),
    Fruits: t("mandi.hub.categoryFruits"),
    Spices: t("mandi.hub.categorySpices"),
    Oilseeds: t("mandi.hub.categoryOilseeds"),
    Commercial: t("mandi.hub.categoryCommercial"),
  };

  const [data, setData] = useState<MandiPrice[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const [servedFrom, setServedFrom] = useState<"database" | "live" | undefined>(undefined);
  const [isStale, setIsStale] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isCachedData, setIsCachedData] = useState(false);
  const [cachedAtText, setCachedAtText] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("prices");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedState, setSelectedState] = useState("Rajasthan");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMandi, setSelectedMandi] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState<SortOption>("highest");
  const [compareCrop, setCompareCrop] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 20; // number of cards per page

  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<MandiPrice | null>(null);
  // Reset pagination when filters/search change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedState, selectedDistrict, selectedMandi, selectedCategory, favoritesOnly, sortOption]);

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

  const fetchMandi = useCallback(async (showSpinner = false, opts: { sync?: boolean } = {}) => {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result: MandiResult = await fetchMandiPrices(
        undefined,
        selectedState || undefined,
        selectedDistrict || undefined,
        selectedMandi || undefined,
        { includeMeta: true, sync: opts.sync ?? false, timeoutMs: 90000 }
      );

      if (result.isError) {
        // Keep whatever verified records are already on screen when a re-sync
        // fails (e.g. data.gov.in rate limit) instead of blanking the view.
        if (data.length === 0) setData([]);
        setError(result.errorMessage || L.failed);
        setRateLimited(true);
      } else {
        setData(result.prices);
        if (result.availableStates?.length) setAvailableStates(result.availableStates);
        if (result.availableDistricts?.length) setAvailableDistricts(result.availableDistricts);
        if (result.availableMarkets?.length) setAvailableMarkets(result.availableMarkets);
        setServedFrom(result.servedFrom);
        setIsStale(!!result.stale);
        setRateLimited(!!result.rateLimited);
        setIsCachedData(!!result.isCached);
        setCachedAtText(result.cachedAtText || null);
        setLastUpdated(result.lastUpdated ? new Date(result.lastUpdated) : new Date());
        setError(null);
      }
    } catch (err: unknown) {
      console.error("[UI Mandi Fetch Error]:", err);
      if (data.length === 0) setData([]);
      setError(L.failed);
      setRateLimited(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedState, selectedDistrict, selectedMandi, L.failed]);

  useEffect(() => {
    fetchMandi();
  }, [fetchMandi]);

  // Force a fresh sync from data.gov.in when the persisted snapshot is stale or
  // the user taps the "Sync now" retry. Never invents data: if the live API is
  // rate-limited, the previously-synced government records are kept on screen.
  const resync = useCallback(() => {
    setRateLimited(false);
    void fetchMandi(true, { sync: true });
  }, [fetchMandi]);

  // Option sources come from the edge function's dynamic discovery meta (never a
  // hardcoded subset). Data-derived state/district/mandi names are merged so every
  // option shown is backed by a real record.
  const states = useMemo(() => {
    const fromMeta = new Set(availableStates.map(s => s.trim()).filter(Boolean));
    const fromData = new Set(data.map(c => c.state).filter(Boolean));
    return Array.from(new Set<string>([...fromMeta, ...fromData])).sort();
  }, [availableStates, data]);
  const districts = useMemo(() => {
    const scoped = new Set(
      availableDistricts.length
        ? availableDistricts
        : data.filter(c => !selectedState || c.state === selectedState).map(c => c.district)
    );
    const fromData = new Set(data.filter(c => !selectedState || c.state === selectedState).map(c => c.district).filter(Boolean));
    return Array.from(new Set<string>([...scoped, ...fromData])).sort();
  }, [availableDistricts, data, selectedState]);
  const mandis = useMemo(() => {
    const scoped = new Set(
      availableMarkets.length
        ? availableMarkets
        : data.map(c => c.market).filter(Boolean)
    );
    const fromData = new Set(
      data
        .filter(c => (!selectedState || c.state === selectedState) && (!selectedDistrict || c.district === selectedDistrict))
        .map(c => c.market)
        .filter(Boolean)
    );
    return Array.from(new Set<string>([...scoped, ...fromData])).sort();
  }, [availableMarkets, data, selectedState, selectedDistrict]);

  // Default to Rajasthan only when the government dataset actually contains it;
  // otherwise start on "All States" rather than forcing a wrong geographic scope.
  useEffect(() => {
    if (!loading && states.length > 0 && selectedState && !states.includes(selectedState)) {
      setSelectedState("");
    }
  }, [loading, states, selectedState]);

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

  // States/districts/mandis come from the government dataset via the edge
  // function's dynamic discovery meta (never a hardcoded subset). Data-derived
  // state/district/mandi names are merged so every option shown is backed by a
  // real record.
  // Option sources come from the edge function's dynamic discovery meta (never a
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
    if (selectedMandi) list = list.filter(c => c.market === selectedMandi);
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
  }, [data, searchTerm, selectedState, selectedDistrict, selectedMandi, selectedCategory, favoritesOnly, sortOption, isFav]);

  // Paginated slice of filtered results
  const paginated = useMemo(() => filtered.slice(0, page * pageSize), [filtered, page, pageSize]);

  const changeBadge = (c: MandiPrice) => {
    const ch = parseChange(c.change);
    return (
      <span
        title={c.minPrice > 0 && c.maxPrice > 0 ? "Position of the modal price within today's published min–max range" : "No day-over-day comparison is published for this feed"}
        className={cn(
          "type-num inline-flex items-center gap-0.5 text-xs mt-0.5",
          c.status === "up" && "text-primary",
          c.status === "down" && "text-destructive",
          (!c.status || c.status === "stable") && "text-muted-foreground",
        )}>
        {c.status === "up" && <TrendingUp size={11} />}
        {c.status === "down" && <TrendingDown size={11} />}
        {(!c.status || c.status === "stable") && <Minus size={11} />}
        {ch > 0 ? `+${ch.toFixed(1)}%` : `${ch.toFixed(1)}%`}
      </span>
    );
  };

  const fmtRange = (n: number) => (n > 0 ? formatINR(n) : L.nullRange);

  const renderAdviceBadge = (c: MandiPrice) => {
    const advice = c.sellingAdvice;
    if (!advice) return null;

    const bgMap = {
      emerald: "bg-emerald-600 text-white border-emerald-500",
      amber: "bg-amber-500 text-slate-950 border-amber-400 font-semibold",
      rose: "bg-rose-600 text-white border-rose-500",
    };

    return (
      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm flex items-center gap-1", bgMap[advice.badgeColor])}>
        <Sparkles size={11} />
        {hi ? advice.badgeLabelHi : advice.badgeLabel}
      </span>
    );
  };

  const renderCard = (c: MandiPrice, index: number) => {
    const fav = isFav(c);
    const mspDiff = c.msp ? c.price - c.msp : null;

    return (
      <button
        key={c.id}
        onClick={() => setSelectedCrop(c)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="truncate text-[14px] font-semibold text-foreground leading-tight">
            {c.crop} {c.cropHi && c.cropHi !== c.crop && <span className="text-[12px] font-normal text-muted-foreground">({c.cropHi})</span>}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {c.market}, {c.district}{c.state ? `, ${c.state}` : ""}
            {c.operatingStatus === "OPEN" ? " · Open" : c.operatingStatus ? " · Closed" : ""}
          </p>
          {mspDiff !== null && (
            <p className={cn("mt-0.5 text-xs font-medium", mspDiff >= 0 ? "text-primary" : "text-amber-600")}>
              {mspDiff >= 0 ? `+${formatINR(mspDiff)} Above MSP` : `-${formatINR(Math.abs(mspDiff))} Below MSP`}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="type-num text-[15px] text-foreground leading-tight">
            {formatINR(c.price)}
            <span className="text-xs font-normal text-muted-foreground"> {L.perQuintal}</span>
          </p>
          {changeBadge(c)}
        </div>
        <ChevronRight size={15} className="shrink-0 text-muted-foreground/60" aria-hidden="true" />
      </button>
    );
  };

  const renderAdvisorTab = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Bot size={17} aria-hidden="true" />
          </div>
          <div>
            <h3 className="type-h3">{L.aiAdvisorTitle}</h3>
            <p className="type-meta">{L.aiAdvisorDesc}</p>
          </div>
        </div>
        <p className="type-small text-muted-foreground leading-relaxed pt-1">
          {L.aiAdvisorLongDesc}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {paginated.map((c, i) => renderCard(c, i))}
      </div>
      {paginated.length < filtered.length && (
        <div className="flex justify-center pt-2">
          <AgriButton variant="outline" onClick={() => setPage(p => p + 1)} className="px-6">
            {L.loadMore}
          </AgriButton>
        </div>
      )}
    </div>
  );

  const renderCompareTab = () => {
    const crops = Array.from(new Set(data.map((c) => c.crop)));
    const active = compareCrop || "";
    const records = active ? data.filter((c) => c.crop === active) : [];
    const sorted = [...records].sort((a, b) => b.price - a.price);
    const best = sorted[0];
    const lowest = sorted[sorted.length - 1];

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-primary shrink-0" size={17} aria-hidden="true" />
            <h3 className="type-h3">Compare crop prices across mandis</h3>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground">Select crop to compare</p>
            <select
              aria-label="Select crop to compare"
              value={active}
              onChange={(e) => setCompareCrop(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Select a crop</option>
              {crops.map((crop) => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          {active && records.length > 0 && (
            <>
              <div className="pt-1">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Calculator size={15} className="text-emerald-600 shrink-0" /> Smart Farmer Selling Decision
                </h4>
                {best && lowest && best !== lowest ? (
                  <div className="mt-2 rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground leading-relaxed">
                    <p>
                      Best price for <b>{active}</b> is at <b>{best.market}</b> ({formatINR(best.price)}{L.perQuintal}) —
                      that's <b>{formatINR(best.price - lowest.price)}{L.perQuintal}</b> more than {lowest.market}.
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Consider carrying your produce to {best.market} for a better return on {active}.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl p-3 bg-slate-100 dark:bg-slate-800 text-xs text-muted-foreground">
                    Only one active mandi is reporting {active} right now. More live data will improve this comparison.
                  </div>
                )}
              </div>

              <ul className="space-y-1.5">
                {sorted.map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2 text-xs",
                      c === best && sorted.length > 1
                        ? "bg-emerald-500/10 border border-emerald-500/30 font-bold text-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {c === best && sorted.length > 1 && <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />}
                      <span className="truncate">{c.market}, {c.district}</span>
                    </span>
                    <span className="font-semibold shrink-0">{formatINR(c.price)}{L.perQuintal}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  };

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

    return (
      <div className="fixed inset-0 z-[60]">
        <div className="absolute inset-0 bg-black/60 " onClick={() => setSelectedCrop(null)} />
        <div className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border  " role="dialog" aria-modal="true" aria-label={`${c.crop} ${c.cropHi ? `(${c.cropHi})` : ""}`}>
          <div className="sticky top-0 bg-card/95  pt-3 pb-2 px-5 flex items-center justify-between border-b border-border z-10">
            <div className="mx-auto absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="pt-3">
              <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                {c.crop} {c.cropHi && <span className="text-sm font-semibold opacity-80">({c.cropHi})</span>}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin size={11} /> {c.market}, {c.district}, {c.state}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-3">
              <button onClick={() => toggleFavorite(c)} aria-label={t("mandi.hub.ariaFavorite")} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Heart size={18} className={fav ? "fill-rose-500 text-rose-500" : "text-slate-400"} />
              </button>
              <button onClick={() => setSelectedCrop(null)} aria-label={t("mandi.hub.ariaClose")} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Selected Crop Image Banner */}
          <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <CommodityImage
              commodityName={c.crop}
              commodityHi={c.cropHi}
              category={c.category}
              src={c.cropImage}
              alt={c.crop}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-emerald-700 pointer-events-none" />
            <div className="absolute bottom-3 left-4 right-4 text-white flex items-end justify-between">
              <div>
                <span className="text-xs bg-emerald-600/90 text-white font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                  {c.category}
                </span>
                <p className="text-sm font-bold text-white/90">
                  {c.market} · {c.district}, {c.state}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs opacity-80 block">{L.arrivalLabel}</span>
                <span className="text-sm font-semibold text-white">{c.arrivalDate || L.nullRange}</span>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Advice Hero Banner */}
            {advice && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  {renderAdviceBadge(c)}
                  <span className="type-meta font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded">
                    {advice.confidence}{L.confidence}
                  </span>
                </div>

                <div>
                  <p className="type-h3 mb-1">{L.analysisTitle}</p>
                  <p className="type-small text-muted-foreground">
                    {hi ? advice.reasonHi : advice.reasonEn}
                  </p>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg border border-border flex items-center justify-between type-small">
                  <span className="text-muted-foreground">{L.priceRangeLabel}</span>
                  <span className="font-semibold text-foreground type-num">
                    {formatINR(advice.minExpectedPrice)} – {formatINR(advice.maxExpectedPrice)} {L.perQuintal}
                  </span>
                </div>
              </div>
            )}

            {/* Price Details */}
            <div className="flex items-end justify-between border-t border-border pt-4">
              <div>
                <span className="text-xs text-muted-foreground font-semibold block">{L.currentModalPrice}</span>
                <p className="text-3xl font-semibold text-foreground">{formatINR(c.price)}</p>
                <p className="text-xs text-muted-foreground">{L.perQuintal}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {changeBadge(c)}
                <div className="flex gap-3 text-xs text-muted-foreground font-medium">
                  <span>{L.min}: <b className="text-foreground">{fmtRange(c.minPrice)}</b></span>
                  <span>{L.max}: <b className="text-foreground">{fmtRange(c.maxPrice)}</b></span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <AgriButton className="flex-1" onClick={() => { setAlertPrefill({ commodity: c.crop, price: c.price }); setSelectedCrop(null); setTab("alerts"); }}>
                <Bell size={15} /> {L.tabAlerts}
              </AgriButton>
              <AgriButton variant="outline" className="flex-1" onClick={() => setSelectedCrop(null)}>
                {hi ? L.closeBtn : "Close"}
              </AgriButton>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-28 pt-5 px-4 space-y-4 max-w-3xl mx-auto">
      {/* Offline Cache Timestamp Banner */}
      {isCachedData && cachedAtText && typeof navigator !== 'undefined' && !navigator.onLine && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-medium text-amber-800 dark:text-amber-200">
          <span className="flex items-center gap-2 min-w-0">
            <WifiOff size={14} className="shrink-0" />
            <span className="truncate">Showing cached prices from {cachedAtText} (Offline)</span>
          </span>
          <button onClick={() => fetchMandi(true)} className="shrink-0 font-semibold underline">{L.retry}</button>
        </div>
      )}

      {/* Verified government snapshot banner — served from persisted AGMARKNET records */}
      {!error && !isCachedData && servedFrom === "database" && (
        <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-2 min-w-0">
            <ShieldCheck size={14} className="shrink-0 text-primary" />
            <span className="truncate">
              {L.verifiedSource} · AGMARKNET
              {rateLimited ? " · Live refresh is rate-limited right now; showing the last synced records." : ""}
            </span>
          </span>
          <button onClick={resync} disabled={refreshing} className="shrink-0 font-semibold text-foreground flex items-center gap-1">
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {hi ? "सिंक करें" : "Sync now"}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="type-h1 text-foreground">{L.title}</h1>
          <p className="type-small text-muted-foreground mt-1">{L.subtitle}</p>
          {lastUpdated && !error && (
            <p className="type-meta mt-1.5 flex items-center gap-1">
              <Clock size={11} className="text-muted-foreground" />
              {L.updated}: {lastUpdated.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · AGMARKNET
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <span className={cn(
            "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold tracking-wide",
            error ? "bg-destructive/10 text-destructive" : isCachedData ? "bg-amber-500/10 text-amber-700" : "bg-primary/10 text-primary"
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", error ? "bg-destructive" : isCachedData ? "bg-amber-500" : "bg-primary")} />
            {error ? "Offline" : isCachedData ? "Cached" : refreshing ? "Syncing…" : servedFrom === "live" ? "Live" : "Verified"}
          </span>
          <AgriButton size="sm" variant="outline" onClick={() => fetchMandi(true)} disabled={refreshing} aria-label={t("mandi.hub.ariaRefresh")}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </AgriButton>
        </div>
      </div>

      {/* Search & Autocomplete Dropdown */}
<div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
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
            className="w-full touch-target pl-10 pr-4 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
          />

          {/* Search suggestions */}
          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-float z-30 overflow-hidden py-1">
              {searchSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSearchTerm(s);
                    setPage(1);
                    setShowSearchSuggestions(false);
                  }}
                  className="w-full touch-target text-left px-4 py-2 text-[13px] text-foreground hover:bg-muted transition-colors flex items-center justify-between"
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
                "touch-target flex items-center px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* Filters & Sorting */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <select
            aria-label={t("mandi.hub.ariaFilterState")}
            value={selectedState}
            onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict(""); setSelectedMandi(""); setPage(1); }}
            className="min-h-[44px] px-3 bg-background border border-input rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 truncate"
          >
            <option value="">{L.allStates}</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            aria-label={t("mandi.hub.ariaFilterDistrict")}
            value={selectedDistrict}
            onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedMandi(""); setPage(1); }}
            className="min-h-[44px] px-3 bg-background border border-input rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 truncate"
          >
            <option value="">{L.allDistricts}</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            aria-label="Filter by Mandi"
            value={selectedMandi}
            onChange={(e) => { setSelectedMandi(e.target.value); setPage(1); }}
            className="min-h-[44px] px-3 bg-background border border-input rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 truncate"
          >
            <option value="">All Mandis</option>
            {mandis.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            aria-label={t("mandi.hub.ariaSortPrices")}
            value={sortOption}
            onChange={(e) => { setSortOption(e.target.value as SortOption); setPage(1); }}
            className="min-h-[44px] px-3 bg-background border border-input rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 truncate"
          >
            <option value="highest">{t("mandi.hub.sortHighest")}</option>
            <option value="lowest">{t("mandi.hub.sortLowest")}</option>
            <option value="latest">{t("mandi.hub.sortLatest")}</option>
            <option value="alphabetical">{t("mandi.hub.sortAlphabetical")}</option>
          </select>

          <button
            onClick={() => { setFavoritesOnly(f => !f); setPage(1); }}
            className={cn(
              "flex min-h-[44px] items-center justify-center gap-1.5 px-3 rounded-lg border text-[13px] font-medium transition-colors",
              favoritesOnly
                ? "bg-destructive/5 text-destructive border-destructive/30"
                : "bg-background text-muted-foreground border-input hover:text-foreground"
            )}
          >
            <Heart size={13} className={favoritesOnly ? "fill-destructive text-destructive" : ""} />
            {L.onlyFavs}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-b border-border pb-px">
        {TAB_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => { setTab(item.id); setPage(1); }}
            className={cn(
              "flex touch-target items-center gap-1.5 shrink-0 px-3 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px",
              tab === item.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon size={13} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-xl border border-border bg-card divide-y divide-border pt-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchMandi(true)} />
      ) : tab === "advisor" ? (
        renderAdvisorTab()
      ) : tab === "compare" ? (
        renderCompareTab()
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 px-4 bg-card rounded-xl border border-border my-4 space-y-3">
          <Store className="mx-auto w-10 h-10 text-muted-foreground" />
          <h4 className="type-h3">No Government mandi records found for this selection</h4>
          <p className="type-small text-muted-foreground max-w-sm mx-auto">
            The government dataset has no published crop rate for this combination of state, district, mandi or category. Try a different selection.
          </p>
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
              setPage(1);
            }}
          >
            Clear All Filters
          </AgriButton>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {paginated.map((c, i) => renderCard(c, i))}
          {paginated.length < filtered.length && (
            <button onClick={() => setPage(p => p + 1)} className="w-full px-3.5 py-3 text-center text-[12px] font-semibold text-primary hover:bg-muted/50 transition-colors">
              {L.loadMore}
            </button>
          )}
        </div>
      )}

      {/* Detail Bottom Sheet */}
      {renderDetailSheet()}
    </div>
  );
};

export default LiveMandi;
