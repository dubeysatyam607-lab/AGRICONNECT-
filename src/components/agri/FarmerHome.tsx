import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp, Scan, ShoppingBag, Tractor, Truck, Newspaper, ChevronRight,
  Droplets, Wind, IndianRupee, CloudSun,
  TrendingDown, Landmark, AlertTriangle, MapPin,
  ArrowRight, Flame, Sprout,
  Coins, FlaskConical, Warehouse, Bot, ShieldCheck,
  CheckCircle2, Sparkles, AlertCircle, RefreshCw, Sun, Moon
} from "lucide-react";
import DynamicHero from "./DynamicHero";
import AiInsightCard from "./AiInsightCard";
import TodayTasks from "./TodayTasks";
import { FirstDayBoard } from "./FirstDayBoard";
import { NotificationBell } from "@/features/notifications/presentation/components/NotificationBell";
import { AdvisorBriefCard } from "@/features/ai-advisor/presentation/components/AdvisorBriefCard";
import { INITIAL_TRACTORS } from "@/lib/mock-data";
import { useLanguage } from "@/contexts/LanguageContext";
import { interpolate, localeFor } from "@/i18n/journey";
import { useRole } from "@/contexts/RoleContext";
import { CattleAssetForm, TransportAssetForm, StoreInventoryForm, SoilTestLabForm } from "./AssetForms";
import { useOptionalAuth } from "@/hooks/useAuth";
import { useWeatherViewModel } from "@/features/weather/presentation/viewmodels/useWeatherViewModel";
import { useFarm } from "@/contexts/FarmContext";
import { deriveFarmAdvice } from "@/lib/farm-advisor";
import { fetchMandiPrices, type MandiPrice } from "@/lib/mandi-api";
import { WeatherDashboardModal } from "@/features/weather/presentation/views/WeatherDashboardModal";
import { LocationSelector } from "@/features/location/LocationSelector";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLocation } from "@/features/location/LocationContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/ui/Logo";

interface FarmerHomeProps {
  onNavigate: (tab: string) => void;
  onBookTractor: (tractor: (typeof INITIAL_TRACTORS)[number]) => void;
}

const PRIMARY_SERVICES = [
  { id: "mandi", icon: TrendingUp, labelKey: "svc.mandi", subKey: "svc.mandiSub", color: "emerald", badge: "Live APMC" },
  { id: "store", icon: ShoppingBag, labelKey: "svc.store", subKey: "svc.storeSub", color: "blue", badge: "Inputs" },
  { id: "tractors", icon: Tractor, labelKey: "svc.tractors", subKey: "svc.tractorsSub", color: "amber", badge: "Rentals" },
  { id: "schemes", icon: Landmark, labelKey: "svc.schemes", subKey: "svc.schemesSub", color: "indigo", badge: "Govt Subsidies" },
  { id: "soil", icon: FlaskConical, labelKey: "svc.soil", subKey: "svc.soilSub", color: "teal", badge: "Lab Test" },
  { id: "cattle", icon: Sprout, labelKey: "svc.cattle", subKey: "svc.cattleSub", color: "rose", badge: "Livestock" },
] as const;

const COND_EMOJI: Record<string, string> = {
  Sunny: "☀️",
  Clear: "🌙",
  "Partly Cloudy": "⛅",
  Overcast: "☁️",
  "Light Rain": "🌧️",
  "Heavy Monsoon Shower": "🌧️",
  Thunderstorm: "⛈️",
  "Fog / Mist": "🌫️",
  "Hot & Dry Wind (Loo)": "🌡️",
};

