import React from "react";
import { Home, TrendingUp, Sprout, Leaf, LayoutGrid } from "lucide-react";
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
}

const navItems: NavItemConfig[] = [
  { id: "home", icon: Home, labelKey: "nav.home", fallback: "Home" },
  { id: "mandi", icon: TrendingUp, labelKey: "nav.mandi", fallback: "Mandi" },
  { id: "farm-os", icon: Sprout, labelKey: "nav.farm", fallback: "Crop" },
  { id: "ai-chat", icon: Leaf, labelKey: "nav.ai", fallback: "Kisan Saathi" },
  { id: "services", icon: LayoutGrid, labelKey: "nav.more", fallback: "More" },
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
    <nav
      aria-label="Primary Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 lg:hidden"
    >
      <div className="mx-auto flex w-full max-w-lg items-stretch justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === "ai-chat" && (activeTab === "ai" || activeTab === "ai-chat" || activeTab === "kisan-ai"));
          const lbl = getLabel(item.labelKey, item.fallback);

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-label={lbl}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-h-[52px] min-w-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 pt-1 transition-colors",
                isActive ? "text-[#285943]" : "text-[#66736B] hover:text-[#26332B]"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-12 items-center justify-center rounded-full transition-all duration-200",
                  isActive ? "bg-[#5E9F58]/15" : "group-active:bg-muted"
                )}
              >
                <Icon
                  size={19}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={isActive ? "text-[#285943]" : "text-[#66736B]"}
                  aria-hidden="true"
                />
              </span>
              <span className={cn(
                "text-[10.5px] leading-none tracking-tight",
                isActive ? "font-bold text-[#285943]" : "font-medium text-[#66736B]"
              )}>
                {lbl}
              </span>
              {isActive && (
                <span className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-[#5E9F58]" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;