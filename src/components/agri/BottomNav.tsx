import React from "react";
import { Home, Bot, TrendingUp, LayoutGrid, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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
        className="pointer-events-auto relative w-full max-w-lg glass-dock rounded-[28px] px-2 py-2 flex justify-around items-center transition-all duration-300"
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
                "relative flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] py-2 px-3 rounded-2xl transition-all duration-300 tap-bounce",
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold shadow-md shadow-emerald-500/30 scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} className="shrink-0 transition-transform duration-200" />
              <span className={cn("text-[11px] sm:text-xs font-bold tracking-tight", isActive ? "inline" : "hidden sm:inline font-semibold")}>
                {lbl}
              </span>
            </button>
          );
        })}

        {/* Center Kisan AI FAB */}
        <button
          onClick={() => handleNavClick("ai-chat")}
          aria-current={isAiActive ? "page" : undefined}
          aria-label={getLabel("nav.ai", "Kisan AI")}
          className={cn(
            "relative -mt-8 sm:-mt-10 flex h-13 w-13 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 text-white shadow-xl shadow-purple-600/30 transition-all duration-300 tap-bounce group",
            isAiActive ? "scale-110 ring-4 ring-purple-500/40 neon-glow-ai" : "hover:scale-105"
          )}
        >
          <span className="relative flex items-center justify-center">
            <Bot size={24} className="sm:hidden group-hover:rotate-12 transition-transform duration-300" />
            <Bot size={26} className="hidden sm:block group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900 animate-live-pulse" />
          </span>
          <span className="absolute -bottom-4 text-[10px] font-black text-foreground drop-shadow-sm tracking-wider uppercase">AI</span>
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
                "relative flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] py-2 px-3 rounded-2xl transition-all duration-300 tap-bounce",
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold shadow-md shadow-emerald-500/30 scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} className="shrink-0 transition-transform duration-200" />
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
