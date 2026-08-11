import React from "react";
import {
  Sparkles, Bot, Droplets, CloudRain, Leaf, TrendingUp, Landmark,
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

/**
 * The heart of the Home screen — "What should the farmer do next?".
 * Renders data-driven recommendations derived from the farmer's crop profile
 * and live weather (see farm-advisor.ts), plus critical weather alerts.
 */
const AiInsightCard: React.FC<AiInsightCardProps> = ({ wl, loading, cropLabel, items, onGo }) => {
  if (loading && !wl) {
    return (
      <section className="px-4 mt-4" aria-label="AI insights loading">
        <div className="h-56 w-full rounded-[28px] border border-border bg-card animate-shimmer" />
      </section>
    );
  }

  const isCritical = wl?.advisoryAlert?.isCritical;

  return (
    <section className="px-4 mt-4" aria-labelledby="insight-heading">
      <div className="relative overflow-hidden rounded-[28px] border border-border bg-card p-5 shadow-card">
        <span className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-feature-ai/10 blur-2xl" aria-hidden="true" />

        {/* Header */}
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-ai text-white shadow-colorful animate-float">
            <Sparkles size={19} />
          </span>
          <div className="flex-1">
            <h2 id="insight-heading" className="font-display font-semibold text-[17px] tracking-tight text-foreground leading-none">
              Kisan AI Insight
            </h2>
            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
              {cropLabel} · personalised for today
            </p>
          </div>
          <span className="feature-chip bg-feature-ai/10 text-feature-ai">
            <span className="h-1.5 w-1.5 rounded-full bg-feature-ai animate-live-pulse" /> Live
          </span>
        </div>

        {/* Critical weather alert */}
        {isCritical && wl?.advisoryAlert && (
          <div className="relative mt-3.5 flex items-start gap-2.5 rounded-2xl border border-feature-news/30 bg-feature-news/10 px-3.5 py-3">
            <ShieldAlert size={17} className="mt-0.5 shrink-0 text-feature-news" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-foreground leading-snug">{wl.advisoryAlert.title}</p>
              {wl.advisoryAlert.message && (
                <p className="text-[12px] text-muted-foreground mt-0.5">{wl.advisoryAlert.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="relative mt-3.5 divide-y divide-border">
          {items.slice(0, 4).map((item) => {
            const Icon = ICON_MAP[item.icon];
            return (
              <button
                key={item.title}
                onClick={() => onGo(item.tab)}
                className="group flex w-full items-center gap-3 py-3 text-left"
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", item.tone)}>
                  <Icon size={17} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-bold text-foreground leading-snug">{item.title}</span>
                  <span className="block text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{item.sub}</span>
                </span>
                <ChevronRight size={15} className="shrink-0 text-muted-foreground/40 group-hover:translate-x-0.5 group-hover:text-muted-foreground transition-all" />
              </button>
            );
          })}
        </div>

        {/* Ask AI CTA */}
        <button
          onClick={() => onGo("ai-chat")}
          className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-2xl gradient-ai text-white px-4 py-3 shadow-colorful hover-lift"
        >
          <Bot size={16} />
          <span className="text-[13px] font-bold">Ask AI for details</span>
          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </section>
  );
};

export default AiInsightCard;
