import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp, Scan, ShoppingBag, Tractor, Truck, Newspaper, ChevronRight,
  CalendarDays, Droplets, Wind, IndianRupee, CloudSun,
  TrendingDown, Leaf, Landmark, AlertTriangle, MapPin,
  Star, ArrowRight, Flame, Sprout,
  Coins, FlaskConical, Warehouse, Users, Bot,
} from "lucide-react";
import DynamicHero from "./DynamicHero";
import AiInsightCard from "./AiInsightCard";
import TodayTasks from "./TodayTasks";
import { FirstDayBoard } from "./FirstDayBoard";
import { NotificationBell } from "@/features/notifications/presentation/components/NotificationBell";
import { AdvisorBriefCard } from "@/features/ai-advisor/presentation/components/AdvisorBriefCard";
import { INITIAL_TRACTORS } from "@/lib/mock-data";
import { MACHINE_IMG, DEFAULT_MACHINE_IMG } from "@/lib/machine-images";
import { useLanguage } from "@/contexts/LanguageContext";
import { interpolate, localeFor } from "@/i18n/journey";
import { useRole } from "@/contexts/RoleContext";
import { CattleAssetForm, TransportAssetForm, StoreInventoryForm, SoilTestLabForm } from "./AssetForms";
import { useAuth, useOptionalAuth } from "@/hooks/useAuth";
import { useWeatherViewModel } from "@/features/weather/presentation/viewmodels/useWeatherViewModel";
import { useFarm } from "@/contexts/FarmContext";
import { deriveFarmAdvice } from "@/lib/farm-advisor";
import { fetchMandiPrices, type MandiPrice } from "@/lib/mandi-api";
import { WeatherDashboardModal } from "@/features/weather/presentation/views/WeatherDashboardModal";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/ui/Logo";

interface FarmerHomeProps {
  onNavigate: (tab: string) => void;
  onBookTractor: (tractor: (typeof INITIAL_TRACTORS)[number]) => void;
}

const ALERTS = [
  { icon: AlertTriangle, tone: "text-amber-600 dark:text-amber-400 bg-amber-500/12", textKey: "home.alert1", tab: "crop-doctor" },
  { icon: AlertTriangle, tone: "text-red-600 dark:text-red-400 bg-red-500/12", textKey: "home.alert2", tab: "crop-doctor" },
];

// Six primary features — the only colorful cards on the home screen.
// `token` maps each requested brand color to an existing design token:
//   --feature-ai (purple), --feature-mandi (emerald), --feature-weather (sky),
//   --feature-tractor (orange), --feature-schemes (indigo), --feature-loans (amber).
const PRIMARY_SERVICES = [
  { id: "crop-doctor", icon: Scan, labelKey: "svc.cropDoctor", subKey: "svc.cropDoctorSub", token: "--feature-doctor" },
  { id: "ai-chat", icon: Bot, labelKey: "svc.aiChat", subKey: "svc.aiChatSub", token: "--feature-ai" },
  { id: "weather", icon: CloudSun, labelKey: "svc.weather", subKey: "svc.weatherSub", token: "--feature-weather" },
  { id: "mandi", icon: TrendingUp, labelKey: "svc.mandi", subKey: "svc.mandiSub", token: "--feature-mandi" },
  { id: "tractors", icon: Tractor, labelKey: "svc.tractors", subKey: "svc.tractorsSub", token: "--feature-tractor" },
  { id: "store", icon: ShoppingBag, labelKey: "svc.store", subKey: "svc.storeSub", token: "--feature-store" },
] as const;

