import React, { useCallback, useEffect, useMemo, useState, Component, type ReactNode } from "react";
import {
  TrendingUp, Scan, ShoppingBag, Tractor, Truck, Newspaper, ChevronRight,
  IndianRupee, Landmark, MapPin,
  ArrowRight, Coins, FlaskConical, Warehouse, Sprout, CloudSun, MessageCircleHeart,
} from "lucide-react";
import AiInsightCard from "./AiInsightCard";
import FarmStatusCard from "./FarmStatusCard";
import MandiPreview from "./MandiPreview";
import KisanSaathiCard from "./KisanSaathiCard";
import QuickActionsGrid from "./QuickActionsGrid";
import TodayTasks from "./TodayTasks";
import { FirstDayBoard } from "./FirstDayBoard";
import { FarmHero } from "./FarmHero";
import { CoreFeatures } from "./CoreFeatures";
import { FarmSnapshot } from "./FarmSnapshot";
import { TodayNeeds, type FarmNeed } from "./TodayNeeds";
import { WeatherHero } from "./WeatherHero";
import { NotificationBell } from "@/features/notifications/presentation/components/NotificationBell";
import { AdvisorBriefCard } from "@/features/ai-advisor/presentation/components/AdvisorBriefCard";
import { INITIAL_TRACTORS } from "@/lib/mock-data";
import { AgriImage } from "@/components/ui/agri-image";
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
        <p className="text-[13px] font-semibold text-foreground">
          {this.props.label} section wasn&apos;t available
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-marigold/40 bg-white/60 px-4 py-1.5 text-[12.5px] font-bold text-amber-800"
        >
          <ChevronRight size={13} className="rotate-180" aria-hidden="true" />
          Retry section
        </button>
      </div>
    );
  }
}

const QUICK_ACTIONS = [
  { id: "crop-doctor", icon: Scan, labelKey: "svc.cropDoctor" },
  { id: "mandi", icon: TrendingUp, labelKey: "nav.mandi" },
  { id: "tractors", icon: Tractor, labelKey: "svc.tractors" },
  { id: "store", icon: ShoppingBag, labelKey: "svc.store" },
  { id: "weather", icon: Sprout, labelKey: "svc.weather" },
  { id: "farm-os", icon: Sprout, labelKey: "home.farmTitle" },
] as const;

