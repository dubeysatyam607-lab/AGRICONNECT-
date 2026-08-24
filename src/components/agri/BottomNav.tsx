import React from "react";
import { Home, TrendingUp, Sparkles, LayoutGrid, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface NavItemConfig {
  id: string;
  icon: typeof Home;
  labelKey: string;
  fallback: string;
  isAi?: boolean;
}

const navItems: NavItemConfig[] = [
  { id: "home", icon: Home, labelKey: "nav.home", fallback: "Home" },
  { id: "mandi", icon: TrendingUp, labelKey: "nav.mandi", fallback: "Mandi Bhav" },
  { id: "ai-chat", icon: Sparkles, labelKey: "nav.ai", fallback: "AI", isAi: true },
  { id: "services", icon: LayoutGrid, labelKey: "nav.services", fallback: "Services" },
  { id: "wallet", icon: Wallet, labelKey: "nav.wallet", fallback: "Wallet" },
  { id: "profile", icon: User, labelKey: "nav.profile", fallback: "Profile" },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();

  const getLabel = (key: string, fallback: string) => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  const handleNavClick = (id: string) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(12); } catch { /* unsupported */ }
    }
    setActiveTab(id);
  };

  return (
    <div className="fixed bottom-3 sm:bottom-5 inset-x-0 z-50 pointer-events-none flex justify-center px-3 sm:px-4 safe-area-bottom">
      <nav
        aria-label="Primary Mobile Navigation"
        className="pointer-events-auto relative w-full max-w-lg glass-dock rounded-full px-2 py-1.5 flex items-center justify-between shadow-2xl transition-all duration-300"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === "ai-chat" && (activeTab === "ai" || activeTab === "ai-chat" || activeTab === "kisan-ai"));
          const lbl = getLabel(item.labelKey, item.fallback);

          if (item.isAi) {
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-label={lbl}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center -my-3 mx-1 h-12 w-12 sm:h-13 sm:w-13 rounded-full transition-all duration-300 tap-bounce shadow-lg",
                  isActive
                    ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white ring-4 ring-emerald-500/30 scale-110"
                    : "bg-gradient-to-tr from-emerald-600/90 via-teal-600/90 to-emerald-700 text-white hover:scale-105"
                )}
              >
                <Icon size={20} className="transition-transform duration-300" />
                <span className="text-[9px] font-black tracking-tight leading-none mt-0.5">AI</span>
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900 animate-pulse" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-label={lbl}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center min-w-[48px] sm:min-w-[56px] py-1.5 px-2 rounded-2xl transition-all duration-200 tap-bounce",
                isActive
                  ? "text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 dark:bg-emerald-500/15"
                  : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/40 font-medium"
              )}
            >
              <Icon
                size={19}
                strokeWidth={isActive ? 2.6 : 2}
                className={cn("transition-transform duration-200", isActive && "scale-110 text-emerald-600 dark:text-emerald-400")}
              />
              <span className="text-[10px] sm:text-[11px] tracking-tight leading-none mt-1 font-semibold truncate max-w-[62px]">
                {lbl}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-4 h-1 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
