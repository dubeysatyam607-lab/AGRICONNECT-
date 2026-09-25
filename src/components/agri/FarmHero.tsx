import React, { useRef, useState, useCallback, useMemo } from "react";
import { Sprout, ArrowRight, Mic, Sun, Layers, MapPin, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Hero3D } from "@/components/home/Hero3D";

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
 * FarmHero — AgriConnect's opening command center.
 *
 * An unconfined, editorial agricultural experience where the living 3D field
 * (soybean crop, cultivated soil furrows, Indian farmer inspecting crops)
 * blends directly into the command dashboard. Responsive mouse parallax,
 * multi-tier WebGL fallback, i18n localization, and instant usability.
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
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse move handler for subtle 3D camera parallax
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setMousePos({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos({ x: 0, y: 0 });
  }, []);

  const weatherCond = weatherChip?.condition || "";

  return (
    <section
      ref={heroRef}
      aria-labelledby="farm-hero-heading"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mt-3 overflow-hidden rounded-[28px] border border-[#0F5132]/12 bg-gradient-to-br from-[#FBF8F1] via-[#F4F9F2] to-[#EBF5ED] p-5 shadow-[0_20px_50px_-20px_rgba(15,81,50,0.12)] sm:p-7 md:p-8"
    >
      {/* Subtle agricultural background ambient glows */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#FEF3C7]/60 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 top-1/3 h-96 w-96 rounded-full bg-[#00C26E]/8 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-8">
        {/* ── LEFT COLUMN — Editorial Farmer Command Brief ─────────────── */}
        <div className="flex flex-col justify-center">
          {/* Contextual Date & Status Line */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0F5132]/15 bg-white/80 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#0F5132] shadow-xs backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-[#00C26E] animate-live-pulse" aria-hidden="true" />
              {dateStr}
            </span>

            {weatherChip && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-[11.5px] font-semibold text-amber-900 shadow-xs">
                <Sun size={12} className="text-amber-600" aria-hidden="true" />
                {weatherChip.condition} · {weatherChip.temp}
              </span>
            )}

            {mandiChip && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-[11.5px] font-semibold text-emerald-900 shadow-xs">
                <TrendingUp size={12} className="text-[#00C26E]" aria-hidden="true" />
                {mandiChip.crop} · ₹{mandiChip.price}
              </span>
            )}
          </div>

          {/* Greeting & Farmer Name */}
          <div className="mt-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#0F5132]/65 md:text-[13px]">
              {greeting.trim()}
            </p>
            <h1
              id="farm-hero-heading"
              className="mt-1 font-display text-4xl font-black tracking-tight text-[#0F5132] sm:text-5xl md:text-6xl"
            >
              {firstName}
            </h1>
          </div>

          {/* Farm Context Chips */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F5132]/15 bg-white/90 px-3 py-1.5 text-[13px] font-bold text-[#0F5132] shadow-xs">
              <Sprout size={14} className="text-[#00C26E]" aria-hidden="true" />
              <span>{cropLabel || t("home.farmTitle")}</span>
            </div>

            {farmTag && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F5132]/15 bg-white/90 px-3 py-1.5 text-[13px] font-bold text-[#0F5132] shadow-xs">
                <Layers size={14} className="text-[#00C26E]" aria-hidden="true" />
                <span>{farmTag}</span>
              </div>
            )}
          </div>

          {/* Dynamic AI Advisory Brief */}
          {adviceLine && (
            <div className="mt-5 rounded-2xl border-l-4 border-[#00C26E] border-y border-r border-emerald-900/10 bg-white/80 p-4 shadow-sm backdrop-blur-xs">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0F5132]">
                <Sprout size={13} className="text-[#00C26E]" aria-hidden="true" />
                <span>{t("home.planToday") || "Today's Field Intelligence"}</span>
              </div>
              <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-[#111827] md:text-[14.5px]">
                {adviceLine}
              </p>
            </div>
          )}

          {/* Hero CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onAsk}
              type="button"
              className="group inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-[#0F5132] px-6 text-[14px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(15,81,50,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#064E3B] hover:shadow-[0_14px_28px_-6px_rgba(15,81,50,0.6)] active:scale-[0.98]"
            >
              <Mic size={16} className="transition-transform group-hover:scale-110" aria-hidden="true" />
              <span>{t("home.kisanSaathiAsk") || "Ask Kisan Saathi"}</span>
            </button>

            <button
              onClick={onOpenFarm}
              type="button"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#0F5132]/25 bg-white/70 px-5 text-[14px] font-bold text-[#0F5132] transition-all duration-200 hover:border-[#0F5132]/50 hover:bg-white active:scale-[0.98]"
            >
              <span>{t("home.planToday") || "Plan today's field work"}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN — Dynamic Living Agricultural Scene Canvas ──────── */}
        <div className="relative flex h-full min-h-[280px] w-full flex-col overflow-hidden rounded-[24px] border border-[#0F5132]/15 bg-gradient-to-b from-[#FEF6E4]/40 to-[#EBF5ED]/40 shadow-inner sm:min-h-[340px] lg:min-h-[400px]">
          {/* Integrated Dynamic Agricultural Hero Scene Component */}
          <Hero3D mousePos={mousePos} weatherCondition={weatherCond} cropLabel={cropLabel} />
        </div>
      </div>
    </section>
  );
};

export default FarmHero;