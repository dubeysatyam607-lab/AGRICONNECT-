import React, { useState } from "react";
import {
  Home, TrendingUp, Sprout, Leaf, ShoppingBag, Tractor, PawPrint, Users,
  Truck, Scan, CalendarDays, FlaskConical, ShieldCheck, Wallet, Cpu,
  Landmark, Newspaper, Bell, User, Settings, Sparkles, Calendar, ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Logo } from "@/components/ui/Logo";
import { prefetchTabChunk } from "@/lib/prefetch-tabs";

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
  { id: "bookings", icon: Calendar, labelKey: "profile.bookings.title", label: "My Bookings" },
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

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  // Collapsible category state: groups can be collapsed to reduce density
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isGroupOpen = (group: Group) => {
    // If user has explicitly toggled this group, honor that
    if (collapsedGroups[group.titleKey] !== undefined) {
      return !collapsedGroups[group.titleKey];
    }
    // Default open all groups so full sidebar height and items are visible
    return true;
  };

  return (
    <aside
      aria-label="Primary navigation"
      className="app-sidebar hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:top-0 lg:w-64 xl:w-72 lg:shrink-0 lg:flex-col lg:h-screen lg:h-[100dvh] lg:border-r lg:border-border lg:bg-[#FBFAF4] dark:lg:bg-card shadow-soft z-30"
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Brand Header — pinned at top */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-white/80 dark:bg-card/80 px-5 backdrop-blur-md">
          <Logo size={28} alt="" aria-hidden="true" />
          <div className="leading-tight min-w-0">
            <span className="block text-base font-extrabold tracking-tight text-foreground truncate">AgriConnect</span>
            <span className="block text-xs font-semibold text-emerald-800 dark:text-emerald-400 truncate">Kisan Ka Apna</span>
          </div>
        </div>

        {/* Scrollable Navigation Items — independently scrollable */}
        <nav
          aria-label="Sidebar sections"
          className="sidebar-navigation flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-3 scrollbar-thin overscroll-contain"
        >
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

          {/* Collapsible Grouped Feature Links */}
          {GROUPS.map((group) => {
            const open = isGroupOpen(group);
            return (
              <div key={group.titleKey} className="pt-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.titleKey)}
                  aria-expanded={open}
                  className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-left hover:bg-muted/50 transition-colors select-none cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground truncate">
                      {tr(group.titleKey, group.title)}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={cn("shrink-0 text-muted-foreground transition-transform duration-200", open ? "rotate-0" : "-rotate-90")}
                    aria-hidden="true"
                  />
                </button>
                {open && (
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
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Account Links — pinned at bottom, never covered */}
        <div className="shrink-0 border-t border-border bg-white/80 dark:bg-card/80 p-3 backdrop-blur-sm space-y-1">
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
      onMouseEnter={() => prefetchTabChunk(item.id)}
      onTouchStart={() => prefetchTabChunk(item.id)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] transition-all duration-200",
        active
          ? "bg-[#0F5132]/10 text-[#0F5132] font-bold"
          : "font-medium text-[#26332B]/75 hover:bg-[#0F5132]/5 hover:text-[#0F5132]"
      )}
    >
      {/* Active Indicator Bar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200",
          active ? "bg-[#00C26E] opacity-100" : "opacity-0 group-hover:bg-[#0F5132]/20 group-hover:opacity-100"
        )}
        aria-hidden="true"
      />
      <Icon
        size={18}
        strokeWidth={active ? 2.2 : 1.8}
        className={cn(
          "shrink-0 transition-transform duration-200 group-hover:scale-105",
          active ? "text-[#0F5132]" : "text-[#66736B] group-hover:text-[#0F5132]"
        )}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
    </button>
  );
};

export const MobileSidebarSheet: React.FC<MobileSidebarProps> = ({
  open,
  onOpenChange,
  activeTab,
  setActiveTab,
}) => {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const isGroupOpen = (group: Group) => {
    if (collapsedGroups[group.titleKey] !== undefined) {
      return !collapsedGroups[group.titleKey];
    }
    return true;
  };

  const handleSelect = (id: string) => {
    setActiveTab(id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="p-0 w-80 max-w-[85vw] flex flex-col h-full bg-[#FBFAF4] dark:bg-card border-r border-border">
        <SheetHeader className="h-16 shrink-0 flex flex-row items-center gap-3 border-b border-border bg-white/80 dark:bg-card/80 px-5 backdrop-blur-md text-left">
          <Logo size={28} alt="" aria-hidden="true" />
          <div className="leading-tight min-w-0">
            <SheetTitle className="text-base font-extrabold tracking-tight text-foreground truncate m-0">AgriConnect</SheetTitle>
            <span className="block text-xs font-semibold text-emerald-800 dark:text-emerald-400 truncate">Kisan Ka Apna</span>
          </div>
        </SheetHeader>

        <nav
          aria-label="Mobile sidebar sections"
          className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin overscroll-contain"
        >
          <div className="space-y-1">
            {PRIMARY.map((item) => (
              <SidebarLink
                key={item.id}
                item={item}
                label={tr(item.labelKey, item.label)}
                active={activeTab === item.id || (item.id === "ai-chat" && (activeTab === "ai" || activeTab === "kisan-ai"))}
                onClick={() => handleSelect(item.id)}
              />
            ))}
          </div>

          {GROUPS.map((group) => {
            const grpOpen = isGroupOpen(group);
            return (
              <div key={group.titleKey} className="pt-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.titleKey)}
                  aria-expanded={grpOpen}
                  className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-left hover:bg-muted/50 transition-colors select-none cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground truncate">
                      {tr(group.titleKey, group.title)}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={cn("shrink-0 text-muted-foreground transition-transform duration-200", grpOpen ? "rotate-0" : "-rotate-90")}
                    aria-hidden="true"
                  />
                </button>
                {grpOpen && (
                  <div className="space-y-[3px]">
                    {group.items.map((item) => (
                      <SidebarLink
                        key={item.id}
                        item={item}
                        label={tr(item.labelKey, item.label)}
                        active={activeTab === item.id}
                        onClick={() => handleSelect(item.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border bg-white/80 dark:bg-card/80 p-3 backdrop-blur-sm space-y-1">
          <SidebarLink
            item={{ id: "profile", icon: User, labelKey: "nav.profile", label: "Profile" }}
            label={tr("nav.profile", "Profile")}
            active={activeTab === "profile"}
            onClick={() => handleSelect("profile")}
          />
          <SidebarLink
            item={{ id: "settings", icon: Settings, labelKey: "", label: "Settings" }}
            label="Settings"
            active={activeTab === "settings"}
            onClick={() => handleSelect("settings")}
          />
          <SidebarLink
            item={{ id: "notifications", icon: Bell, labelKey: "", label: "Notifications" }}
            label="Notifications"
            active={activeTab === "notifications"}
            onClick={() => handleSelect("notifications")}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DesktopSidebar;
