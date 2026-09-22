import React from "react";
import { TrendingUp, TrendingDown, ArrowRight, IndianRupee, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { MandiPrice } from "@/lib/mandi-api";

export interface MandiPreviewProps {
  items: MandiPrice[];
  loading: boolean;
  error: string | null;
  onOpen: () => void;
  onRetry: () => void;
}

/**
 * "आज का मंडी भाव" — the day's crop prices as a warm full-width band, not a
 * plain card list. Prices always come from the live mandi API (AGMARKNET);
 * nothing here is fabricated.
 */
export const MandiPreview: React.FC<MandiPreviewProps> = ({ items, loading, error, onOpen, onRetry }) => {
  const { t, language } = useLanguage();
  const visible = items.slice(0, 6);

  const cropName = (p: MandiPrice) => (language === "hi" && p.cropHi ? p.cropHi : p.crop);

  return (
    <section aria-labelledby="mandi-preview-heading">
      <div className="band-mandi rounded-2xl px-4 py-5 md:px-5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 id="mandi-preview-heading" className="flex items-center gap-2.5 text-[19px] font-bold tracking-tight text-foreground">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary animate-live-ring" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            {t("home.todayMandi")}
          </h2>
          <button
            onClick={onOpen}
            className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-primary"
          >
            {t("home.viewMore")}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-1 flex items-center gap-1.5 pl-5 type-meta text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 animate-live-ring" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-bold text-emerald-700">{t("home.liveBadge")}</span>
          {visible[0]?.lastUpdatedText && (
            <>
              <span aria-hidden="true">·</span>
              <span>{t("home.updatedAgo")} {visible[0].lastUpdatedText}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{t("home.mandiSource")}</span>
        </p>

        {visible.length > 0 ? (
          <div className="no-scrollbar -mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
            {visible.map((p) => {
              const up = p.status === "up";
              const down = p.status === "down";
              const belowMsp = p.msp != null && p.price < p.msp;
              return (
                <button
                  key={p.id}
                  onClick={onOpen}
                  className={cn(
                    "flex w-[170px] shrink-0 snap-start flex-col rounded-xl border bg-card p-3.5 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98]",
                    belowMsp ? "border-amber-500/50" : "border-transparent",
                  )}
                >
                  <span className="type-small font-bold text-foreground truncate">{cropName(p)}</span>
                  <span className="mt-1 flex items-baseline gap-0.5 text-foreground">
                    <IndianRupee size={15} className="translate-y-px" aria-hidden="true" />
                    <span className="type-num text-2xl leading-none">{p.price.toLocaleString("en-IN")}</span>
                    <span className="type-meta">{t("home.perQuintal")}</span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-1 type-meta text-muted-foreground truncate">
                    <MapPin size={12} aria-hidden="true" />
                    {p.market}
                  </span>
                  <span className="mt-2 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 type-meta font-bold",
                        up ? "text-primary" : down ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {up && <TrendingUp size={13} aria-hidden="true" />}
                      {down && <TrendingDown size={13} aria-hidden="true" />}
                      {p.change}
                    </span>
                    {belowMsp && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 type-meta font-bold text-amber-700">
                        {t("home.belowMsp")}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <p className="type-small font-semibold text-foreground">
              {loading ? t("home.mandiLoading") : t("home.mandiUnavailable")}
            </p>
            {!loading && (
              <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={onRetry}
                    className="type-small font-semibold text-primary"
                  >
                    {t("home.retryMandi")}
                  </button>
                <button
                  onClick={onOpen}
                  className="touch-target rounded-lg border border-border bg-background px-4 py-2 type-small font-semibold text-foreground"
                >
                  {t("home.viewMore")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default MandiPreview;
