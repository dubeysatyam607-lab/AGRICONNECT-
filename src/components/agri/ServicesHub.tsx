import React, { useState } from "react";
import {
  ArrowLeft, Scan, CalendarDays, Sprout, Droplets, Tractor, Combine, RefreshCcw, Shovel,
  TrendingUp, ShoppingBag, Truck, Warehouse, Coins, ShieldCheck, Landmark, Calculator,
  GraduationCap, Users, BellRing, Newspaper, ChevronRight, Sparkles, BookOpen,
  Bot, Navigation, Milk, HardHat, Search, X, Inbox, Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface ServicesHubProps {
  onNavigate: (tab: string) => void;
}

interface ServiceItem {
  id: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  labelKey: string;
  subKey: string;
  tint: string;
}

interface Group {
  emoji: string;
  titleKey: string;
  items: ServiceItem[];
}

const GROUP_DATA: Group[] = [
  {
    emoji: "✨",
    titleKey: "svc.hub.group.aiCropCare",
    items: [
      { id: "farm-os", icon: Sparkles, labelKey: "svc.hub.aiCropCare.farmOs.label", subKey: "svc.hub.aiCropCare.farmOs.sub", tint: "bg-feature-ai/12 text-feature-ai" },
      { id: "ai-chat", icon: Bot, labelKey: "svc.hub.aiCropCare.aiChat.label", subKey: "svc.hub.aiCropCare.aiChat.sub", tint: "bg-feature-ai/12 text-feature-ai" },
      { id: "crop-doctor", icon: Scan, labelKey: "svc.hub.aiCropCare.cropDoctor.label", subKey: "svc.hub.aiCropCare.cropDoctor.sub", tint: "bg-feature-doctor/12 text-feature-doctor" },
      { id: "crop-calendar", icon: CalendarDays, labelKey: "svc.hub.aiCropCare.cropCalendar.label", subKey: "svc.hub.aiCropCare.cropCalendar.sub", tint: "bg-feature-mandi/12 text-feature-mandi" },
      { id: "soil", icon: Sprout, labelKey: "svc.hub.aiCropCare.soil.label", subKey: "svc.hub.aiCropCare.soil.sub", tint: "bg-feature-soil/12 text-feature-soil" },
      { id: "hardware-dashboard", icon: Droplets, labelKey: "svc.hub.aiCropCare.hardwareDashboard.label", subKey: "svc.hub.aiCropCare.hardwareDashboard.sub", tint: "bg-feature-cattle/12 text-feature-cattle" },
    ],
  },
  {
    emoji: "🚜",
    titleKey: "svc.hub.group.machinery",
    items: [
      { id: "tractors", icon: Tractor, labelKey: "svc.hub.machinery.tractors.label", subKey: "svc.hub.machinery.tractors.sub", tint: "bg-feature-labor/12 text-feature-labor" },
      { id: "harvester", icon: Combine, labelKey: "svc.hub.machinery.harvester.label", subKey: "svc.hub.machinery.harvester.sub", tint: "bg-feature-mandi/12 text-feature-mandi" },
      { id: "rotavator", icon: RefreshCcw, labelKey: "svc.hub.machinery.rotavator.label", subKey: "svc.hub.machinery.rotavator.sub", tint: "bg-feature-soil/12 text-feature-soil" },
      { id: "seeder", icon: Shovel, labelKey: "svc.hub.machinery.seeder.label", subKey: "svc.hub.machinery.seeder.sub", tint: "bg-feature-cattle/12 text-feature-cattle" },
    ],
  },
  {
    emoji: "🛒",
    titleKey: "svc.hub.group.marketplace",
    items: [
      { id: "mandi", icon: TrendingUp, labelKey: "svc.hub.marketplace.mandi.label", subKey: "svc.hub.marketplace.mandi.sub", tint: "bg-feature-mandi/12 text-feature-mandi" },
      { id: "mandi-finder", icon: Navigation, labelKey: "svc.hub.marketplace.mandiFinder.label", subKey: "svc.hub.marketplace.mandiFinder.sub", tint: "bg-feature-transport/12 text-feature-transport" },
      { id: "store", icon: ShoppingBag, labelKey: "svc.hub.marketplace.store.label", subKey: "svc.hub.marketplace.store.sub", tint: "bg-feature-store/12 text-feature-store" },
      { id: "cattle", icon: Milk, labelKey: "svc.hub.marketplace.cattle.label", subKey: "svc.hub.marketplace.cattle.sub", tint: "bg-feature-cattle/12 text-feature-cattle" },
      { id: "price-alerts", icon: BellRing, labelKey: "svc.hub.marketplace.priceAlerts.label", subKey: "svc.hub.marketplace.priceAlerts.sub", tint: "bg-feature-loans/12 text-feature-loans" },
    ],
  },
  {
    emoji: "💰",
    titleKey: "svc.hub.group.financeInsurance",
    items: [
      { id: "loans", icon: Coins, labelKey: "svc.hub.financeInsurance.loans.label", subKey: "svc.hub.financeInsurance.loans.sub", tint: "bg-feature-loans/12 text-feature-loans" },
      { id: "insurance", icon: ShieldCheck, labelKey: "svc.hub.financeInsurance.insurance.label", subKey: "svc.hub.financeInsurance.insurance.sub", tint: "bg-feature-news/12 text-feature-news" },
      { id: "profit-calculator", icon: Calculator, labelKey: "svc.hub.financeInsurance.profitCalculator.label", subKey: "svc.hub.financeInsurance.profitCalculator.sub", tint: "bg-feature-ai/12 text-feature-ai" },
      { id: "analytics", icon: BookOpen, labelKey: "svc.hub.financeInsurance.analytics.label", subKey: "svc.hub.financeInsurance.analytics.sub", tint: "bg-feature-analytics/12 text-feature-analytics" },
    ],
  },
  {
    emoji: "🏛️",
    titleKey: "svc.hub.group.government",
    items: [
      { id: "schemes", icon: Landmark, labelKey: "svc.hub.government.schemes.label", subKey: "svc.hub.government.schemes.sub", tint: "bg-feature-schemes/12 text-feature-schemes" },
      { id: "news", icon: Newspaper, labelKey: "svc.news", subKey: "svc.hub.learningCommunity.news.sub", tint: "bg-feature-news/12 text-feature-news" },
    ],
  },
  {
    emoji: "🚚",
    titleKey: "svc.hub.group.transportStorage",
    items: [
      { id: "transport", icon: Truck, labelKey: "svc.hub.transportStorage.transport.label", subKey: "svc.hub.transportStorage.transport.sub", tint: "bg-feature-transport/12 text-feature-transport" },
      { id: "cold-storage", icon: Warehouse, labelKey: "svc.hub.transportStorage.coldStorage.label", subKey: "svc.hub.transportStorage.coldStorage.sub", tint: "bg-feature-labor/12 text-feature-labor" },
    ],
  },
  {
    emoji: "👷",
    titleKey: "svc.hub.group.labour",
    items: [
      { id: "labor", icon: HardHat, labelKey: "svc.hub.labour.labor.label", subKey: "svc.hub.labour.labor.sub", tint: "bg-feature-labor/12 text-feature-labor" },
    ],
  },
];

const ServicesHub: React.FC<ServicesHubProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState("");
  const { t } = useLanguage();

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(15); } catch { /* unsupported */ }
    }
  };

  const go = (tab: string) => {
    triggerHaptic();
    const MACHINERY_MAP: Record<string, string> = {
      harvester: "tractors",
      rotavator: "tractors",
      seeder: "tractors",
    };
    onNavigate(MACHINERY_MAP[tab] ?? tab);
  };

  const groups = GROUP_DATA.map((g) => ({
    ...g,
    title: t(g.titleKey),
    items: g.items.map((i) => ({
      ...i,
      label: t(i.labelKey),
      sub: t(i.subKey),
    })),
  }));

  const q = query.trim().toLowerCase();
  const filteredGroups = q
    ? groups
        .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
        .filter((g) => g.items.length > 0)
    : groups;

  const totalServices = GROUP_DATA.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="relative min-h-screen pb-36">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center gap-3">
        <button
          onClick={() => go("home")}
          className="p-2 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t("svc.hub.backToHome")}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-[19px] text-foreground tracking-tight leading-none">
            {t("svc.hub.title")}
          </h1>
          <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 truncate">
            {t("svc.hub.subtitle", { n: totalServices })}
          </p>
        </div>
      </header>

      <section className="pt-4" aria-label={t("svc.hub.available")}>
        {/* Search */}
        <section className="px-4" aria-label={t("svc.hub.search")}>
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("svc.hub.searchPlaceholder")}
              className="w-full rounded-2xl border border-border bg-card pl-10 pr-9 py-3 text-base font-medium text-foreground placeholder:text-muted-foreground/70 outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:shadow-card"
              aria-label={t("svc.hub.search")}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t("svc.hub.clearSearch")}
              >
                <X size={14} />
              </button>
            )}
          </label>
        </section>

        {filteredGroups.length === 0 ? (
          <section className="px-4 mt-6">
            <div className="rounded-[24px] border border-border bg-card shadow-card">
              <div className="flex flex-col items-center justify-center text-center py-10">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 text-2xl" aria-hidden="true">
                  <Inbox size={22} className="text-muted-foreground" />
                </span>
                <p className="mt-3 text-[15px] font-bold text-foreground">{t("svc.hub.noResults")}</p>
                <p className="mt-1 max-w-[260px] text-[12px] font-medium text-muted-foreground">
                  {t("svc.hub.noResultsHint", { q: query })}
                </p>
                <button
                  onClick={() => setQuery("")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest text-primary-foreground px-4 py-2 text-[12px] font-bold shadow-card active:scale-95 transition-transform"
                >
                  {t("svc.hub.clearSearch")}
                </button>
              </div>
            </div>
          </section>
        ) : (
          filteredGroups.map((group, gi) => (
            <section
              key={group.titleKey}
              className="px-4 mt-6 reveal"
              style={{ animationDelay: `${gi * 50}ms` }}
              aria-labelledby={`group-${gi}`}
            >
              <h2
                id={`group-${gi}`}
                className="text-[13px] font-bold text-muted-foreground uppercase tracking-[0.14em] mb-3 px-1"
              >
                <span className="mr-1.5" aria-hidden="true">{group.emoji}</span>
                {group.title}
              </h2>
              <div className={cn("grid gap-2.5", group.items.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                {group.items.map((item) => (
                  <button
                    key={`${item.id}-${item.labelKey}`}
                    onClick={() => go(item.id)}
                    className="group relative flex flex-col items-start gap-2.5 rounded-[20px] border border-border bg-card p-3.5 text-left shadow-card hover-lift active:scale-[0.97] transition-transform"
                  >
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", item.tint)}>
                      <item.icon size={19} />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-[13px] font-bold text-foreground leading-tight">{item.label}</span>
                      <span className="block text-[11px] font-semibold text-muted-foreground mt-0.5 leading-snug">{item.sub}</span>
                    </span>
                    <ChevronRight
                      size={15}
                      className="absolute top-3.5 right-3 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                    />
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </section>
    </div>
  );
};

export default ServicesHub;
