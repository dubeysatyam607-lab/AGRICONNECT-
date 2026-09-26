import React, { useRef, useState, useCallback } from "react";
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
  weatherChip?: { temp: string; condition: string };
  mandiChip?: { crop: string; price: string };
}

/**
 * FarmHero — AgriConnect's opening command center.
 * Accessible, responsive, editorial agricultural hero.
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
      aria-labelledby="farm-hero-greeting"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mt-3 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7 md:p-8"
    >
      <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-8">
        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col justify-center">
          {/* Contextual Date & Status Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0F5132]/15 bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0F5132] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#00C26E] animate-live-pulse" aria-hidden="true" />
              {dateStr}
            </span>

            {weatherChip && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 shadow-xs">
                <Sun size={13} className="text-amber-600" aria-hidden="true" />
                {weatherChip.condition} · {weatherChip.temp}
              </span>
            )}

            {mandiChip && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-xs">
                <TrendingUp size={13} className="text-[#00C26E]" aria-hidden="true" />
                {mandiChip.crop} · ₹{mandiChip.price}
              </span>
            )}
          </div>

          {/* Balanced Greeting & User Name (Fixes Issue 13 & 18) */}
          <div className="mt-3">
            <p id="farm-hero-greeting" className="text-lg font-bold text-[#0F5132]">
              {greeting.trim()}, <span className="text-xl font-extrabold text-[#0F5132]">{firstName}</span>
            </p>
          </div>

          {/* Farm Context Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F5132]/15 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#0F5132] shadow-xs">
              <Sprout size={14} className="text-[#00C26E]" aria-hidden="true" />
              <span>{cropLabel || t("home.farmTitle")}</span>
            </div>

            {farmTag && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F5132]/15 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#0F5132] shadow-xs">
                <Layers size={14} className="text-[#00C26E]" aria-hidden="true" />
                <span>{farmTag}</span>
              </div>
            )}
          </div>

          {/* Dynamic AI Advisory Brief */}
          {adviceLine && (
            <div className="mt-4 rounded-xl border-l-4 border-[#00C26E] border-y border-r border-emerald-900/10 bg-white/90 p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F5132]">
                <Sprout size={14} className="text-[#00C26E]" aria-hidden="true" />
                <span>{t("home.planToday") || "Today's Field Intelligence"}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[#111827]">
                {adviceLine}
              </p>
            </div>
          )}

          {/* Hero CTAs */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onAsk}
              type="button"
              className="group inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0F5132] px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#064E3B] active:scale-[0.98]"
            >
              <Mic size={16} aria-hidden="true" />
              <span>{t("home.kisanSaathiAsk") || "Ask Kisan Saathi"}</span>
            </button>

            <button
              onClick={onOpenFarm}
              type="button"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#0F5132]/25 bg-white/80 px-4 text-sm font-bold text-[#0F5132] transition-all hover:bg-white active:scale-[0.98]"
            >
              <span>{t("home.planToday") || "Plan today's field work"}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN — Dynamic 3D Scene ──────── */}
        <div className="relative flex h-full min-h-[260px] w-full flex-col overflow-hidden rounded-2xl border border-[#0F5132]/15 bg-gradient-to-b from-[#FEF6E4]/40 to-[#EBF5ED]/40 shadow-inner sm:min-h-[300px]">
          <Hero3D mousePos={mousePos} weatherCondition={weatherCond} cropLabel={cropLabel} />
        </div>
      </div>
    </section>
  );
};

export default FarmHero;