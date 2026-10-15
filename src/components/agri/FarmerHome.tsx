import React, { useCallback, useEffect, useMemo, useState, Component, type ReactNode } from "react";
import {
  TrendingUp, Scan, ShoppingBag, Tractor, Truck, Newspaper, ChevronRight,
  IndianRupee, Landmark, MapPin, Cpu, Radio, Calendar,
  ArrowRight, FlaskConical, Warehouse, Sprout, CloudSun, MessageCircleHeart, Menu,
} from "lucide-react";
import AiInsightCard from "./AiInsightCard";
import MandiPreview from "./MandiPreview";
import TodayTasks from "./TodayTasks";
import { FirstDayBoard } from "./FirstDayBoard";
import { FarmHero } from "./FarmHero";
import { CoreFeatures } from "./CoreFeatures";
import { FarmSnapshot } from "./FarmSnapshot";
import { WeatherHero } from "./WeatherHero";
import { NotificationBell } from "@/features/notifications/presentation/components/NotificationBell";
import { AdvisorBriefCard } from "@/features/ai-advisor/presentation/components/AdvisorBriefCard";
import { INITIAL_TRACTORS } from "@/lib/mock-data";
import { AgriImage } from "@/components/ui/agri-image";
import { SafeImage } from "@/components/ui/SafeImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { interpolate, localeFor } from "@/i18n/journey";
import { useRole } from "@/contexts/RoleContext";
import { CattleAssetForm, TransportAssetForm, StoreInventoryForm, SoilTestLabForm } from "./AssetForms";
import { useOptionalAuth } from "@/hooks/useAuth";
import { useWeatherViewModel } from "@/features/weather/presentation/viewmodels/useWeatherViewModel";
import { useFarm } from "@/contexts/FarmContext";
import { deriveFarmAdvice } from "@/lib/farm-advisor";
import { fetchMandiPrices, readCache, type MandiPrice } from "@/lib/mandi-api";
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
  onOpenMobileMenu?: () => void;
}

/**
 * SectionErrorBoundary — one failing widget must never blank the whole Home
 * tab. When a single section throws (e.g. transient weather/mandi/3D error),
 * this degrades just that section to a compact retry card instead of letting
 * the error bubble to the top-level chunk boundary ("This section couldn't
 * load … Retry").
 */
interface SectionErrorBoundaryProps {
  label: string;
  children: ReactNode;
}
interface SectionErrorBoundaryState {
  hasError: boolean;
}
class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn(`[SectionErrorBoundary] "${this.props.label}" recovered:`, error);
  }
  private reset = () => this.setState({ hasError: false });
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-marigold/25 bg-marigold/8 px-4 py-5 text-center">
        <Sprout className="h-6 w-6 text-amber-700" aria-hidden="true" strokeWidth={1.6} />
        <p className="text-sm font-semibold text-foreground">
          {this.props.label} section wasn&apos;t available
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-marigold/40 bg-white/60 px-4 py-1.5 text-xs font-bold text-amber-800"
        >
          <ChevronRight size={13} className="rotate-180" aria-hidden="true" />
          Retry section
        </button>
      </div>
    );
  }
}

const QUICK_ACTIONS = [
  { id: "bookings", icon: Calendar, labelKey: "profile.bookings.title" },
  { id: "crop-doctor", icon: Scan, labelKey: "svc.cropDoctor" },
  { id: "mandi", icon: TrendingUp, labelKey: "nav.mandi" },
  { id: "hardware-dashboard", icon: Cpu, labelKey: "IoT Sensors" },
  { id: "tractors", icon: Tractor, labelKey: "svc.tractors" },
  { id: "store", icon: ShoppingBag, labelKey: "svc.store" },
  { id: "weather", icon: Sprout, labelKey: "svc.weather" },
  { id: "farm-os", icon: Sprout, labelKey: "home.farmTitle" },
] as const;

