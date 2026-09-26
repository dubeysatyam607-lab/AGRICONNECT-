import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Tractor,
  TrendingUp,
  Sprout,
  Scan,
  MessageCircleHeart,
  Landmark,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export interface CoreFeature {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  subKey: string;
  accent: string;
  iconWrap: string;
}

const CORE_FEATURES: CoreFeature[] = [
  {
    id: "tractors",
    icon: Tractor,
    labelKey: "svc.tractors",
    subKey: "svc.tractorsSub",
    accent: "from-soil/15 to-soil/5",
    iconWrap: "bg-soil text-white",
  },
  {
    id: "mandi",
    icon: TrendingUp,
    labelKey: "nav.mandi",
    subKey: "svc.mandiSub",
    accent: "from-marigold/25 to-marigold/5",
    iconWrap: "bg-amber-500 text-white",
  },
  {
    id: "farm-os",
    icon: Sprout,
    labelKey: "home.farmTitle",
    subKey: "home.farmTitleSub",
    accent: "from-primary/15 to-primary/5",
    iconWrap: "bg-primary text-white",
  },
  {
    id: "crop-doctor",
    icon: Scan,
    labelKey: "svc.cropDoctor",
    subKey: "svc.cropDoctorSub",
    accent: "from-emerald-500/15 to-emerald-500/5",
    iconWrap: "bg-emerald-600 text-white",
  },
  {
    id: "ai-chat",
    icon: MessageCircleHeart,
    labelKey: "svc.aiChat",
    subKey: "svc.aiChatSub",
    accent: "from-rose-400/15 to-rose-400/5",
    iconWrap: "bg-rose-500 text-white",
  },
  {
    id: "schemes",
    icon: Landmark,
    labelKey: "svc.schemes",
    subKey: "svc.schemesSub",
    accent: "from-sky-500/15 to-sky-500/5",
    iconWrap: "bg-sky-600 text-white",
  },
  {
    id: "store",
    icon: ShoppingBag,
    labelKey: "svc.store",
    subKey: "svc.storeSub",
    accent: "from-violet-500/15 to-violet-500/5",
    iconWrap: "bg-violet-600 text-white",
  },
];

export interface CoreFeaturesProps {
  onGo: (tab: string) => void;
}

/**
 * "Everything a Farmer Needs" — the seven core AgriConnect features as a
 * rich, agricultural feature grid. Purely navigational: every card routes to
 * a real existing tab and shows only localized static copy, never fabricated
 * data.
 */
export const CoreFeatures: React.FC<CoreFeaturesProps> = ({ onGo }) => {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="core-features-heading" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p id="core-features-heading" className="section-eyebrow">
            {t("home.coreFeatures")}
          </p>
          <h2 className="mt-1 font-display text-[22px] font-extrabold tracking-tight text-foreground sm:text-[26px]">
            {t("home.everythingAFarmerNeeds")}
          </h2>
        </div>
        <button
          onClick={() => onGo("services")}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12px] font-bold text-foreground/80 transition-all hover:border-primary/40 hover:text-primary active:scale-[0.97]"
        >
          {t("home.viewAll")}
          <ArrowRight size={13} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CORE_FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              onClick={() => onGo(f.id)}
              className={cn(
                "group relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card-hover active:scale-[0.98]"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                  f.accent
                )}
                aria-hidden="true"
              />
              <span className="relative flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105",
                    f.iconWrap
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary/80">
                  {t("home.open")}
                  <ArrowRight
                    size={12}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </span>

              <span className="relative mt-3 block">
                <span className="block text-[15px] font-extrabold leading-snug tracking-tight text-foreground">
                  {t(f.labelKey)}
                </span>
                <span className="mt-1 line-clamp-2 block text-[12.5px] leading-relaxed text-muted-foreground">
                  {t(f.subKey)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CoreFeatures;