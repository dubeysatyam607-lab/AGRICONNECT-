import React from "react";
import { Home, Bot, TrendingUp, LayoutGrid, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const LABELS: Record<string, [string, string]> = {
  home: ["Home", "होम"],
  mandi: ["Market", "मंडी"],
  services: ["Services", "सेवाएँ"],
  wallet: ["Wallet", "बटुआ"],
  profile: ["Profile", "प्रोफ़ाइल"],
  ai: ["Kisan AI", "किसान AI"],
};

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: "home", icon: Home, label: "home" },
  { id: "mandi", icon: TrendingUp, label: "mandi" },
  { id: "services", icon: LayoutGrid, label: "services" },
  { id: "wallet", icon: Wallet, label: "wallet" },
  { id: "profile", icon: User, label: "profile" },
];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { language } = useLanguage();
  const hi = language === "hi";
  const label = (key: string) => (LABELS[key]?.[hi ? 1 : 0] ?? key);
  const handleNavClick = (id: string) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(10); } catch { /* unsupported */ }
    }
    setActiveTab(id);
  };

  const isAiActive = activeTab === "ai-chat";

  return (
    <div className="fixed bottom-4 inset-x-4 z-40 pointer-events-none flex justify-center safe-area-bottom">
      <nav
        aria-label="Primary"
        className="pointer-events-auto relative w-full max-w-lg bg-card/90 backdrop-blur-2xl border border-border shadow-soft rounded-[26px] px-1.5 py-2 flex justify-around items-center"
      >
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-label={label(item.label)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center gap-1 py-2 px-2 rounded-full transition-all duration-200 active:scale-90",
                isActive ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
              <span className={cn("text-xs font-bold tracking-tight", isActive ? "inline" : "hidden sm:inline font-semibold")}>
                {label(item.label)}
              </span>
            </button>
          );
        })}

        {/* Center AI FAB */}
        <button
          onClick={() => handleNavClick("ai-chat")}
          aria-current={isAiActive ? "page" : undefined}
          aria-label={label("ai")}
          className={cn(
            "relative -mt-10 flex h-14 w-14 items-center justify-center rounded-full gradient-ai text-white shadow-colorful transition-transform duration-200 active:scale-90",
            isAiActive ? "scale-110 ring-4 ring-feature-ai/30" : ""
          )}
        >
          <span className="relative">
            <Bot size={24} />
            <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-secondary animate-live-pulse" />
          </span>
          <span className="absolute -bottom-4 text-[10px] font-bold text-foreground">AI</span>
        </button>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              aria-label={label(item.label)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center gap-1 py-2 px-2 rounded-full transition-all duration-200 active:scale-90",
                isActive ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
              <span className={cn("text-xs font-bold tracking-tight", isActive ? "inline" : "hidden sm:inline font-semibold")}>
                {label(item.label)}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
