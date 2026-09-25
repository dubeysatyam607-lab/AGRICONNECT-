import React from "react";
import {
  Home, TrendingUp, Sprout, Leaf, ShoppingBag, Tractor, PawPrint, Users,
  Truck, Scan, CalendarDays, FlaskConical, ShieldCheck, Wallet, Cpu,
  Landmark, Newspaper, Bell, User, Settings,
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
    title: "Crop Care",
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
      className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-card/40"
    >
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-5">
          <Logo size={26} />
          <div className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight text-foreground">AgriConnect</span>
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Kisan ka apna</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
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

          {GROUPS.map((group) => (
            <div key={group.titleKey} className="mt-5">
              <p className="px-3 type-label">{tr(group.titleKey, group.title)}</p>
              <div className="mt-1.5 space-y-0.5">
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

        <div className="shrink-0 border-t border-border p-3">
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
        "group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
        active
          ? "bg-primary/10 font-bold text-primary"
          : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full transition-opacity",
          active ? "bg-marigold opacity-100" : "opacity-0 group-hover:opacity-30",
        )}
        aria-hidden="true"
      />
      <Icon size={17} strokeWidth={active ? 2.3 : 2} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
};

export default DesktopSidebar;
