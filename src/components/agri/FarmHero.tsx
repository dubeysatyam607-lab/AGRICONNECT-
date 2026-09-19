import React from "react";
import { Sprout, ArrowRight, Mic } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

import Hero3D from "@/components/home/Hero3D";

export interface FarmHeroProps {
  dateStr: string;
  greeting: string;
  firstName: string;
  cropLabel: string;
  farmTag: string;
  adviceLine: string;
  onAsk: () => void;
  onOpenFarm: () => void;
}

/**
 * Farm hero — the welcome band. Deep field green with a warm greeting, the
 * farmer's crop chip and the day's single-line advice, front and centre.
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
}) => {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="farm-hero-heading" className="mt-6">
      <div className="band-forest pattern-green relative overflow-hidden rounded-2xl px-5 py-6 text-primary-foreground shadow-card md:px-7">
        {/* Drifting crop rows — the field reads as alive, never static.
            Rows are wider than the band and slide slowly inside the
            overflow-hidden edge, so the crop texture moves, not the text. */}
        <span
          aria-hidden="true"
          className="animate-crop-row-drift pointer-events-none absolute inset-y-0 -left-12 w-[118%]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(87deg, hsl(136 100% 96% / 0.13) 0 2px, transparent 2px 27px), repeating-linear-gradient(93deg, hsl(136 100% 96% / 0.07) 0 1px, transparent 1px 27px)",
          }}
        />
        <span
          className="pointer-events-none absolute -top-16 -left-10 h-48 w-48 rounded-full bg-marigold/15 blur-3xl"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-20 right-10 h-52 w-52 rounded-full bg-emerald-300/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="type-meta font-bold uppercase tracking-[0.14em] text-white/70">{dateStr}</p>

            <h1
              id="farm-hero-heading"
              className="mt-2 font-display text-[26px] font-normal leading-snug tracking-tight text-white md:text-[32px]"
            >
              {greeting}, {firstName}
            </h1>

            {(cropLabel || farmTag) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {cropLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12.5px] font-bold text-white">
                    <Sprout size={13} aria-hidden="true" />
                    {cropLabel}
                  </span>
                )}
                {farmTag && (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[12.5px] font-bold text-white/90">
                    {farmTag}
                  </span>
                )}
              </div>
            )}

            {adviceLine && (
              <p className="mt-3 max-w-[34rem] text-[14px] font-semibold leading-relaxed text-white/85">
                {adviceLine}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                onClick={onAsk}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-marigold px-5 text-[14px] font-bold text-emerald-950 shadow-sm transition-transform active:scale-[0.97]"
              >
                <Mic size={16} aria-hidden="true" />
                {t("home.kisanSaathiAsk")}
              </button>
              <button
                onClick={onOpenFarm}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-white/15 px-4 text-[14px] font-bold text-white transition-colors hover:bg-white/25"
              >
                {t("home.planToday")}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Living farm 3D vignette */}
          <div className="relative hidden h-40 w-40 shrink-0 md:block" aria-hidden="true">
            <Hero3D />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FarmHero;