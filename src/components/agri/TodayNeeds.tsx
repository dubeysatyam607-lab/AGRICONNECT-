import React from "react";
import { CloudSun, TrendingUp, Sprout, MessageCircleHeart, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface FarmNeed {
  id: string;
  labelKey: string;
  icon: typeof CloudSun;
  href: () => void;
  accent: string;
  value?: string;
  sub?: string;
}

interface TodayNeedsProps {
  needs: FarmNeed[];
}

/**
 * TodayNeeds — the below-hero story strip.
 *
 * Four farm-first tiles (weather, mandi, crop, Kisan Saathi) that translate
 * the hero into the product. Tiles render only when their real value exists;
 * a tile without data still navigates to its tool so nothing ever looks
 * broken. No fabricated numbers, no dashboard-card overload.
 */
export const TodayNeeds: React.FC<TodayNeedsProps> = ({ needs }) => {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="today-needs-heading" className="mt-8">
      <div className="flex items-center gap-2">
        <span className="h-6 w-1 rounded-full bg-primary" aria-hidden="true" />
        <h2
          id="today-needs-heading"
          className="font-display text-[17px] font-bold tracking-tight text-[#111827] md:text-[20px]"
        >
          {t("home.todayNeeds")}
        </h2>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {needs.map((need, i) => {
          const Icon = need.icon;
          return (
            <button
              key={need.id}
              type="button"
              onClick={need.href}
              className="group flex min-h-[104px] flex-col items-start justify-between rounded-2xl border border-forest/10 bg-white/70 p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-forest/25 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="flex w-full items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${need.accent}`}
                >
                  <Icon size={19} aria-hidden="true" />
                </span>
                <ChevronRight
                  size={16}
                  className="text-forest/40 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>

              <span className="mt-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-forest/70">
                {t(need.labelKey)}
              </span>
              {need.value ? (
                <span className="block text-[15px] font-bold leading-snug text-[#111827]">
                  {need.value}
                  {need.sub ? (
                    <span className="ml-1.5 text-[12px] font-semibold text-forest/60">
                      {need.sub}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="block text-[14px] font-semibold text-forest/70">
                  {t("home.todayNeedsOpen")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default TodayNeeds;