export const FarmerHome: React.FC<FarmerHomeProps> = ({ onNavigate, onBookTractor }) => {
  const { t, language } = useLanguage();
  const { activeRole } = useRole();
  const auth = useOptionalAuth();
  const user = auth?.user;
  const weather = useWeatherViewModel();
  const { profile: farmProfile } = useFarm();
  const advice = useMemo(() => deriveFarmAdvice(farmProfile, weather.data), [farmProfile, weather.data]);

  // Load authoritative farmer profile from Supabase profiles table
  const [profileData, setProfileData] = useState<{
    fullName: string | null;
    village: string | null;
    district: string | null;
    state: string | null;
    farmName: string | null;
    primaryCrop: string | null;
    farmSize: number | null;
    landUnit: string | null;
    soilType: string | null;
  }>({
    fullName: null,
    village: null,
    district: null,
    state: null,
    farmName: null,
    primaryCrop: null,
    farmSize: null,
    landUnit: null,
    soilType: null,
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        let ext: Record<string, any> = {};
        try {
          ext = data.extended_profile ? JSON.parse(data.extended_profile) : {};
        } catch { /* ignore JSON parse */ }

        setProfileData({
          fullName: data.full_name || null,
          village: data.village || ext.villageOrTehsil || null,
          district: data.district || ext.district || null,
          state: data.state || ext.state || null,
          farmName: ext.farmName || null,
          primaryCrop: data.primary_crop || ext.primaryCrop || (Array.isArray(ext.crops) ? ext.crops[0] : null),
          farmSize: data.farm_size !== null ? Number(data.farm_size) : (ext.totalArea ? Number(ext.totalArea) : null),
          landUnit: ext.landUnit || 'Acres',
          soilType: data.soil_type || ext.soilType || null,
        });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?.id]);

  // Resolve user display name
  const rawEmailName = user?.email?.split('@')[0] || '';
  const cleanedEmailName = rawEmailName.split(/[^a-zA-Z]/)[0];
  const capitalizedName = cleanedEmailName ? cleanedEmailName.charAt(0).toUpperCase() + cleanedEmailName.slice(1) : '';
  const userName = profileData.fullName
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || capitalizedName
    || (t('home.guestName') || 'Kisan Mitra');

  const village = profileData.village || user?.user_metadata?.village || '';
  const district = profileData.district || user?.user_metadata?.district || '';
  const state = profileData.state || user?.user_metadata?.state || '';

  const wl = weather.data;
  const liveCity = wl?.location?.name || village || district || (t('home.guestVillage') || 'India');
  const condEmoji = (cond?: string) => COND_EMOJI[cond || ""] || "🌤️";
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const { location: locState } = useLocation();

  // Live Mandi prices from Data.gov.in / APMC Agmarknet
  const [mandiPrices, setMandiPrices] = useState<MandiPrice[]>([]);
  const [mandiError, setMandiError] = useState<string | null>(null);
  const [mandiLoading, setMandiLoading] = useState(true);

  const loadMandi = useCallback(async () => {
    setMandiLoading(true);
    try {
      const result = await fetchMandiPrices();
      setMandiPrices(result.prices);
      setMandiError(result.isError ? (result.errorMessage ?? t("mandi.hub.failed")) : null);
    } catch {
      setMandiPrices([]);
      setMandiError(t("mandi.hub.failed"));
    } finally {
      setMandiLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadMandi();
    const interval = setInterval(loadMandi, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadMandi]);

  // Highlight farmer's primary crop first in the mandi snapshot
  const activeCropName = profileData.primaryCrop || farmProfile?.crop || '';
  const prioritizedMandiPrices = useMemo(() => {
    if (!mandiPrices.length) return [];
    if (!activeCropName) return mandiPrices.slice(0, 4);

    const normTarget = activeCropName.toLowerCase();
    const matched = mandiPrices.filter((p) => p.crop.toLowerCase().includes(normTarget));
    const others = mandiPrices.filter((p) => !p.crop.toLowerCase().includes(normTarget));
    return [...matched, ...others].slice(0, 4);
  }, [mandiPrices, activeCropName]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? (t("home.greetingMorning") || "Good Morning") : hour < 17 ? (t("home.greetingAfternoon") || "Good Afternoon") : (t("home.greetingEvening") || "Good Evening");
  const dateStr = now.toLocaleDateString(localeFor(language), { weekday: "long", day: "numeric", month: "long" });

  const cropT = (name: string) => {
    const key = `crop.name.${name.toLowerCase()}`;
    const translated = t(key);
    return translated && translated !== key ? translated : name;
  };

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(15); } catch { /* unsupported */ }
    }
  };

  const go = (tab: string) => {
    triggerHaptic();
    if (tab === "weather") {
      setWeatherOpen(true);
      return;
    }
    onNavigate(tab);
  };

  const firstName = userName.split(" ")[0] || userName;

  const renderRoleDashboard = () => {
    switch (activeRole) {
      case 'Cattle Owner':
        return <div className="animate-fade-in px-4"><CattleAssetForm /></div>;
      case 'Transport Owner':
      case 'Tractor Owner':
        return <div className="animate-fade-in px-4"><TransportAssetForm /></div>;
      case 'Store Owner':
        return <div className="animate-fade-in px-4"><StoreInventoryForm /></div>;
      case 'Soil Tester':
        return <div className="animate-fade-in px-4"><SoilTestLabForm /></div>;
      default:
        return null;
    }
  };

  const hasFarmConfig = Boolean(
    profileData.farmName ||
    profileData.primaryCrop ||
    (profileData.farmSize && profileData.farmSize > 0)
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-emerald-50/50 via-background to-background text-foreground pb-36 overflow-x-hidden">
      {/* ── Top Floating Glass Header ───────────────────────────────── */}
      <header className="sticky top-3 z-40 mx-3 sm:mx-4 flex items-center justify-between rounded-2xl glass-dock border border-white/80 dark:border-white/10 shadow-lg px-4 py-3 transition-all duration-300">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-sm bg-emerald-600/10">
            <Logo size={36} />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
          </span>
          <div className="leading-none">
            <p className="font-display font-black text-lg tracking-tight text-emerald-950 dark:text-emerald-100">AgriConnect</p>
            <p className="text-[11px] font-bold text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {liveCity} · {dateStr.split(",")[0]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <NotificationBell onNavigate={go} />
          <button
            onClick={() => go("profile")}
            className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-display font-black text-sm shadow-md shadow-emerald-600/30 active:scale-95 transition-transform"
            aria-label="Open Profile"
          >
            {firstName.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <main className="px-3.5 sm:px-4 pt-3 space-y-4 max-w-4xl mx-auto">
        
        {/* ── 1. Farmer Greeting Card ─────────────────────────────────── */}
        <section className="rounded-3xl border border-emerald-500/20 bg-card p-5 shadow-sm space-y-2 relative overflow-hidden" aria-label="Farmer Greeting">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-2xl" />
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                <span>🌾</span>
                <span>{greeting}, {firstName}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Everything a farmer needs in one place.
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1.5">
            <MapPin size={13} className="text-emerald-600 shrink-0" />
            <span>{village ? `${village}, ` : ''}{district ? `${district}, ` : ''}{state || 'India'}</span>
            <span className="text-muted-foreground/40">•</span>
            <span>{dateStr}</span>
          </p>
        </section>

        {/* ── 2. Farm / Crop Context Card ─────────────────────────────── */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3" aria-label="Farm Context">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                🌱
              </span>
              <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wide">
                My Farm Context
              </h2>
            </div>
            <button
              onClick={() => go("profile")}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>{hasFarmConfig ? 'Edit Details' : 'Set Up Farm'}</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {hasFarmConfig ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/15">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Farm Name</span>
                <span className="text-sm font-black text-foreground truncate block mt-0.5">
                  {profileData.farmName || `${firstName}'s Farm`}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/15">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Main Crop</span>
                <span className="text-sm font-black text-emerald-800 dark:text-emerald-300 truncate block mt-0.5">
                  {profileData.primaryCrop ? cropT(profileData.primaryCrop) : (farmProfile?.crop || 'Wheat')}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/15">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Land Area</span>
                <span className="text-sm font-black text-foreground truncate block mt-0.5">
                  {profileData.farmSize ? `${profileData.farmSize} ${profileData.landUnit || 'Acres'}` : `${farmProfile?.farmArea || 5} Acres`}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/15">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Soil Type</span>
                <span className="text-sm font-black text-foreground truncate block mt-0.5">
                  {profileData.soilType || farmProfile?.soilType || 'Alluvial Soil'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
                  🚜
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">Personalize your farm details</p>
                  <p className="text-xs text-muted-foreground">Add your crop, land area and village for custom AI advice &amp; mandi alerts.</p>
                </div>
              </div>
              <button
                onClick={() => go("profile")}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 px-3.5 shadow-sm shrink-0 transition-colors"
              >
                Set Up Farm (1 min) →
              </button>
            </div>
          )}
        </section>

        {/* ── 3. Hyperlocal Weather Snapshot ──────────────────────────── */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3" aria-label="Weather Snapshot">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 font-bold text-sm">
                🌤️
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wide">
                  Hyperlocal Weather
                </h2>
                <p className="text-[11px] text-muted-foreground">{liveCity} (Open-Meteo Verified)</p>
              </div>
            </div>
            <button
              onClick={() => setWeatherOpen(true)}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>7-Day Radar &amp; Rain</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {wl ? (
            <div
              onClick={() => setWeatherOpen(true)}
              className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-emerald-500/5 to-teal-500/10 border border-sky-500/20 cursor-pointer hover:border-sky-500/40 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl select-none" aria-hidden="true">
                    {condEmoji(wl.live.condition)}
                  </span>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-foreground font-display">
                        {weather.formatTemp(wl.live.temp)}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Feels like {weather.formatTemp(wl.live.feelsLike)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-foreground mt-0.5">{wl.live.condition}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-right text-xs font-bold">
                  <span className="inline-flex items-center gap-1 justify-end text-sky-700 dark:text-sky-300">
                    <Droplets size={12} /> {wl.live.humidity}% Humidity
                  </span>
                  <span className="inline-flex items-center gap-1 justify-end text-emerald-700 dark:text-emerald-300">
                    <Wind size={12} /> {interpolate(t("hero.wind") || '{speed} km/h', { speed: wl.live.windSpeed })}
                  </span>
                  {wl.daily?.[0] && (
                    <span className="inline-flex items-center gap-1 justify-end text-indigo-700 dark:text-indigo-300">
                      <span>🌧️</span> {wl.daily[0].rainProbability}% Rain Chance
                    </span>
                  )}
                </div>
              </div>

              {/* 5-Hour Forecast Pills */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
                {(wl.hourly ?? []).slice(0, 5).map((h) => (
                  <div key={`${h.time}-${h.timestamp}`} className="flex-1 min-w-[62px] text-center p-2 rounded-xl bg-card border border-border/80 text-xs">
                    <span className="text-[10px] font-bold text-muted-foreground block">{h.time}</span>
                    <span className="text-base block my-0.5" aria-hidden="true">{condEmoji(h.condition)}</span>
                    <span className="font-extrabold text-foreground block">{weather.formatTemp(h.temp)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : weather.loading ? (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-center gap-2 py-8">
              <RefreshCw size={18} className="animate-spin text-emerald-600" />
              <span className="text-xs font-bold text-muted-foreground">Fetching live Open-Meteo weather data...</span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">Weather unavailable for current coordinates</p>
                <p className="text-[11px] text-muted-foreground">Tap retry or set custom district location.</p>
              </div>
              <button
                onClick={() => weather.refreshLocation()}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Retry
              </button>
            </div>
          )}
        </section>

        {/* ── 4. Live Mandi / Market Snapshot ─────────────────────────── */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3" aria-label="Mandi Snapshot">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                💰
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wide">
                  Live Mandi Bhav
                </h2>
                <p className="text-[11px] text-muted-foreground">Data.gov.in &amp; APMC Agmarknet Verified</p>
              </div>
            </div>
            <button
              onClick={() => go("mandi")}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>Explore All Mandis</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {prioritizedMandiPrices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {prioritizedMandiPrices.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go("mandi")}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-muted/20 hover:bg-muted/50 hover:border-emerald-500/30 transition-all text-left"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                      <span>{cropT(item.crop)}</span>
                      {activeCropName && item.crop.toLowerCase().includes(activeCropName.toLowerCase()) && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase">
                          My Crop
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.market}, {item.district}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground flex items-center justify-end">
                      <IndianRupee size={12} />{item.price.toLocaleString("en-IN")}
                      <span className="text-[10px] text-muted-foreground font-normal ml-0.5">/q</span>
                    </p>
                    <p className={cn("text-[11px] font-black flex items-center justify-end gap-0.5 mt-0.5", item.status === "up" ? "text-emerald-600" : "text-rose-600")}>
                      {item.status === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {item.change}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : mandiLoading ? (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-center gap-2 py-6">
              <RefreshCw size={16} className="animate-spin text-emerald-600" />
              <span className="text-xs font-bold text-muted-foreground">Loading APMC Mandi rates...</span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Rates sync daily from Agmarknet APMC servers.</span>
              <button onClick={() => go("mandi")} className="text-xs font-bold text-emerald-600 hover:underline">
                View Mandi Rates →
              </button>
            </div>
          )}
        </section>

        {/* ── 5 & 6. Primary Action CTAs (AI Assistant & Crop Health) ──── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" aria-label="Primary Actions">
          {/* Kisan AI CTA */}
          <button
            onClick={() => go("ai-chat")}
            className="group relative flex items-start gap-4 p-5 rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white shadow-lg hover:shadow-xl transition-all text-left transform active:scale-[0.99] overflow-hidden border border-emerald-500/30"
          >
            <div className="pointer-events-none absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-emerald-400/20 blur-xl" />
            <div className="h-12 w-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform shadow-inner">
              <Bot size={24} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Voice &amp; Chat AI
                </span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white">
                Ask Kisan AI Assistant
              </h3>
              <p className="text-xs text-emerald-100/80 leading-snug">
                24/7 Krishi Salah in Hindi, English &amp; 10+ regional languages.
              </p>
            </div>
            <ChevronRight size={18} className="text-white/60 group-hover:translate-x-1 group-hover:text-white transition-all shrink-0 mt-1" />
          </button>

          {/* Crop Doctor CTA */}
          <button
            onClick={() => go("crop-doctor")}
            className="group relative flex items-start gap-4 p-5 rounded-3xl bg-gradient-to-br from-teal-800 via-emerald-900 to-slate-900 text-white shadow-lg hover:shadow-xl transition-all text-left transform active:scale-[0.99] overflow-hidden border border-teal-500/30"
          >
            <div className="pointer-events-none absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-teal-400/20 blur-xl" />
            <div className="h-12 w-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform shadow-inner">
              <Scan size={24} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-400/20 text-teal-200 px-2 py-0.5 rounded-full border border-teal-400/30">
                  Instant Diagnosis
                </span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white">
                Crop Doctor — Disease Scan
              </h3>
              <p className="text-xs text-teal-100/80 leading-snug">
                Upload or capture leaf photo for pest identification &amp; remedy.
              </p>
            </div>
            <ChevronRight size={18} className="text-white/60 group-hover:translate-x-1 group-hover:text-white transition-all shrink-0 mt-1" />
          </button>
        </section>

        {/* ── 7. Important Services Grid ──────────────────────────────── */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3.5" aria-label="Important Services">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                📦
              </span>
              <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wide">
                Important Services
              </h2>
            </div>
            <button
              onClick={() => go("services")}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>View All Services</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRIMARY_SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className="group flex flex-col items-start gap-2.5 p-4 rounded-2xl border border-border bg-background hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 hover:border-emerald-500/40 transition-all text-left shadow-xs hover:shadow-sm"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <s.icon size={20} />
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                    {s.badge}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-black text-foreground block leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {t(s.labelKey)}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground block mt-0.5 line-clamp-1">
                    {t(s.subKey)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── 8. Recent Activity, Today Tasks & Advisories ─────────────── */}
        <section className="space-y-4" aria-label="Recent Activity and Tasks">
          {/* Today's Tasks Component */}
          <TodayTasks triggerHaptic={triggerHaptic} />

          {/* AI Farm Insight & Advisory */}
          <AiInsightCard
            wl={wl}
            loading={weather.loading}
            cropLabel={advice.cropLabel}
            items={advice.items}
            onGo={go}
          />
        </section>

        {renderRoleDashboard()}

        {/* Weather Intelligence Dashboard Modal */}
        {wl && (
          <WeatherDashboardModal
            isOpen={weatherOpen}
            onClose={() => setWeatherOpen(false)}
            data={wl}
            formatTemp={weather.formatTemp}
            onRefresh={weather.refreshLocation}
            refreshing={weather.refreshing}
            isFahrenheit={weather.isFahrenheit}
            onToggleUnit={weather.toggleTemperatureUnit}
          />
        )}

        {/* Set / Change Location Sheet */}
        <Sheet open={locationSheetOpen} onOpenChange={setLocationSheetOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-3xl">
            <SheetHeader className="pb-2 text-left">
              <SheetTitle>{t('home.changeLocation') || 'Set Your Location'}</SheetTitle>
            </SheetHeader>
            <LocationSelector
              onLocationSelected={() => {
                setLocationSheetOpen(false);
                setTimeout(() => weather.refreshLocation(), 250);
              }}
            />
          </SheetContent>
        </Sheet>

      </main>
    </div>
  );
};

export default FarmerHome;
