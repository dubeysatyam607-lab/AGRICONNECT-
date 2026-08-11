import React, { useState } from "react";
import {
  ArrowLeft, Scan, CalendarDays, Sprout, Droplets, Tractor, Combine, RefreshCcw, Shovel,
  TrendingUp, ShoppingBag, Truck, Warehouse, Coins, ShieldCheck, Landmark, Calculator,
  GraduationCap, Users, BellRing, Newspaper, ChevronRight, Sparkles, BookOpen,
  Bot, Navigation, Milk, HardHat, Search, X, Inbox, Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const STRINGS: Record<string, [string, string]> = {
  title: ["Services", "सेवाएँ"],
  subtitle: ["{n}+ tools · everything for your farm", "{n}+ उपकरण · आपके खेत के लिए सब कुछ"],
  searchPlaceholder: ["Search services… e.g. mandi, soil, tractor", "सेवाएँ खोजें… जैसे मंडी, मिट्टी, ट्रैक्टर"],
  noResults: ["No services found", "कोई सेवा नहीं मिली"],
  noResultsHint: ["Nothing matches “{q}”. Try a different word like mandi, soil or tractor.", "“{q}” से कुछ मेल नहीं खाता। मंडी, मिट्टी या ट्रैक्टर जैसा दूसरा शब्द आज़माएँ।"],
  clearSearch: ["Clear search", "खोज साफ़ करें"],
};

const GROUPS_TITLE_HI: Record<string, string> = {
  "AI & Crop Care": "AI और फसल देखभाल",
  "Market & Mandi": "बाज़ार और मंडी",
  "Farm Logistics": "कृषि परिवहन",
  "Finance & Subsidy": "वित्त और सब्सिडी",
  "Learning & Community": "सीखना और समुदाय",
  "Farm Hardware": "कृषि हार्डवेयर",
  "Cattle & Livestock": "पशुधन",
};

interface ServicesHubProps {
  onNavigate: (tab: string) => void;
}

interface ServiceItem {
  id: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  sub: string;
  tint: string;
}

interface Group {
  emoji: string;
  title: string;
  items: ServiceItem[];
}

const GROUPS: Group[] = [
  {
    emoji: "✨",
    title: "AI & Crop Care",
    items: [
      { id: "farm-os", icon: Sparkles, label: "Farm OS", sub: "Digital farm twin & AI plan", tint: "bg-feature-ai/12 text-feature-ai" },
      { id: "ai-chat", icon: Bot, label: "Kisan AI Assistant", sub: "Ask anything about your farm", tint: "bg-feature-ai/12 text-feature-ai" },
      { id: "crop-doctor", icon: Scan, label: "Disease Detection", sub: "Scan a leaf, get a cure", tint: "bg-feature-doctor/12 text-feature-doctor" },
      { id: "crop-calendar", icon: CalendarDays, label: "Crop Calendar", sub: "Sowing to harvest guide", tint: "bg-feature-mandi/12 text-feature-mandi" },
      { id: "soil", icon: Sprout, label: "Soil Health", sub: "Test & fertilizer plan", tint: "bg-feature-soil/12 text-feature-soil" },
      { id: "hardware-dashboard", icon: Droplets, label: "Irrigation Planner", sub: "Water schedule by weather", tint: "bg-feature-cattle/12 text-feature-cattle" },
    ],
  },
  {
    emoji: "🚜",
    title: "Machinery",
    items: [
      { id: "tractors", icon: Tractor, label: "Tractor", sub: "Hire by hour or acre", tint: "bg-feature-labor/12 text-feature-labor" },
      { id: "tractors", icon: Combine, label: "Harvester", sub: "For wheat & paddy", tint: "bg-feature-mandi/12 text-feature-mandi" },
      { id: "tractors", icon: RefreshCcw, label: "Rotavator", sub: "Tillage & mulching", tint: "bg-feature-soil/12 text-feature-soil" },
      { id: "tractors", icon: Shovel, label: "Seeder", sub: "Seed sowing work", tint: "bg-feature-cattle/12 text-feature-cattle" },
    ],
  },
  {
    emoji: "🛒",
    title: "Marketplace",
    items: [
      { id: "mandi", icon: TrendingUp, label: "Mandi Prices", sub: "Live rates, 100+ crops", tint: "bg-feature-mandi/12 text-feature-mandi" },
      { id: "mandi-finder", icon: Navigation, label: "Mandi Finder", sub: "Nearest APMC mandi", tint: "bg-feature-transport/12 text-feature-transport" },
      { id: "store", icon: ShoppingBag, label: "Agri Store", sub: "Seeds, inputs & tools", tint: "bg-feature-store/12 text-feature-store" },
      { id: "cattle", icon: Milk, label: "Cattle Market", sub: "Buy & sell cows, buffaloes", tint: "bg-feature-cattle/12 text-feature-cattle" },
      { id: "price-alerts", icon: BellRing, label: "Price Alerts", sub: "SMS when rates rise", tint: "bg-feature-loans/12 text-feature-loans" },
    ],
  },
  {
    emoji: "💰",
    title: "Finance & Insurance",
    items: [
      { id: "loans", icon: Coins, label: "Loan Calculator", sub: "KCC & crop loan EMI", tint: "bg-feature-loans/12 text-feature-loans" },
      { id: "insurance", icon: ShieldCheck, label: "Crop Insurance", sub: "PM Fasal Bima Yojana", tint: "bg-feature-news/12 text-feature-news" },
      { id: "profit-calculator", icon: Calculator, label: "Profit Calculator", sub: "Cost vs income estimate", tint: "bg-feature-ai/12 text-feature-ai" },
      { id: "analytics", icon: BookOpen, label: "Farm Ledger", sub: "Track expenses & income", tint: "bg-feature-analytics/12 text-feature-analytics" },
    ],
  },
  {
    emoji: "🏛️",
    title: "Government",
    items: [
      { id: "schemes", icon: Landmark, label: "Schemes & Subsidies", sub: "PM-KISAN, KCC & more", tint: "bg-feature-schemes/12 text-feature-schemes" },
    ],
  },
  {
    emoji: "🚚",
    title: "Transport & Storage",
    items: [
      { id: "transport", icon: Truck, label: "Farm Transport", sub: "Trolley, pickup & trucks", tint: "bg-feature-transport/12 text-feature-transport" },
      { id: "cold-storage", icon: Warehouse, label: "Cold Storage", sub: "Store potato & onion", tint: "bg-feature-labor/12 text-feature-labor" },
    ],
  },
  {
    emoji: "👷",
    title: "Labour",
    items: [
      { id: "labor", icon: HardHat, label: "Labour Hire", sub: "Daily-wage farm workers", tint: "bg-feature-labor/12 text-feature-labor" },
    ],
  },
  {
    emoji: "📚",
    title: "Learning & Community",
    items: [
      { id: "krishi-shorts", icon: GraduationCap, label: "Krishi Shorts", sub: "60-second video lessons", tint: "bg-feature-cattle/12 text-feature-cattle" },
      { id: "news", icon: Newspaper, label: "Krishi News", sub: "MSP, policy & weather", tint: "bg-feature-news/12 text-feature-news" },
      { id: "community", icon: Users, label: "Farmer Community", sub: "Ask experts & farmers", tint: "bg-feature-community/12 text-feature-community" },
      { id: "network", icon: Users2, label: "Farmer Network", sub: "Providers, buyers & bookings", tint: "bg-feature-community/12 text-feature-community" },
    ],
  },
];

const ServicesHub: React.FC<ServicesHubProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState("");
  const { language } = useLanguage();
  const hi = language === "hi";
  const t = (k: string, vars?: Record<string, string | number>) => {
    let s = (STRINGS as Record<string, [string, string]>)[k]?.[hi ? 1 : 0] ?? k;
    if (vars) for (const [key, val] of Object.entries(vars)) s = s.replace(`{${key}}`, String(val));
    return s;
  };

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(15); } catch { /* unsupported */ }
    }
  };

  const go = (tab: string) => {
    triggerHaptic();
    onNavigate(tab);
  };

  const q = query.trim().toLowerCase();
  const filteredGroups = q
    ? GROUPS
        .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
        .filter((g) => g.items.length > 0)
    : GROUPS;

  const totalServices = GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="relative min-h-screen pb-36">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center gap-3">
        <button
          onClick={() => go("home")}
          className="p-2 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-[19px] text-foreground tracking-tight leading-none">
            {t("title")}
          </h1>
          <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 truncate">
            {t("subtitle", { n: totalServices })}
          </p>
        </div>
      </header>

      <section className="pt-4" aria-label="Available services">
        {/* Search */}
        <section className="px-4" aria-label="Search services">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-2xl border border-border bg-card pl-10 pr-9 py-3 text-base font-medium text-foreground placeholder:text-muted-foreground/70 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Search services"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
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
                <p className="mt-3 text-[15px] font-bold text-foreground">{t("noResults")}</p>
                <p className="mt-1 max-w-[260px] text-[12px] font-medium text-muted-foreground">
                  {t("noResultsHint", { q: query })}
                </p>
                <button
                  onClick={() => setQuery("")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest text-primary-foreground px-4 py-2 text-[12px] font-bold shadow-card active:scale-95 transition-transform"
                >
                  {t("clearSearch")}
                </button>
              </div>
            </div>
          </section>
        ) : (
          filteredGroups.map((group, gi) => (
            <section
              key={group.title}
              className="px-4 mt-6 reveal"
              style={{ animationDelay: `${gi * 50}ms` }}
              aria-labelledby={`group-${group.title}`}
            >
              <h2
                id={`group-${group.title}`}
                className="text-[13px] font-bold text-muted-foreground uppercase tracking-[0.14em] mb-3 px-1"
              >
                <span className="mr-1.5" aria-hidden="true">{group.emoji}</span>
                {hi ? (GROUPS_TITLE_HI[group.title] ?? group.title) : group.title}
              </h2>
              <div className={cn("grid gap-2.5", group.items.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                {group.items.map((item, ii) => (
                  <button
                    key={`${item.id}-${item.label}`}
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
