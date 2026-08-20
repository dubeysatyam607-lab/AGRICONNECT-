import React from "react";
import { Home, Bot, TrendingUp, LayoutGrid, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const LABELS: Record<string, string> = {
  home: 'nav.home',
  mandi: 'nav.mandi',
  services: 'nav.services',
  wallet: 'nav.wallet',
  profile: 'nav.profile',
  ai: 'nav.ai',
};

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: "home", icon: Home, labelKey: "nav.home", fallback: "Home" },
  { id: "mandi", icon: TrendingUp, labelKey: "nav.mandi", fallback: "Market" },
  { id: "services", icon: LayoutGrid, labelKey: "nav.services", fallback: "Services" },
  { id: "wallet", icon: Wallet, labelKey: "nav.wallet", fallback: "Wallet" },
  { id: "profile", icon: User, labelKey: "nav.profile", fallback: "Profile" },
];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();
  const getLabel = (key: string, fallback: string) => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };
  const handleNavClick = (id: string) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(10); } catch { /* unsupported */ }
    }
    setActiveTab(id);
  };

  const isAiActive = activeTab === "ai-chat";

  return (
    <div className="fixed bottom-3 sm:bottom-4 inset-x-2 sm:inset-x-4 z-40 pointer-events-none flex justify-center safe-area-bottom">
      <nav
        aria-label="Primary"
        className="pointer-events-auto relative w-full max-w-lg bg-card/90 backdrop-blur-2xl border border-border shadow-soft rounded-[26px] px-1 sm:px-1.5 py-1.5 sm:py-2 flex justify-around items-center"
      >
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const lbl = getLabel(item.labelKey, item.fallback);
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-label={lbl}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-90",
                isActive ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 2} className="shrink-0" />
              <span className={cn("text-[11px] sm:text-xs font-bold tracking-tight", isActive ? "inline" : "hidden sm:inline font-semibold")}>
                {lbl}
              </span>
            </button>
          );
        })}

        {/* Center AI FAB */}
        <button
          onClick={() => handleNavClick("ai-chat")}
          aria-current={isAiActive ? "page" : undefined}
          aria-label={getLabel("nav.ai", "Kisan AI")}
          className={cn(
            "relative -mt-8 sm:-mt-10 flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full gradient-ai text-white shadow-colorful transition-transform duration-200 active:scale-90",
            isAiActive ? "scale-105 sm:scale-110 ring-4 ring-feature-ai/30" : ""
          )}
        >
          <span className="relative">
            <Bot size={22} className="sm:hidden" />
            <Bot size={24} className="hidden sm:block" />
            <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-secondary animate-live-pulse" />
          </span>
          <span className="absolute -bottom-3.5 sm:-bottom-4 text-[9px] sm:text-[10px] font-bold text-foreground">AI</span>
        </button>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const lbl = getLabel(item.labelKey, item.fallback);
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-label={lbl}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-90",
                isActive ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 2} className="shrink-0" />
              <span className={cn("text-[11px] sm:text-xs font-bold tracking-tight", isActive ? "inline" : "hidden sm:inline font-semibold")}>
                {lbl}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