const SECONDARY_SERVICES = [
  { id: "schemes", icon: Landmark, labelKey: "svc.schemes" },
  { id: "transport", icon: Truck, labelKey: "svc.transport" },
  { id: "news", icon: Newspaper, labelKey: "svc.news" },
  { id: "soil", icon: FlaskConical, labelKey: "svc.soil" },
  { id: "cold-storage", icon: Warehouse, labelKey: "svc.coldStorage" },
] as const;

const NEWS = [
  { titleKey: "home.news1.title", sourceKey: "home.news1.source", timeKey: "home.news1.time", tagKey: "home.news1.tag" },
  { titleKey: "home.news2.title", sourceKey: "home.news2.source", timeKey: "home.news2.time", tagKey: "home.news2.tag" },
  { titleKey: "home.news3.title", sourceKey: "home.news3.source", timeKey: "home.news3.time", tagKey: "home.news3.tag" },
];

const FarmerHome: React.FC<FarmerHomeProps> = ({ onNavigate, onBookTractor, onOpenMobileMenu }) => {
  const { t, language } = useLanguage();
  const { activeRole } = useRole();
  const auth = useOptionalAuth();
  const user = auth?.user;
  const weather = useWeatherViewModel();
  const { profile: farmProfile } = useFarm();
  const advice = useMemo(() => deriveFarmAdvice(farmProfile, weather.data), [farmProfile, weather.data]);

  const [profileFullName, setProfileFullName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    const handleAvatarUpdate = (e: any) => {
      if (e.detail?.avatarUrl) setProfileAvatarUrl(e.detail.avatarUrl);
    };
    window.addEventListener('agri_avatar_updated', handleAvatarUpdate);

    const cachedAvatar = localStorage.getItem('agri_profile_avatar');
    if (cachedAvatar) setProfileAvatarUrl(cachedAvatar);

    if (!user?.id) return () => window.removeEventListener('agri_avatar_updated', handleAvatarUpdate);
    let cancelled = false;
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) {
          if (data.full_name) setProfileFullName(data.full_name);
          if (data.avatar_url) {
            setProfileAvatarUrl(data.avatar_url);
            localStorage.setItem('agri_profile_avatar', data.avatar_url);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      window.removeEventListener('agri_avatar_updated', handleAvatarUpdate);
    };
  }, [user?.id]);

  const rawEmailName = user?.email?.split('@')[0] || '';
  const cleanedEmailName = rawEmailName.split(/[^a-zA-Z]/)[0];
  const capitalizedName = cleanedEmailName ? cleanedEmailName.charAt(0).toUpperCase() + cleanedEmailName.slice(1) : '';
  const userName = profileFullName
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || capitalizedName
    || (t('home.guestName'));
  const village = user?.user_metadata?.village || (t('home.guestVillage'));
  const wl = weather.data;
  const liveCity = wl?.location?.name || village;
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const { location: locState } = useLocation();

  const initialMandiCache = readCache();
  const [mandiPrices, setMandiPrices] = useState<MandiPrice[]>(() => initialMandiCache?.prices && initialMandiCache.prices.length > 0 ? initialMandiCache.prices : []);
  const [mandiError, setMandiError] = useState<string | null>(null);
  const [mandiLoading, setMandiLoading] = useState<boolean>(() => !initialMandiCache?.prices || initialMandiCache.prices.length === 0);

  const loadMandi = useCallback(async () => {
    // Keep visible cards alive while silently updating in background
    setMandiLoading((prev) => (mandiPrices.length === 0 ? true : prev));
    try {
      const result = await fetchMandiPrices();
      if (result.prices && result.prices.length > 0) {
        setMandiPrices(result.prices);
        setMandiError(null);
      } else if (result.isError) {
        setMandiError(result.errorMessage ?? t("mandi.hub.failed"));
      }
    } catch {
      if (mandiPrices.length === 0) {
        setMandiError(t("mandi.hub.failed"));
      }
    } finally {
      setMandiLoading(false);
    }
  }, [t, mandiPrices.length]);

  useEffect(() => {
    loadMandi();
    const interval = setInterval(loadMandi, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadMandi]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t("home.greetingMorning") : hour < 17 ? t("home.greetingAfternoon") : t("home.greetingEvening");
  const dateStr = now.toLocaleDateString(localeFor(language), { weekday: "long", day: "numeric", month: "long" });

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

  const landUnit = t("home.areaUnit") || "acres";
  const farmTag = interpolate(t("home.heroFarmTag") || "{area} {unit} · {soil}", {
    area: String(farmProfile?.farmArea ?? 5.2),
    unit: landUnit,
    soil: farmProfile?.soilType || t("home.guestVillage") || "Black Soil",
  });

  const renderRoleDashboard = () => {
    switch (activeRole) {
      case 'Cattle Owner':
        return <div className=""><CattleAssetForm /></div>;
      case 'Transport Owner':
      case 'Tractor Owner':
        return <div className=""><TransportAssetForm /></div>;
      case 'Store Owner':
        return <div className=""><StoreInventoryForm /></div>;
      case 'Soil Tester':
        return <div className=""><SoilTestLabForm /></div>;
      default:
        return null;
    }
  };

  const sectionHeader = (id: string, title: string, action?: { label: string; tab: string }) => (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 id={id} className="type-h2">{title}</h2>
      {action && (
        <button
          onClick={() => go(action.tab)}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
        >
          {action.label}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full bg-[#F7F5ED] dark:bg-background pb-4 sm:pb-6">
      {/* App header */}
      <header className="sticky top-0 z-40 border-b border-[#0F5132]/12 bg-white/85 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {onOpenMobileMenu && (
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#0F5132]/20 bg-white/90 text-[#0F5132] shadow-xs hover:bg-[#0F5132]/5 lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu size={20} />
              </button>
            )}
            <Logo size={32} alt="" />
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight text-[#0F5132]">{t('agr207')}</p>
              <p className="flex items-center gap-1 text-xs font-semibold text-emerald-900">
                <MapPin size={11} className="text-[#00C26E]" aria-hidden="true" />
                {liveCity} · {dateStr.split(",")[0]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {wl && (
              <button
                onClick={() => setWeatherOpen(true)}
                className="hidden min-h-[38px] items-center gap-2 rounded-xl border border-[#0F5132]/15 bg-white/90 px-3 text-sm font-bold text-[#0F5132] shadow-xs hover:border-[#0F5132]/30 sm:flex"
                aria-label={t("home.openWeather")}
              >
                <span className="h-2 w-2 rounded-full bg-[#00C26E] animate-live-pulse" aria-hidden="true" />
                {weather.formatTemp(wl.live.temp)} · {wl.live.condition}
              </button>
            )}
            <NotificationBell onNavigate={go} />
            <button
              onClick={() => go("profile")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#0F5132]/20 bg-[#0F5132] text-sm font-black text-white shadow-sm ring-2 ring-[#00C26E]/30 transition-transform hover:scale-105 overflow-hidden"
              aria-label={t("home.openProfile")}
            >
              {profileAvatarUrl ? (
                <SafeImage
                  src={profileAvatarUrl}
                  alt={userName}
                  className="h-full w-full object-cover"
                  resolveType="farmer"
                  fallbackIcon={<span className="text-sm font-black text-white">{firstName.charAt(0).toUpperCase()}</span>}
                />
              ) : (
                firstName.charAt(0).toUpperCase()
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-7">

        <FirstDayBoard onGo={go} />

        {user && typeof window !== 'undefined' && localStorage.getItem('agri_onboarding_seen') !== 'true' && localStorage.getItem('agri_profile_complete') !== 'true' && !farmProfile?.crop && (
          <section className="mt-5">
            <button
              onClick={() => go('profile')}
              className="flex w-full items-center gap-3 rounded-2xl border border-marigold/30 bg-marigold/8 p-3.5 text-left shadow-soft"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marigold/20 text-amber-700">
                <Sprout size={18} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-foreground leading-snug">
                  {t('home.prompt.completeProfile') || 'Complete your profile to get recommendations for your farm'}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t('home.prompt.completeNow') || 'Takes about 2 minutes'}
                </span>
              </span>
              <ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" />
            </button>
          </section>
        )}

        {/* Welcome hero — field green band with greeting, farm chip and CTA */}
        <div className="reveal">
          <SectionErrorBoundary label="Hero">
            <FarmHero
              dateStr={dateStr}
              greeting={greeting}
              firstName={firstName}
              cropLabel={advice.cropLabel}
              farmTag={farmTag}
              adviceLine={advice.heroLine}
              onAsk={() => go("ai-chat")}
              onOpenFarm={() => go("farm-os")}
              weatherChip={
                wl?.live && weather.formatTemp
                  ? { temp: weather.formatTemp(wl.live.temp), condition: wl.live.condition }
                  : undefined
              }
              mandiChip={
                Array.isArray(mandiPrices) && mandiPrices[0]
                  ? { crop: mandiPrices[0].crop, price: String(mandiPrices[0].price) }
                  : undefined
              }
            />
          </SectionErrorBoundary>
        </div>

        {/* Quick Farm Snapshot — four live morning numbers */}
        <div className="reveal stagger-1">
          <SectionErrorBoundary label="Farm snapshot">
            <FarmSnapshot
              onGo={go}
              data={{
                crop: advice.cropLabel.split(" · ")[0] ?? advice.cropLabel,
                stage: advice.cropLabel.includes(" · ") ? advice.cropLabel.split(" · ")[1] : (farmProfile?.soilType || undefined),
                area: farmProfile?.farmArea,
                unit: landUnit,
                soil: farmProfile?.soilType,
                temp: wl?.live && weather.formatTemp ? weather.formatTemp(wl.live.temp) : undefined,
                condition: wl?.live?.condition,
                humidity: wl?.live?.humidity,
                mandiCrop: Array.isArray(mandiPrices) && mandiPrices[0] ? mandiPrices[0].crop : undefined,
                mandiPrice: Array.isArray(mandiPrices) && mandiPrices[0] ? String(mandiPrices[0].price) : undefined,
                mandiStatus: Array.isArray(mandiPrices) && mandiPrices[0] ? mandiPrices[0].status : undefined,
                mandiChange: Array.isArray(mandiPrices) && mandiPrices[0] ? mandiPrices[0].change : undefined,
              }}
            />
          </SectionErrorBoundary>
        </div>

        {/* Core Features — seven primary agricultural capabilities */}
        <div className="reveal stagger-1">
          <SectionErrorBoundary label="Core features">
            <CoreFeatures onGo={go} />
          </SectionErrorBoundary>
        </div>

        {/* Compact Weather Section */}
        <div className="reveal stagger-1">
          <SectionErrorBoundary label="Weather">
            <WeatherHero
              wl={wl}
              loading={weather.loading}
              formatTemp={weather.formatTemp}
              refreshing={weather.refreshing}
              onRefresh={weather.refreshLocation}
              onOpenDetails={() => setWeatherOpen(true)}
              onOpenLocation={() => setLocationSheetOpen(true)}
              loadingCityText={locState?.city && locState.city !== 'Current Location' ? locState.city : undefined}
              interpretation={advice.heroLine}
            />
          </SectionErrorBoundary>
        </div>

        {/* Today's Mandi — APMC rates with direct database fallback */}
        <div className="reveal stagger-2">
          <SectionErrorBoundary label="Mandi">
            <MandiPreview
              items={mandiPrices}
              loading={mandiLoading}
              error={mandiError}
              onOpen={() => go("mandi")}
              onRetry={loadMandi}
            />
          </SectionErrorBoundary>
        </div>

        {/* Advisory, Intelligence & Services Workspace */}
        <div className="grid gap-7 lg:grid-cols-3 lg:items-start">
          {/* ── Left-Side Content (Primary Feed, Machinery, News, Field Tasks & Advisory) ── */}
          <div className="min-w-0 lg:col-span-2 space-y-6">

            {/* Farm Machinery Nearby */}
            <section className="reveal" aria-labelledby="tractors-heading">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="section-eyebrow">{t("mkt.title")}</p>
                  <h2 id="tractors-heading" className="type-h2 mt-1.5">{t("home.nearbyTractors")}</h2>
                  <p className="mt-1 type-small text-muted-foreground max-w-md">{t("mkt.sub")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => go("marketplace")}
                  className="flex shrink-0 items-center gap-1 text-sm font-bold text-primary"
                >
                  {t("mkt.browse")}
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {INITIAL_TRACTORS.slice(0, 4).map((tractor) => (
                  <button
                    key={tractor.id}
                    type="button"
                    onClick={() => onBookTractor(tractor)}
                    className="group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.99]"
                  >
                    <div className="relative h-28 w-full bg-muted">
                      <AgriImage
                        type="tractor"
                        contextName={tractor.name}
                        seedKey={tractor.id || tractor.name}
                        alt={tractor.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{tractor.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin size={10} className="shrink-0" aria-hidden="true" /> {tractor.distance} · {tractor.owner}
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-foreground flex items-center gap-0.5">
                        <IndianRupee size={12} aria-hidden="true" />{tractor.ratePerHour}
                        <span className="text-xs font-normal text-muted-foreground">{t("home.perHr")}</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Krishi News */}
            <section aria-labelledby="news-heading" className="reveal">
              {sectionHeader("news-heading", t("home.latestNews"), { label: t("home.more"), tab: "news" })}
              <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
                {NEWS.map((n) => (
                  <button key={n.titleKey} onClick={() => go("news")} className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors">
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{t(n.titleKey)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t(n.sourceKey)} · {t(n.timeKey)}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Field Tasks Checklist & Scheduled Activities — Personalized to Farmer Crop */}
            <div className="reveal">
              <SectionErrorBoundary label="Tasks">
                <TodayTasks
                  triggerHaptic={triggerHaptic}
                  farmCrop={advice.cropLabel.split(" · ")[0] ?? undefined}
                  onNavigate={go}
                />
              </SectionErrorBoundary>
            </div>

            {/* Today's Focus & Advisory — AI Agronomist recommendations */}
            <div className="reveal">
              <SectionErrorBoundary label="Farm Advisory">
                <AiInsightCard
                  wl={wl}
                  loading={weather.loading}
                  cropLabel={advice.cropLabel}
                  items={advice.items}
                  onGo={go}
                />
              </SectionErrorBoundary>
            </div>

            {/* Role Dashboard & Asset Registration Forms */}
            {renderRoleDashboard()}
          </div>

          {/* ── Right-Side Panel (Natural Sticky on Desktop, balanced height) ── */}
          <div className="min-w-0 flex flex-col gap-6 lg:sticky lg:top-20">
            {/* Advisor Brief */}
            <div className="reveal">
              <SectionErrorBoundary label="Advisor">
                <AdvisorBriefCard onNavigate={go} />
              </SectionErrorBoundary>
            </div>

            {/* Government schemes & subsidies alerts */}
            <section role="region" aria-labelledby="govt-heading" className="reveal">
              <p id="govt-heading" className="section-eyebrow">{t("home.govtAlert")}</p>
              <p className="type-small text-muted-foreground mt-1.5">{t("home.govtSub")}</p>
              <div className="mt-2.5 divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
                {[
                  { title: t("home.govt1.title"), meta: t("home.govt1.meta"), tab: "schemes" },
                  { title: t("home.govt2.title"), meta: t("home.govt2.meta"), tab: "schemes" },
                ].map((item) => (
                  <button key={item.title} type="button" onClick={() => go(item.tab)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors">
                    <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-emerald-600 animate-live-pulse" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-foreground leading-snug">{item.title}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{item.meta}</span>
                    </span>
                    <ChevronRight size={15} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>

            {/* More services */}
            <section aria-labelledby="more-heading" className="reveal">
              {sectionHeader("more-heading", t("home.moreServices"), { label: t("home.viewAll"), tab: "services" })}
              <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
                {SECONDARY_SERVICES.map((s) => (
                  <button key={s.id} onClick={() => go(s.id)} className="flex min-h-[46px] w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <s.icon size={15} aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground truncate">{t(s.labelKey)}</span>
                    <ChevronRight size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

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

      <Sheet open={locationSheetOpen} onOpenChange={setLocationSheetOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
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
    </div>
  );
};

export default FarmerHome;