import React from "react";
import {
  Home, TrendingUp, Sprout, Leaf, ShoppingBag, Tractor, PawPrint, Users,
  Truck, Scan, CalendarDays, FlaskConical, ShieldCheck, Wallet, Cpu,
  Landmark, Newspaper, Bell, User, Settings, Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Logo } from "@/components/ui/Logo";

interface DesktopSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface Item {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  label: string;
}

interface Group {
  titleKey: string;
  title: string;
  items: Item[];
}

const PRIMARY: Item[] = [
  { id: "home", icon: Home, labelKey: "nav.home", label: "Home" },
  { id: "mandi", icon: TrendingUp, labelKey: "nav.mandi", label: "Mandi Bhav" },
  { id: "farm-os", icon: Sprout, labelKey: "nav.farm", label: "My Crop" },
  { id: "ai-chat", icon: Leaf, labelKey: "nav.ai", label: "Kisan Saathi" },
];

const GROUPS: Group[] = [
  {
    titleKey: "svc.hub.group.marketplace",
    title: "Marketplace",
    items: [
      { id: "store", icon: ShoppingBag, labelKey: "svc.hub.marketplace.store.label", label: "Agri Store" },
      { id: "tractors", icon: Tractor, labelKey: "svc.tractors", label: "Agricultural Machinery" },
      { id: "cattle", icon: PawPrint, labelKey: "svc.hub.marketplace.cattle.label", label: "Cattle Market" },
      { id: "labor", icon: Users, labelKey: "svc.hub.labour.labor.label", label: "Labour Hire" },
      { id: "transport", icon: Truck, labelKey: "svc.hub.transportStorage.transport.label", label: "Farm Transport" },
    ],
  },
  {
    titleKey: "svc.hub.group.aiCropCare",
    title: "Crop Care & AI",
    items: [
      { id: "hardware-dashboard", icon: Cpu, labelKey: "svc.hub.aiCropCare.hardwareDashboard.label", label: "IoT Sensors (ESP32)" },
      { id: "crop-doctor", icon: Scan, labelKey: "svc.cropDoctor", label: "Crop Scan" },
      { id: "crop-calendar", icon: CalendarDays, labelKey: "svc.hub.aiCropCare.cropCalendar.label", label: "Crop Calendar" },
      { id: "soil", icon: FlaskConical, labelKey: "svc.hub.aiCropCare.soil.label", label: "Soil Health" },
      { id: "cold-storage", icon: ShieldCheck, labelKey: "svc.hub.transportStorage.coldStorage.label", label: "Cold Storage" },
    ],
  },
  {
    titleKey: "svc.hub.group.government",
    title: "Money & Support",
    items: [
      { id: "schemes", icon: Landmark, labelKey: "svc.hub.government.schemes.label", label: "Schemes & Subsidies" },
      { id: "wallet", icon: Wallet, labelKey: "nav.wallet", label: "Wallet" },
    ],
  },
  {
    titleKey: "svc.hub.group.learningCommunity",
    title: "Community",
    items: [
      { id: "news", icon: Newspaper, labelKey: "svc.hub.learningCommunity.news.label", label: "Krishi News" },
    ],
  },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-[#FBFAF4] shadow-soft"
    >
      <div className="sticky top-0 flex h-screen flex-col">
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-white/80 px-5 backdrop-blur-md">
          <Logo size={28} />
          <div className="leading-tight">
            <span className="block text-[15.5px] font-bold tracking-tight text-[#285943]">AgriConnect</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#5E9F58]">Kisan Ka Apna</span>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 no-scrollbar">
          {/* Primary Quick Links */}
          <div className="space-y-1">
            {PRIMARY.map((item) => (
              <SidebarLink
                key={item.id}
                item={item}
                label={tr(item.labelKey, item.label)}
                active={activeTab === item.id || (item.id === "ai-chat" && (activeTab === "ai" || activeTab === "kisan-ai"))}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </div>

          {/* Grouped Feature Links */}
          {GROUPS.map((group) => (
            <div key={group.titleKey} className="pt-2">
              <div className="mb-2 flex items-center gap-1.5 px-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5E9F58]" />
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#26332B]/60">
                  {tr(group.titleKey, group.title)}
                </p>
              </div>
              <div className="space-y-[3px]">
                {group.items.map((item) => (
                  <SidebarLink
                    key={item.id}
                    item={item}
                    label={tr(item.labelKey, item.label)}
                    active={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Account Links */}
        <div className="shrink-0 border-t border-border bg-white/70 p-3 backdrop-blur-sm space-y-1">
          <SidebarLink
            item={{ id: "profile", icon: User, labelKey: "nav.profile", label: "Profile" }}
            label={tr("nav.profile", "Profile")}
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
          <SidebarLink
            item={{ id: "settings", icon: Settings, labelKey: "", label: "Settings" }}
            label="Settings"
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
          <SidebarLink
            item={{ id: "notifications", icon: Bell, labelKey: "", label: "Notifications" }}
            label="Notifications"
            active={activeTab === "notifications"}
            onClick={() => setActiveTab("notifications")}
          />
        </div>
      </div>
    </aside>
  );
};

const SidebarLink: React.FC<{
  item: Item;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ item, label, active, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] transition-all duration-200",
        active
          ? "bg-[#5E9F58]/12 text-[#285943] font-bold"
          : "font-medium text-[#26332B]/75 hover:bg-[#285943]/6 hover:text-[#285943]"
      )}
    >
      {/* Active Indicator Bar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200",
          active ? "bg-[#5E9F58] opacity-100" : "opacity-0 group-hover:bg-[#285943]/20 group-hover:opacity-100"
        )}
        aria-hidden="true"
      />
      <Icon
        size={18}
        strokeWidth={active ? 2.2 : 1.8}
        className={cn(
          "shrink-0 transition-transform duration-200 group-hover:scale-105",
          active ? "text-[#285943]" : "text-[#66736B] group-hover:text-[#285943]"
        )}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </button>
  );
};

export default DesktopSidebar;