const SECONDARY_SERVICES = [
  { id: "schemes", icon: Landmark, labelKey: "svc.schemes" },
  { id: "transport", icon: Truck, labelKey: "svc.transport" },
  { id: "loans", icon: Coins, labelKey: "svc.loans" },
  { id: "news", icon: Newspaper, labelKey: "svc.news" },
  { id: "soil", icon: FlaskConical, labelKey: "svc.soil" },
  { id: "cold-storage", icon: Warehouse, labelKey: "svc.coldStorage" },
] as const;

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
    <div className="mb-2 flex items-center justify-between gap-2 mt-7">
      <h2 id={id} className="type-h2">{title}</h2>
      {action && (
        <button
          onClick={() => go(action.tab)}
          className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary"
        >
          {action.label}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );

  return (
    <div className="pb-36">
      {/* App header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <div className="leading-tight">
              <p className="text-[15px] font-bold tracking-tight text-foreground">{t('agr207')}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={10} aria-hidden="true" />
                {liveCity} · {dateStr.split(",")[0]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wl && (
              <button
                onClick={() => setWeatherOpen(true)}
                className="hidden min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[13px] font-bold text-foreground sm:flex"
                aria-label={t("home.openWeather")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-live-pulse" aria-hidden="true" />
                {weather.formatTemp(wl.live.temp)} · {wl.live.condition}
              </button>
            )}
            <NotificationBell onNavigate={go} />
            <button
              onClick={() => go("profile")}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold text-primary ring-1 ring-primary/15"
              aria-label={t("home.openProfile")}
            >
              {firstName.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
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
                <span className="block text-[13px] font-bold text-foreground leading-snug">
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
              data={{
                crop: advice.cropLabel,
                stage: advice.cropLabel,
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

        {/* Everything a Farmer Needs — the seven core features, rich cards */}
        <div className="reveal stagger-1">
          <SectionErrorBoundary label="Core features">
            <CoreFeatures onGo={go} />
          </SectionErrorBoundary>
        </div>
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

        {/* What matters today — the story strip bridging hero → product */}
        <TodayNeeds
          needs={[
            {
              id: "weather",
              labelKey: "svc.weather",
              icon: CloudSun,
              href: () => setWeatherOpen(true),
              accent: "bg-sky-100 text-sky-800",
              value: wl?.live ? `${weather.formatTemp(wl.live.temp)} · ${wl.live.condition}` : undefined,
              sub: wl?.live ? undefined : undefined,
            },
            {
              id: "mandi",
              labelKey: "nav.mandi",
              icon: TrendingUp,
              href: () => go("mandi"),
              accent: "bg-marigold/20 text-amber-800",
              value: Array.isArray(mandiPrices) && mandiPrices[0]
                ? `₹${mandiPrices[0].price}`
                : undefined,
              sub: Array.isArray(mandiPrices) && mandiPrices[0]
                ? mandiPrices[0].crop
                : undefined,
            },
            {
              id: "crop",
              labelKey: "home.farmTitle",
              icon: Sprout,
              href: () => go("farm-os"),
              accent: "bg-emerald-100 text-emerald-800",
              value: advice?.cropLabel ?? undefined,
              sub: undefined,
            },
            {
              id: "saathi",
              labelKey: "home.kisanSaathi",
              icon: MessageCircleHeart,
              href: () => go("ai-chat"),
              accent: "bg-rose-100 text-rose-800",
              value: undefined,
              sub: undefined,
            },
          ]}
        />

        {/* Today's mandi — warm full-width band */}
        <div className="reveal stagger-2 mt-7">
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

        <div className="mt-7 lg:grid lg:grid-cols-3 lg:items-start lg:gap-7">
          <div className="flex flex-col gap-7 lg:order-1 lg:col-span-2">
            {/* My crop */}
            <div className="reveal">
              <FarmStatusCard
                crop={farmProfile.crop}
                stage={farmProfile.stage}
                area={farmProfile.farmArea}
                landUnit={landUnit}
                soilType={farmProfile.soilType}
                attention={wl?.advisoryAlert?.isCritical}
                onOpen={() => go("farm-os")}
              />
            </div>

            {/* Today's farm advice */}
            <div className="reveal stagger-1">
              <AiInsightCard
                wl={wl}
                loading={weather.loading}
                cropLabel={advice.cropLabel}
                items={advice.items}
                onGo={go}
              />
            </div>
          </div>

          <div className="order-first flex flex-col gap-7 lg:order-2">
            {/* Quick actions — काम की चीज़ें */}
            <div className="reveal">
              <SectionErrorBoundary label="Quick actions">
                <QuickActionsGrid actions={[...QUICK_ACTIONS]} onGo={go} />
              </SectionErrorBoundary>
            </div>

            <div className="reveal stagger-1">
              <SectionErrorBoundary label="Advisor">
                <AdvisorBriefCard onNavigate={go} />
              </SectionErrorBoundary>
            </div>

            {/* Kisan Saathi */}
            <div className="reveal stagger-2">
              <SectionErrorBoundary label="Kisan Saathi">
                <KisanSaathiCard onOpen={() => go("ai-chat")} />
              </SectionErrorBoundary>
            </div>
          </div>
        </div>

        {/* Farm help nearby — marketplace band */}
        <section className="mt-9" aria-labelledby="tractors-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="section-eyebrow">{t("mkt.title")}</p>
              <h2 id="tractors-heading" className="type-h2 mt-1.5">{t("home.nearbyTractors")}</h2>
              <p className="mt-1 type-small text-muted-foreground max-w-md">{t("mkt.sub")}</p>
            </div>
            <button
              onClick={() => go("marketplace")}
              className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-primary"
            >
              {t("mkt.browse")}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {INITIAL_TRACTORS.slice(0, 4).map((tractor) => (
              <button
                key={tractor.id}
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
                  <p className="text-[13px] font-bold text-foreground">{tractor.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={10} aria-hidden="true" /> {tractor.distance} · {tractor.owner}
                  </p>
                  <p className="mt-1.5 text-[14px] font-semibold text-foreground flex items-center gap-0.5">
                    <IndianRupee size={12} aria-hidden="true" />{tractor.ratePerHour}
                    <span className="text-xs font-normal text-muted-foreground">{t("home.perHr")}</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <div className="mt-9 grid gap-7 lg:grid-cols-2">
          {/* Crop health CTA */}
          <section aria-labelledby="health-heading">
            <p className="section-eyebrow">{t("home.cropHealth")}</p>
            <button
              onClick={() => go("crop-doctor")}
              className="mt-2.5 flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-feature-doctor/12 text-feature-doctor">
                <Scan size={20} aria-hidden="true" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-bold text-foreground leading-snug">{t("home.rustRisk")}</span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">{t("home.cropHealthSub")}</span>
              </span>
              <span className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[12px] font-bold text-primary-foreground">
                {t("home.scan")}
              </span>
            </button>
          </section>

          {/* Government alerts */}
          <section aria-labelledby="govt-heading">
            <p className="section-eyebrow">{t("home.govtAlert")}</p>
            <p className="type-small text-muted-foreground mt-1.5">{t("home.govtSub")}</p>
            <div className="mt-2.5 divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
              {[
                { title: t("home.govt1.title"), meta: t("home.govt1.meta"), tab: "schemes" },
                { title: t("home.govt2.title"), meta: t("home.govt2.meta"), tab: "schemes" },
              ].map((item) => (
                <button key={item.title} onClick={() => go(item.tab)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors">
                  <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-marigold animate-live-pulse" aria-hidden="true" />
                  <span className="flex-1">
                    <span className="block text-[13px] font-semibold text-foreground leading-snug">{item.title}</span>
                    <span className="block text-[12px] text-muted-foreground mt-0.5">{item.meta}</span>
                  </span>
                  <ChevronRight size={15} className="mt-0.5 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <TodayTasks triggerHaptic={triggerHaptic} farmCrop={advice.cropLabel.split(" · ")[0] ?? undefined} />

        <div className="mt-8 grid gap-7 lg:grid-cols-2">
          {/* News */}
          <section aria-labelledby="news-heading">
            {sectionHeader("news-heading", t("home.latestNews"), { label: t("home.more"), tab: "news" })}
            <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
              {NEWS.map((n) => (
                <button key={n.titleKey} onClick={() => go("news")} className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors">
                  <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">{t(n.titleKey)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t(n.sourceKey)} · {t(n.timeKey)}</p>
                </button>
              ))}
            </div>
          </section>

          {/* More services */}
          <section aria-labelledby="more-heading">
            {sectionHeader("more-heading", t("home.moreServices"), { label: t("home.viewAll"), tab: "services" })}
            <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
              {SECONDARY_SERVICES.map((s) => (
                <button key={s.id} onClick={() => go(s.id)} className="flex min-h-[46px] w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <s.icon size={15} aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-[13px] font-medium text-foreground">{t(s.labelKey)}</span>
                  <ChevronRight size={15} className="text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </div>

        {renderRoleDashboard()}
      </main>

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