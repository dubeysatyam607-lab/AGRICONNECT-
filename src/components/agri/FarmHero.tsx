import React from "react";
import { Sprout, ArrowRight, Mic, CloudSun, Droplets, Layers, MapPin, Leaf } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface FarmHeroProps {
  dateStr: string;
  greeting: string;
  firstName: string;
  cropLabel: string;
  farmTag: string;
  adviceLine: string;
  onAsk: () => void;
  onOpenFarm: () => void;
  /** Real optional context — only rendered when a value actually exists. */
  weatherChip?: { temp: string; condition: string };
  mandiChip?: { crop: string; price: string };
}

/**
 * FarmHero — AgriConnect's opening statement.
 *
 * A premium light composition: warm paper backdrop, deep-ink agriculture
 * type, and the living farm — a large, rounded field visualization that is
 * pure CSS animation (no WebGL, cannot throw at runtime). Real farm state
 * (crop, stage, soil) is surfaced as restrained instrument chips only when
 * that data actually exists. Reduced-motion disables all animation.
 */
export const FarmHero: React.FC<FarmHeroProps> = ({
  dateStr,
  greeting,
  firstName,
  cropLabel,
  farmTag,
  adviceLine,
  onAsk,
  onOpenFarm,
  weatherChip,
  mandiChip,
}) => {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="farm-hero-heading" className="mt-6">
      <div className="relative overflow-hidden rounded-3xl border border-forest/10 bg-gradient-to-br from-[#fdfcf7] via-[#f6faf3] to-[#edf7ee] shadow-card">
        {/* soft field tint — left vignette */}
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#22C55E]/10 blur-3xl"
          aria-hidden="true"
        />
        {/* warm sun wash — right */}
        <div
          className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-[#F59E0B]/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
          {/* ── LEFT — the farmer's morning brief ─────────────────── */}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-white/70 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              <span className="type-meta text-[11.5px] font-bold uppercase tracking-[0.16em] text-forest">
                {dateStr}
              </span>
            </div>

            <h1
              id="farm-hero-heading"
              className="mt-4 font-display text-[30px] font-bold leading-[1.12] tracking-tight text-[#111827] md:text-[44px]"
            >
              {greeting}{" "}
              <span className="text-primary">{firstName}</span>
            </h1>

            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-forest/80">
              <CloudSun size={15} aria-hidden="true" />
              {cropLabel ? "Field Watch · live to your farm" : "Your farm, in one place"}
            </p>

            {(cropLabel || farmTag) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {cropLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[12.5px] font-bold text-white shadow-sm">
                    <Sprout size={13} aria-hidden="true" />
                    {cropLabel}
                  </span>
                )}
                {farmTag && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-white/80 px-3 py-1 text-[12.5px] font-bold text-forest">
                    <Layers size={13} aria-hidden="true" />
                    {farmTag}
                  </span>
                )}
              </div>
            )}

            {adviceLine && (
              <div className="mt-5 rounded-2xl border border-marigold/30 bg-marigold/10 p-4">
                <p className="text-[14px] font-semibold leading-relaxed text-ink md:text-[15px]">
                  {adviceLine}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={onAsk}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-6 text-[14px] font-bold text-white shadow-md transition-transform hover:brightness-105 active:scale-[0.97]"
              >
                <Mic size={16} aria-hidden="true" />
                {t("home.kisanSaathiAsk")}
              </button>
              <button
                onClick={onOpenFarm}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-forest/20 bg-white/60 px-5 text-[14px] font-bold text-forest transition-colors hover:bg-white"
              >
                {t("home.planToday")}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ── RIGHT — the living farm ───────────────────────────── */}
          <div
            aria-hidden="true"
            className="relative h-48 w-full rounded-3xl border border-forest/10 shadow-soft sm:h-56 lg:h-[21rem]"
          >
            {/* sky */}
            <div className="absolute inset-x-0 top-0 h-2/5 rounded-t-3xl bg-gradient-to-b from-sky-100 via-[#e8f4ea] to-transparent" />
            {/* soft sun */}
            <div className="absolute right-8 top-6 h-16 w-16 rounded-full bg-[#FDE68A]/70 blur-sm" />
            {/* far field rows */}
            <div className="absolute inset-x-0 bottom-0 h-3/4 rounded-b-3xl bg-gradient-to-t from-[#5b4026] via-[#8a6b45] to-[#b0926b]" />
            {/* drifting crop rows — the wind line */}
            <div
              className="animate-crop-row-drift absolute inset-x-0 bottom-0 h-3/5"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(87deg, hsl(136 100% 24% / 0.14) 0 2px, transparent 2px 16px), repeating-linear-gradient(93deg, hsl(136 100% 24% / 0.08) 0 1px, transparent 1px 16px)",
              }}
            />
            {/* foreground crop silhouette — brand-tinted */}
            <div
              className="absolute inset-x-0 bottom-0 h-1/2"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(15,81,50,0) 0 20px, rgba(15,81,50,0.30) 20px 24px, rgba(34,197,94,0.28) 24px 30px), repeating-linear-gradient(90deg, rgba(15,81,50,0.12) 0 90px, transparent 90px 180px)",
              }}
            />
            {/* breathing field boundary */}
            <div className="animate-field-boundary absolute inset-4 rounded-2xl border border-primary/70" />
            {/* scan band */}
            <div className="animate-field-scan absolute inset-x-5 h-px bg-[#0F5132]/40" />

            {/* instrument chips — real crop/farm data only */}
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              {cropLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11.5px] font-bold text-forest shadow-sm backdrop-blur-sm">
                  <Leaf size={12} className="text-primary" aria-hidden="true" />
                  {cropLabel}
                </span>
              )}
              {farmTag && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11.5px] font-bold text-forest shadow-sm backdrop-blur-sm">
                  <MapPin size={12} className="text-primary" aria-hidden="true" />
                  {farmTag}
                </span>
              )}
            </div>
            <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-2">
              {weatherChip && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                  <CloudSun size={11} aria-hidden="true" />
                  {weatherChip.condition} · {weatherChip.temp}
                </span>
              )}
              {mandiChip && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                  <Droplets size={11} aria-hidden="true" />
                  {mandiChip.crop} · ₹{mandiChip.price}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FarmHero;