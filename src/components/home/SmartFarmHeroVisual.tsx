import React, { useState, useEffect } from "react";
import { Sprout, Sun, Cpu, ShieldCheck, Activity, Droplets, Thermometer } from "lucide-react";

export interface SmartFarmHeroVisualProps {
  mousePos?: { x: number; y: number };
  weatherCondition?: string;
}

export const SmartFarmHeroVisual: React.FC<SmartFarmHeroVisualProps> = ({
  mousePos = { x: 0, y: 0 },
  weatherCondition = "",
}) => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      try {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setIsReducedMotion(!!mediaQuery?.matches);
        const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener("change", handler);
          return () => mediaQuery.removeEventListener("change", handler);
        }
      } catch {
        // Fallback
      }
    }
  }, []);

  // Parallax transform calculations based on cursor position
  const parallaxX = !isReducedMotion ? mousePos.x * 12 : 0;
  const parallaxY = !isReducedMotion ? mousePos.y * 8 : 0;

  return (
    <div
      className="relative flex h-full min-h-[260px] w-full flex-col overflow-hidden bg-emerald-950 sm:min-h-[300px] lg:min-h-[360px]"
      aria-hidden="true"
    >
      {/* ── 1. CINEMATIC PHOTOREALISTIC INDIAN AGRICULTURAL FIELD LAYER ──────── */}
      <div
        className={`absolute inset-0 transition-transform duration-1000 ease-out ${
          !isReducedMotion ? "animate-slow-hero-pan" : ""
        }`}
        style={{
          transform: `scale(1.08) translate3d(${parallaxX}px, ${parallaxY}px, 0)`,
        }}
      >
        <img
          src="/images/smart-farm-hero.jpg"
          alt="Smart Farm Indian Agriculture"
          onLoad={() => setImgLoaded(true)}
          className={`h-full w-full object-cover object-bottom transition-opacity duration-700 ${
            imgLoaded ? "opacity-100" : "opacity-90"
          }`}
        />
        {/* Soft morning golden sun flare vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-transparent to-amber-500/15 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/30 via-transparent to-amber-400/20" />
      </div>

      {/* ── 2. SUNRISE LIGHTING ATMOSPHERE SWEEP (LOOPING) ──────────────────── */}
      {!isReducedMotion && (
        <div className="animate-sunlight-sweep pointer-events-none absolute -left-1/4 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-amber-300/15 to-transparent blur-2xl" />
      )}

      {/* ── 3. SMART CROP SCANNING LASER BEAM (6–10s SEAMLESS LOOP) ───────── */}
      {!isReducedMotion && (
        <div className="animate-crop-scan-beam pointer-events-none absolute inset-x-0 z-10 h-28 bg-gradient-to-b from-transparent via-[#00C26E]/20 to-transparent">
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#00C26E] to-transparent shadow-[0_0_15px_#00C26E]" />
        </div>
      )}

      {/* ── 4. AGRI-CONNECT TELEMETRY NODES & FLOATING DATA POINTS ──────────── */}
      {/* Target Node 1 — Crop Moisture & NPK (Bottom Left Crop Row) */}
      <div
        className="absolute bottom-[24%] left-[12%] z-20 transition-transform duration-700"
        style={{ transform: `translate3d(${parallaxX * 0.5}px, ${parallaxY * 0.5}px, 0)` }}
      >
        <div className="relative flex items-center gap-2">
          {/* Target Ring Pulse */}
          <div className="relative flex h-5 w-5 items-center justify-center">
            <span className={`absolute h-full w-full rounded-full bg-[#00C26E] opacity-75 ${!isReducedMotion ? "animate-ping" : ""}`} />
            <span className="h-2 w-2 rounded-full bg-[#00C26E] shadow-[0_0_8px_#00C26E]" />
          </div>

          {/* Connection Line */}
          <div className="hidden sm:block h-px w-6 bg-gradient-to-r from-[#00C26E] to-white/40" />

          {/* Data Badge */}
          <div className="rounded-xl border border-white/20 bg-emerald-950/75 px-3 py-1.5 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300">
              <Droplets size={12} className="text-[#00C26E]" />
              <span>Soil Moisture · 48%</span>
            </div>
            <p className="text-[9.5px] font-semibold text-emerald-100/80">NPK: Optimal · Depth 15cm</p>
          </div>
        </div>
      </div>

      {/* Target Node 2 — Crop Health & Growth Stage (Mid Field Right) */}
      <div
        className="absolute bottom-[44%] right-[16%] z-20 transition-transform duration-700"
        style={{ transform: `translate3d(${parallaxX * 0.3}px, ${parallaxY * 0.3}px, 0)` }}
      >
        <div className="relative flex items-center gap-2">
          {/* Data Badge */}
          <div className="rounded-xl border border-white/20 bg-emerald-950/75 px-3 py-1.5 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300">
              <Sprout size={12} className="text-amber-400" />
              <span>Flowering Stage · Health 98%</span>
            </div>
            <p className="text-[9.5px] font-semibold text-emerald-100/80">Chlorophyll Index: High</p>
          </div>

          {/* Connection Line */}
          <div className="hidden sm:block h-px w-6 bg-gradient-to-r from-white/40 to-[#00C26E]" />

          {/* Target Ring Pulse */}
          <div className="relative flex h-5 w-5 items-center justify-center">
            <span className={`absolute h-full w-full rounded-full bg-amber-400 opacity-75 ${!isReducedMotion ? "animate-ping" : ""}`} />
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#FBBF24]" />
          </div>
        </div>
      </div>

      {/* ── 5. TOP STATUS HUD CHIP ─────────────────────────────────────────── */}
      <div className="absolute left-4 top-4 z-30 flex items-center gap-2.5 rounded-xl border border-white/20 bg-emerald-950/80 px-3.5 py-1.5 shadow-md backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute h-full w-full rounded-full bg-[#00C26E] opacity-75 ${!isReducedMotion ? "animate-ping" : ""}`} />
          <span className="relative h-2.5 w-2.5 rounded-full bg-[#00C26E]" />
        </span>
        <div className="flex items-center gap-2 text-[11.5px] font-bold text-white">
          <Cpu size={13} className="text-[#00C26E]" />
          <span className="tracking-wide">AGRICCONNECT FIELD AI</span>
          <span className="hidden sm:inline-block rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase text-emerald-300">
            Live
          </span>
        </div>
      </div>

      {/* ── 6. BOTTOM TELEMETRY SUMMARY CHIP ──────────────────────────────── */}
      <div className="absolute bottom-4 left-4 z-30 hidden md:flex items-center gap-3 rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-white/90 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-1 text-emerald-300">
          <Activity size={13} />
          <span>Real-time Field Scan</span>
        </div>
        <span className="text-white/30">•</span>
        <div className="flex items-center gap-1 text-amber-300">
          <Thermometer size={13} />
          <span>27°C Ambient</span>
        </div>
        <span className="text-white/30">•</span>
        <div className="flex items-center gap-1 text-emerald-300">
          <ShieldCheck size={13} />
          <span>Zero Disease Risk</span>
        </div>
      </div>
    </div>
  );
};

export default SmartFarmHeroVisual;
