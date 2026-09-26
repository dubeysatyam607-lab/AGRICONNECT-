import React from "react";
import { TrendingUp, TrendingDown, ArrowRight, IndianRupee, MapPin, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { selectHomeMandiPreview, type MandiPrice, getCropImage, getCropSvgFallback } from "@/lib/mandi-api";

export interface MandiPreviewProps {
  items: MandiPrice[];
  loading: boolean;
  error: string | null;
  onOpen: () => void;
  onRetry: () => void;
}

/**
 * "Today's Mandi" — compact preview band on the Home page.
 * Uses real daily AGMARKNET data, prioritized staple crops, truthful dates, and crop images.
 */
export const MandiPreview: React.FC<MandiPreviewProps> = ({ items, loading, error, onOpen, onRetry }) => {
  const { t, language } = useLanguage();
  const visible = selectHomeMandiPreview(items, 6);

  const cropName = (p: MandiPrice) => (language === "hi" && p.cropHi ? p.cropHi : p.crop);

  const formatUnit = (unitStr: string) => {
    if (!unitStr) return "/ quintal";
    const clean = unitStr.replace(/^₹\/?\s*/i, "").trim();
    return `/ ${clean.toLowerCase()}`;
  };

  const arrivalDate = visible[0]?.arrivalDate && visible[0].arrivalDate !== "Not available"
    ? visible[0].arrivalDate
    : undefined;

  return (
    <section aria-labelledby="mandi-preview-heading">
      <div className="band-mandi rounded-2xl px-4 py-5 md:px-5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 id="mandi-preview-heading" className="flex items-center gap-2.5 text-[19px] font-bold tracking-tight text-foreground">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-600 animate-live-ring" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
            </span>
            {t("home.todayMandi")}
          </h2>
          <button
            onClick={onOpen}
            className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-primary transition-colors hover:text-primary/80"
          >
            {t("home.viewMore")}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>

        {/* Truthful status & date header (Part 10) */}
        <p className="mt-1 flex items-center gap-1.5 pl-5 type-meta text-muted-foreground">
          <span className="font-semibold text-emerald-700">
            {arrivalDate ? `Latest update: ${arrivalDate}` : "Verified AGMARKNET rates"}
          </span>
          <span aria-hidden="true">·</span>
          <span>APMC Mandi</span>
        </p>

        {loading ? (
          /* Lightweight Skeleton Loader (Part 15) */
          <div className="no-scrollbar -mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-1">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="flex w-[180px] shrink-0 flex-col rounded-xl border border-border/60 bg-card/60 p-3.5 shadow-soft animate-pulse"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-20 rounded bg-muted" />
                    <div className="h-2.5 w-14 rounded bg-muted" />
                  </div>
                </div>
                <div className="mt-3 h-5 w-24 rounded bg-muted" />
                <div className="mt-2 h-3 w-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : visible.length > 0 ? (
          <div className="no-scrollbar -mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
            {visible.map((p) => {
              const hasChange = Boolean(p.change && p.change.trim() && p.change !== "0%");
              const up = p.status === "up";
              const down = p.status === "down";
              const belowMsp = p.msp != null && p.price < p.msp;
              const imgSrc = p.cropImage || getCropImage(p.crop) || getCropSvgFallback(p.crop);

              return (
                <button
                  key={p.id}
                  onClick={onOpen}
                  className={cn(
                    "flex w-[185px] shrink-0 snap-start flex-col rounded-xl border bg-card p-3.5 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98]",
                    belowMsp ? "border-amber-500/50" : "border-border/60",
                  )}
                >
                  {/* Crop Image & Commodity Name (Part 13) */}
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={imgSrc}
                      alt={cropName(p)}
                      className="h-9 w-9 rounded-lg object-cover shrink-0 border border-border/40 bg-muted"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getCropSvgFallback(p.crop);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="type-small font-bold text-foreground truncate block leading-tight">
                        {cropName(p)}
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground truncate block mt-0.5">
                        {p.district || p.state}
                      </span>
                    </div>
                  </div>

                  {/* Price & Unit (Part 5) */}
                  <div className="mt-1 flex items-baseline gap-0.5 text-foreground">
                    <IndianRupee size={15} className="translate-y-px" aria-hidden="true" />
                    <span className="type-num text-2xl font-extrabold leading-none">
                      {p.price.toLocaleString("en-IN")}
                    </span>
                    <span className="type-meta text-muted-foreground ml-0.5 font-normal">
                      {formatUnit(p.unit)}
                    </span>
                  </div>

                  {/* Market APMC */}
                  <span className="mt-1.5 flex items-center gap-1 type-meta text-muted-foreground truncate">
                    <MapPin size={11} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">{p.market}</span>
                  </span>

                  {/* Price Change & MSP Badge (Part 12) */}
                  {(hasChange || belowMsp) && (
                    <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-1.5">
                      {hasChange ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 type-meta font-bold",
                            up ? "text-emerald-700" : down ? "text-rose-700" : "text-muted-foreground",
                          )}
                        >
                          {up && <TrendingUp size={12} aria-hidden="true" />}
                          {down && <TrendingDown size={12} aria-hidden="true" />}
                          {p.change}
                        </span>
                      ) : (
                        <span />
                      )}
                      {belowMsp && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-800">
                          {t("home.belowMsp")}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Error State (Part 14) */
          <div className="mt-4 rounded-xl border border-border bg-card p-4 text-center">
            <p className="type-small font-semibold text-foreground">
              {error ? error : "Today's mandi data is not available yet."}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <RefreshCw size={13} aria-hidden="true" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={onOpen}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                {t("home.viewMore")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MandiPreview;

