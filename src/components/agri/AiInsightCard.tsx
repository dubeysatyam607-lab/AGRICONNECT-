import React from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Droplets, CloudRain, Leaf, TrendingUp, Landmark,
  ChevronRight, ShieldAlert,
} from "lucide-react";
import type { IWeatherModuleData } from "@/features/weather/domain/models/WeatherModels";
import type { FarmAdviceItem, AdviceIconKey } from "@/lib/farm-advisor";
import { cn } from "@/lib/utils";

interface AiInsightCardProps {
  wl: IWeatherModuleData | null;
  loading: boolean;
  cropLabel: string;
  items: FarmAdviceItem[];
  onGo: (tab: string) => void;
}

const ICON_MAP: Record<AdviceIconKey, React.ComponentType<{ size?: number | string; className?: string }>> = {
  rain: CloudRain,
  drop: Droplets,
  leaf: Leaf,
  market: TrendingUp,
  scheme: Landmark,
};

const AiInsightCard: React.FC<AiInsightCardProps> = ({ wl, loading, cropLabel, items, onGo }) => {
  const { t } = useLanguage();
  if (loading && !wl) {
    return (
      <section aria-labelledby="insight-heading">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="section-eyebrow">{t("home.adviceCaption")}</p>
            <h2 id="insight-heading" className="type-h2 mt-1.5">{t("hero.whatToday")}</h2>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  const isCritical = wl?.advisoryAlert?.isCritical;

  return (
    <section aria-labelledby="insight-heading">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="section-eyebrow">{t("home.adviceCaption")}</p>
          <h2 id="insight-heading" className="type-h2 mt-1.5">{t("hero.whatToday")}</h2>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-bold text-primary">
          {cropLabel}
        </span>
      </div>

      {isCritical && wl?.advisoryAlert && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-destructive" />
          <div>
            <p className="text-[13px] font-semibold text-foreground leading-snug">{wl.advisoryAlert.title}</p>
            {wl.advisoryAlert.message && (
              <p className="text-[12px] text-muted-foreground mt-0.5">{wl.advisoryAlert.message}</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card p-2 shadow-card">
        {items.slice(0, 4).map((item) => {
          const Icon = ICON_MAP[item.icon];
          return (
            <button
              key={item.title}
              onClick={() => onGo(item.tab)}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-3 text-left transition-colors hover:bg-muted/60"
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.tone)}>
                <Icon size={16} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-semibold text-foreground leading-snug">{item.title}</span>
                <span className="block text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{item.sub}</span>
              </span>
              <ChevronRight size={15} className="shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default AiInsightCard;