const SECONDARY_SERVICES = [
  { id: "schemes", icon: Landmark, labelKey: "svc.schemes" },
  { id: "transport", icon: Truck, labelKey: "svc.transport" },
  { id: "loans", icon: Coins, labelKey: "svc.loans" },
  { id: "news", icon: Newspaper, labelKey: "svc.news" },
  { id: "soil", icon: FlaskConical, labelKey: "svc.soil" },
  { id: "cold-storage", icon: Warehouse, labelKey: "svc.coldStorage" },
  { id: "community", icon: Users, labelKey: "svc.community" },
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

const NEWS = [
  { titleKey: "home.news1.title", sourceKey: "home.news1.source", timeKey: "home.news1.time", tagKey: "home.news1.tag" },
  { titleKey: "home.news2.title", sourceKey: "home.news2.source", timeKey: "home.news2.time", tagKey: "home.news2.tag" },
  { titleKey: "home.news3.title", sourceKey: "home.news3.source", timeKey: "home.news3.time", tagKey: "home.news3.tag" },
];

const FarmerHome: React.FC<FarmerHomeProps> = ({ onNavigate, onBookTractor }) => {
  const { t, language } = useLanguage();
  const { activeRole } = useRole();
  const auth = useOptionalAuth();
  const user = auth?.user;
  const weather = useWeatherViewModel();
  const { profile: farmProfile } = useFarm();
  const advice = useMemo(() => deriveFarmAdvice(farmProfile, weather.data), [farmProfile, weather.data]);

  // Fetch real profile from the profiles table for display name
  const [profileFullName, setProfileFullName] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.full_name) setProfileFullName(data.full_name);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  // FIX 4: Smart display name — never show raw usernames like "satyamff124"
  const rawEmailName = user?.email?.split('@')[0] || '';
  const cleanedEmailName = rawEmailName.split(/[^a-zA-Z]/)[0]; // first alphabetic word only
  const capitalizedName = cleanedEmailName ? cleanedEmailName.charAt(0).toUpperCase() + cleanedEmailName.slice(1) : '';
  const userName = profileFullName
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || capitalizedName
    || (t('home.guestName'));
  const village = user?.user_metadata?.village || (t('home.guestVillage'));
  const wl = weather.data;
  const liveCity = wl?.location?.name || village;
  const condEmoji = (cond?: string) => COND_EMOJI[cond || ""] || "🌤️";
  const [weatherOpen, setWeatherOpen] = useState(false);

  // Real mandi prices from data.gov.in (via mandi-api). Never fabricates prices:
  // empty state is shown when the live feed is unreachable.
  const [mandiPrices, setMandiPrices] = useState<MandiPrice[]>([]);
  const [mandiError, setMandiError] = useState<string | null>(null);
  const [mandiLoading, setMandiLoading] = useState(true);

  const loadMandi = useCallback(async () => {
    setMandiLoading(true);
    try {
      const result = await fetchMandiPrices();
      setMandiPrices(result.prices);
      setMandiError(result.isError ? (result.errorMessage ?? "Live mandi prices are temporarily unavailable.") : null);
    } catch {
      setMandiPrices([]);
      setMandiError("Live mandi prices are temporarily unavailable.");
    } finally {
      setMandiLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMandi();
    // FIX 9: Auto-retry mandi prices every 30 minutes
    const interval = setInterval(loadMandi, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadMandi]);

  const tickerItems = mandiPrices.slice(0, 10).map((p) => ({
    id: p.id,
    crop: p.crop,
    price: p.price.toLocaleString("en-IN"),
    chg: p.change,
    up: p.status === "up",
  }));
  const trendsItems = mandiPrices.slice(0, 3).map((p) => ({
    id: p.id,
    crop: p.crop,
    price: p.price.toLocaleString("en-IN"),
    chg: parseFloat(p.change.replace(/[%+]/g, "")) || 0,
    up: p.status === "up",
  }));
  const todayMandiItems = mandiPrices.slice(0, 4).map((p) => ({
    id: p.id,
    crop: p.crop,
    price: p.price.toLocaleString("en-IN"),
    chg: parseFloat(p.change.replace(/[%+]/g, "")) || 0,
    up: p.status === "up",
  }));

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t("home.greetingMorning") : hour < 17 ? t("home.greetingAfternoon") : t("home.greetingEvening");
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

  const firstName = userName.split(" ")[0];

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

  const sectionHeader = (id: string, title: string, action?: { label: string; tab: string }, emoji?: string) => (
    <div className="flex items-end justify-between mb-3 px-1">
      <h2 id={id} className="font-display font-semibold text-[20px] tracking-tight text-foreground">
        {emoji && <span className="mr-1.5" aria-hidden="true">{emoji}</span>}
        {title}
      </h2>
      {action && (
        <button
          onClick={() => go(action.tab)}
          className="group flex shrink-0 items-center gap-1 text-[13px] font-bold text-forest dark:text-emerald-400"
        >
          {action.label}
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen pb-36 overflow-x-hidden">
      {/* Ultra-Modern Floating Glass Header */}
      <header className="sticky top-3 z-40 mx-3 sm:mx-4 flex items-center justify-between rounded-2xl glass-dock border border-white/60 dark:border-white/10 shadow-xl px-4 py-3 transition-all duration-300" style={{ top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}>
        <div className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-sm bg-emerald-500/10">
            <Logo size={34} />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 border border-white dark:border-slate-900 animate-live-pulse" />
          </span>
          <div className="leading-none">
            <p className="font-display font-black text-[18px] tracking-tight text-foreground bg-gradient-to-r from-emerald-800 to-teal-700 dark:from-emerald-300 dark:to-teal-200 bg-clip-text text-transparent">{t('agr207')}</p>
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
            className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-display font-black text-sm shadow-md shadow-emerald-600/30 tap-bounce transition-transform"
            aria-label={t("home.openProfile")}
          >
            {firstName.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <section className="pt-4" aria-label={t("home.farmOverview")}>
        {/* ── Dynamic Hero (time-of-day + weather adaptive) ── */}
        <DynamicHero
          greeting={greeting}
          firstName={firstName}
          dateStr={dateStr}
          liveCity={liveCity}
          farmLabel={interpolate(t("home.farmLabel"), { name: firstName })}
          cropLine={advice.heroLine}
          wl={wl}
          weatherStatus={weather.loading ? 'loading' : weather.error ? 'error' : 'ready'}
          formatTemp={weather.formatTemp}
          condEmoji={condEmoji}
          onGo={go}
        />

        {/* ── First-day personalized board (after onboarding) ─── */}
        <FirstDayBoard onGo={go} />

        {/* ── FIX 5: Profile completion prompt ─── */}
        {user && typeof window !== 'undefined' && localStorage.getItem('agri_onboarding_seen') !== 'true' && (
          <section className="px-4 mt-4 animate-fade-in">
            <button
              onClick={() => go('profile')}
              className="w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 p-4 text-left shadow-card hover-lift"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Sprout size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground leading-snug">
                    🌱 {t('home.prompt.completeProfile') || 'Complete your profile to unlock AI recommendations personalised for your farm'}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    {t('home.prompt.completeNow') || 'Complete Now (2 min) →'}
                  </p>
                </div>
              </div>
            </button>
          </section>
        )}

        {/* ── Weather ──────────────────────────────────── */}
        <section className="px-4 mt-6 reveal" style={{ animationDelay: "240ms" }} aria-labelledby="weather-heading">
          {wl ? (
            <button onClick={() => setWeatherOpen(true)} className="relative w-full overflow-hidden rounded-[28px] gradient-weather text-white p-5 text-left shadow-colorful hover-lift">
              <span className="absolute top-4 right-7 text-3xl select-none animate-sun-pulse" aria-hidden="true">{condEmoji(wl.live.condition)}</span>
              <span className="absolute top-12 right-5 text-2xl select-none animate-cloud-slow" aria-hidden="true">☁️</span>
              <div className="relative flex items-center gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{interpolate(t("home.weatherAt"), { city: wl.location.name })}</p>
                  <p className="font-display text-[42px] font-bold leading-none mt-2 flex items-center">
                    {weather.formatTemp(wl.live.temp)}
                  </p>
                  <p className="text-[13px] font-semibold text-white/80 mt-1">
                    {interpolate(t("home.feelsLike"), { cond: wl.live.condition, temp: weather.formatTemp(wl.live.feelsLike) })}
                  </p>
                  <p className="text-[11px] text-white/60 mt-0.5">{wl.location.district}, {wl.location.state}</p>
                </div>
                <div className="flex-1" />
                <span className="flex flex-col gap-1.5">
                  <span className="feature-chip bg-white/15 text-white"><Droplets size={12} /> {wl.live.humidity}%</span>
                  <span className="feature-chip bg-white/15 text-white"><Wind size={12} /> {interpolate(t("hero.wind"), { speed: wl.live.windSpeed })}</span>
                  {wl.daily?.[0] && (
                    <span className="feature-chip bg-secondary text-secondary-foreground">
                      <span aria-hidden="true">🌧️</span> {interpolate(t("home.rain"), { pct: wl.daily[0].rainProbability })}
                    </span>
                  )}
                </span>
              </div>

                <div className="relative flex gap-2 mt-4 overflow-x-auto no-scrollbar">
                  {(wl.hourly ?? []).slice(0, 6).map((h) => (
                    <span key={`${h.time}-${h.timestamp}`} className="flex shrink-0 flex-col items-center gap-1 rounded-2xl bg-white/12 border border-white/15 px-3 py-2">
                      <span className="text-[10px] font-bold text-white/70">{h.time}</span>
                      <span className="text-base" aria-hidden="true">{condEmoji(h.condition)}</span>
                      <span className="text-[12px] font-bold">{weather.formatTemp(h.temp)}</span>
                    </span>
                  ))}
                </div>
              </button>
            ) : (
              /* FIX 3 + FIX 8: Replace empty skeleton with meaningful CTA */
              <button
                onClick={() => go('profile')}
                className="w-full rounded-[28px] border border-border bg-card p-6 text-center shadow-card hover-lift"
              >
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Sprout size={26} />
                </span>
                <h3 className="mt-3 text-[15px] font-bold text-foreground">{t('home.farmSummaryLoading') || 'Your farm summary is loading'}</h3>
                <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
                  {weather.error
                    ? (t('home.setLocationHint') || '🌤 Set your location for hyperlocal weather')
                    : (t('home.profilePersonalisedHint') || 'Complete your profile to get personalised insights for your crops')}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-4 py-2 text-[12px] font-bold shadow-colorful">
                  {t('home.setUpMyFarm') || 'Set Up My Farm'} <ArrowRight size={13} />
                </span>
              </button>
            )}
        </section>
        {/* ── AI Insight Card (heart of the home screen) ─── */}
        <AiInsightCard
          wl={wl}
          loading={weather.loading}
          cropLabel={advice.cropLabel}
          items={advice.items}
          onGo={go}
        />
        {/* ── Quick Actions (Primary Features) ───────────── */}
        <section className="px-4 mt-6" aria-labelledby="quick-heading">
          <div className="flex items-end justify-between mb-3 px-1">
            <h2 id="quick-heading" className="font-display font-semibold text-[20px] tracking-tight text-foreground">
              <span className="mr-1.5" aria-hidden="true">⚡</span> {t("home.quickActions")}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {PRIMARY_SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className="group relative flex flex-col items-start gap-3 rounded-[24px] border p-4 text-left tap-bounce transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                style={{
                  backgroundColor: `hsl(var(${s.token}) / 0.10)`,
                  borderColor: `hsl(var(${s.token}) / 0.28)`,
                  boxShadow: `0 14px 34px -14px hsl(var(${s.token}) / 0.35)`,
                }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{ 
                    backgroundColor: `hsl(var(${s.token}))`,
                    boxShadow: `0 8px 20px -4px hsl(var(${s.token}) / 0.5)` 
                  }}
                >
                  <s.icon size={22} />
                </span>
                <span className="flex-1">
                  <span className="block text-[14px] font-black leading-tight text-foreground">{t(s.labelKey)}</span>
                  <span className="block text-[11px] font-semibold text-muted-foreground mt-1">{t(s.subKey)}</span>
                </span>
                <span className="absolute top-4 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/60 dark:bg-black/20 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all">
                  <ChevronRight size={14} />
                </span>
              </button>
            ))}
          </div>
        </section>
        {/* ── Personalized AI Advisor brief ────────────── */}
        <AdvisorBriefCard onNavigate={go} />
        {/* ── Live Mandi Ticker ────────────────────────── */}
        <section className="mt-5 overflow-hidden" aria-label={t("home.liveMandi")}>
          {tickerItems.length > 0 ? (
            <div className="flex whitespace-nowrap animate-ticker gap-0">
              {tickerItems.map((item) => (
                <button
                  key={`${item.id}-a`}
                  onClick={() => go("mandi")}
                  className="mx-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-card hover-lift"
                >
                  <span className="text-xs font-bold text-foreground">{cropT(item.crop)}</span>
                  <span className="text-xs font-bold text-foreground flex items-center gap-0.5">
                    <IndianRupee size={11} />{item.price}
                  </span>
                  <span className={cn("text-[11px] font-black", item.up ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                    {item.up ? "▲" : "▼"} {item.chg}
                  </span>
                </button>
              ))}
              {tickerItems.map((item) => (
                <button
                  key={`${item.id}-b`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="mx-2 pointer-events-none inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2"
                >
                  <span className="text-xs font-bold text-foreground">{cropT(item.crop)}</span>
                  <span className="text-xs font-bold text-foreground flex items-center gap-0.5">
                    <IndianRupee size={11} />{item.price}
                  </span>
                  <span className={cn("text-[11px] font-black", item.up ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                    {item.up ? "▲" : "▼"} {item.chg}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            /* FIX 9: User-friendly mandi message instead of raw errors */
            <button
              onClick={() => { go("mandi"); if (mandiError) loadMandi(); }}
              className="mx-4 flex w-[calc(100%-2rem)] items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card"
            >
              <span className="text-[13px] font-semibold text-muted-foreground leading-snug">
                {mandiLoading
                  ? t("home.mandiLoading")
                  : 'Prices update daily · Tap to check latest rates'}
              </span>
              <span className="shrink-0 text-[12px] font-bold text-forest dark:text-emerald-400">{t("home.viewMore")} →</span>
            </button>
          )}
        </section>



        {/* ── Crop Health Alert ────────────────────────── */}
        <section className="px-4 mt-6 reveal" style={{ animationDelay: "240ms" }} aria-labelledby="health-heading">
          <button
            onClick={() => go("crop-doctor")}
            className="interactive-card flex items-center gap-4 rounded-2xl border border-feature-doctor/25 bg-feature-doctor/8 p-4 w-full text-left cursor-pointer"
          >
            <span className="relative h-14 w-14 shrink-0 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-colorful animate-ripple">
              <Scan size={22} />
            </span>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-feature-doctor">{t("home.cropHealth")}</p>
              <p className="text-[14px] font-bold text-foreground leading-snug mt-0.5">
                {t("home.rustRisk")}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{t("home.farmersFlagged")}</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-700 text-white px-3.5 py-2 text-[12px] font-bold shadow-colorful">
              {t("home.scan")}
            </span>
          </button>





        </section>

        {/* ── Trending Crops ───────────────────────────── */}
        {trendsItems.length > 0 && (
        <section className="mt-6 reveal" style={{ animationDelay: "360ms" }} aria-labelledby="trends-heading">
          <div className="px-4">
            {sectionHeader("trends-heading", t("home.trending"), { label: t("svc.mandi"), tab: "mandi" }, "🔥")}
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
            {trendsItems.map((c) => (
              <button key={c.id} onClick={() => go("mandi")} className="interactive-card w-[150px] shrink-0 rounded-2xl border border-border bg-card p-4 text-left shadow-card cursor-pointer">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-foreground">{cropT(c.crop)}</p>
                  <Flame size={13} className="text-feature-tractor" />
                </div>
                <p className="mt-1.5 text-[17px] font-black text-foreground flex items-center gap-0.5">
                  <IndianRupee size={12} />{c.price}
                </p>
                <p className={cn("text-[12px] font-bold mt-0.5 flex items-center gap-0.5", c.up ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                  {c.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{c.chg}%
                </p>
              </button>
            ))}
          </div>
        </section>
        )}

        {/* ── Nearby tractors (image rich) ────────────── */}
        <section className="mt-6 reveal" style={{ animationDelay: "480ms" }} aria-labelledby="tractors-heading">
          <div className="px-4">
            {sectionHeader("tractors-heading", t("home.nearbyTractors"), { label: t("home.all"), tab: "tractors" }, "🚜")}
            {/* FIX 7: Supply acquisition CTA instead of "sample listings" disclaimer */}
            <button
              onClick={() => go('tractors')}
              className="mb-3 px-1 text-[12px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {t('tractor.beFirstToList') || 'Be the first to list your tractor in your area →'}
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 pb-1">
            {INITIAL_TRACTORS.map((tractor) => (
              <button
                key={tractor.id}
                onClick={() => onBookTractor(tractor)}
                className="w-[250px] shrink-0 snap-center overflow-hidden rounded-2xl border border-border bg-card text-left shadow-card hover-lift"
              >
                <div className="relative h-[120px] w-full overflow-hidden bg-muted">
                  <img
                    src={MACHINE_IMG[tractor.name] || DEFAULT_MACHINE_IMG}
                    alt={tractor.name}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_MACHINE_IMG; }}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute top-2 left-2 feature-chip bg-black/45 text-white backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-live-pulse" /> {t("home.available")}
                  </span>
                  <span className="absolute top-2 right-2 feature-chip bg-card/90 text-foreground">
                    <Star size={11} className="text-amber-500 fill-amber-500" /> {tractor.rating}
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="text-[14px] font-bold text-foreground">{tractor.name}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin size={11} /> {tractor.distance} · {tractor.owner}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[15px] font-black text-foreground flex items-center gap-0.5">
                      <IndianRupee size={12} />{tractor.ratePerHour}<span className="text-[11px] font-bold text-muted-foreground">{t("home.perHr")}</span>
                    </span>
                    <span className="rounded-full gradient-tractor text-white px-3 py-1.5 text-[11px] font-bold shadow-colorful">{t("home.book")}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Govt alert timeline ──────────────────────── */}
        <section className="px-4 mt-6 reveal" style={{ animationDelay: "540ms" }} aria-labelledby="govt-heading">
          <div className="relative overflow-hidden rounded-[28px] gradient-govt text-white p-5 shadow-colorful">
            <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 blur-2xl animate-drift-soft" />
            <span className="absolute bottom-2 right-4 text-4xl opacity-20 select-none" aria-hidden="true">🏛️</span>
            <div className="relative flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 flex items-center gap-1.5">
                <Landmark size={13} /> {t("home.govtAlert")}
              </p>
            </div>
            <div className="relative mt-4 space-y-0">
              {[
                { title: t("home.govt1.title"), meta: t("home.govt1.meta"), tab: "schemes" },
                { title: t("home.govt2.title"), meta: t("home.govt2.meta"), tab: "schemes" },
              ].map((item) => (
                <button key={item.title} onClick={() => go(item.tab)} className="group relative flex w-full items-start gap-3 py-2.5 text-left">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-secondary animate-live-pulse" />
                  <span className="flex-1">
                    <span className="block text-[14px] font-semibold leading-snug group-hover:underline">{item.title}</span>
                    <span className="block text-[12px] text-white/65 mt-0.5">{item.meta}</span>
                  </span>
                  <ChevronRight size={16} className="mt-1 text-white/50 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Today's Tasks ────────────────────────────── */}
        <TodayTasks triggerHaptic={triggerHaptic} />

        {/* ── Mandi snapshot ───────────────────────────── */}
        <section className="px-4 mt-6 reveal" style={{ animationDelay: "660ms" }} aria-labelledby="mandi-heading">
          {sectionHeader("mandi-heading", t("home.todayMandi"), { label: t("home.viewMore"), tab: "mandi" }, "💰")}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            {todayMandiItems.length > 0 ? (
              <div className="divide-y divide-border">
                {todayMandiItems.map((item) => (
                  <button key={item.id} onClick={() => go("mandi")} className="group flex w-full items-center gap-3 py-2.5 text-left rounded-xl px-2 -mx-2 transition-all duration-200 hover:bg-muted/50 active:scale-[0.98]">
                    <span className={cn("h-8 w-8 shrink-0 rounded-xl flex items-center justify-center", item.up ? "bg-feature-mandi/12 text-feature-mandi" : "bg-feature-news/12 text-feature-news")}>
                      {item.up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    </span>
                    <span className="flex-1 text-[14px] font-bold text-foreground">{cropT(item.crop)}</span>
                    <span className="text-[14px] font-bold text-foreground flex items-center gap-0.5">
                      <IndianRupee size={12} />{item.price}
                    </span>
                    <span className={cn("flex items-center gap-0.5 text-[12px] font-black", item.up ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                      {item.chg}%
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              /* FIX 9: User-friendly mandi message */
              <button onClick={() => { go("mandi"); if (mandiError) loadMandi(); }} className="flex w-full items-center justify-between gap-3 py-2 text-left">
                <span className="text-[13px] font-semibold text-muted-foreground leading-snug">
                  {mandiLoading
                    ? t("home.mandiLoading")
                    : 'Government servers refresh daily · Tap to check'}
                </span>
                <span className="shrink-0 text-[12px] font-bold text-forest dark:text-emerald-400">{t("home.viewMore")} →</span>
              </button>
            )}
          </div>
        </section>

        {/* ── Pest & disease alerts ────────────────────── */}
        <section className="px-4 mt-6 reveal" style={{ animationDelay: "720ms" }} aria-labelledby="alerts-heading">
          {sectionHeader("alerts-heading", t("home.pestAlerts"), { label: t("home.scan"), tab: "crop-doctor" }, "🚨")}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="divide-y divide-border">
              {ALERTS.map((a) => (
                <button key={a.textKey} onClick={() => go(a.tab)} className="group flex w-full items-start gap-3 py-2.5 text-left rounded-xl px-2 -mx-2 transition-all duration-200 hover:bg-muted/50 active:scale-[0.98]">
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", a.tone)}>
                    <a.icon size={15} />
                  </span>
                  <span className="flex-1 text-[13px] font-medium text-foreground leading-snug group-hover:text-primary transition-colors">{t(a.textKey)}</span>
                  <ChevronRight size={15} className="mt-1 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Latest news ──────────────────────────────── */}
        <section className="mt-6 reveal" style={{ animationDelay: "780ms" }} aria-labelledby="news-heading">
          <div className="px-4">
            {sectionHeader("news-heading", t("home.latestNews"), { label: t("home.more"), tab: "news" }, "📰")}
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
            {NEWS.map((n) => (
              <button key={n.titleKey} onClick={() => go("news")} className="interactive-card w-[240px] shrink-0 rounded-2xl border border-border bg-card p-4 text-left shadow-card cursor-pointer">
                <span className="feature-chip bg-feature-news/12 text-feature-news">{t(n.tagKey)}</span>
                <p className="mt-2.5 text-[14px] font-bold text-foreground leading-snug line-clamp-3">{t(n.titleKey)}</p>
                <p className="mt-2 text-[11px] font-semibold text-muted-foreground">{t(n.sourceKey)} · {t(n.timeKey)}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── More Services (Secondary Features) ─────────── */}
        <section className="px-4 mt-6 reveal" style={{ animationDelay: "840ms" }} aria-labelledby="more-heading">
          <div className="flex items-end justify-between mb-3 px-1">
            <h2 id="more-heading" className="font-display font-semibold text-[20px] tracking-tight text-foreground">
              <span className="mr-1.5" aria-hidden="true">📦</span> {t("home.moreServices")}
            </h2>
            <button onClick={() => go("services")} className="group flex shrink-0 items-center gap-1 text-[13px] font-bold text-forest dark:text-emerald-400">
              {t("home.viewAll")}
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {SECONDARY_SERVICES.map((s) => (
              <button key={s.id} onClick={() => go(s.id)} className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 active:scale-95">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <s.icon size={20} />
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">{t(s.labelKey)}</span>
              </button>
            ))}
          </div>
        </section>

        {renderRoleDashboard()}

        {/* Full Weather Intelligence Dashboard */}
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
      </section>
    </div>
  );
};

export default FarmerHome;
