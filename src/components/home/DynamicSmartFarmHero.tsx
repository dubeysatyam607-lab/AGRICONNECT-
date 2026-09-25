import React, { useState, useEffect, useMemo } from "react";
import { Sprout, Sun, Moon, Droplets, Wheat, Cloud } from "lucide-react";

export interface DynamicSmartFarmHeroProps {
  mousePos?: { x: number; y: number };
  weatherCondition?: string;
  cropLabel?: string;
}

type TimePeriod = "morning" | "day" | "evening" | "night";

export const DynamicSmartFarmHero: React.FC<DynamicSmartFarmHeroProps> = ({
  mousePos = { x: 0, y: 0 },
  weatherCondition = "",
  cropLabel = "",
}) => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());

  // Keep hour in sync periodically
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Check prefers-reduced-motion
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

  // 1. Determine Time Period
  const timePeriod: TimePeriod = useMemo(() => {
    if (currentHour >= 5 && currentHour < 11) return "morning";
    if (currentHour >= 11 && currentHour < 17) return "day";
    if (currentHour >= 17 && currentHour < 20) return "evening";
    return "night";
  }, [currentHour]);

  // 2. Select Crop Asset & Details
  const cropData = useMemo(() => {
    const c = cropLabel.toLowerCase();
    if (c.includes("wheat") || c.includes("gehun")) {
      return {
        name: "Wheat (गेहूं)",
        image: "/images/wheat-smart-farm.jpg",
        icon: Wheat,
        stage: "Tillering Stage",
        moisture: "42%",
      };
    }
    if (c.includes("rice") || c.includes("paddy") || c.includes("dhan")) {
      return {
        name: "Paddy Rice (धान)",
        image: "/images/paddy-smart-farm.jpg",
        icon: Sprout,
        stage: "Vegetative Stage",
        moisture: "78%",
      };
    }
    return {
      name: cropLabel || "Soybean (सोयाबीन)",
      image: "/images/smart-farm-hero.jpg",
      icon: Sprout,
      stage: "Flowering Stage",
      moisture: "48%",
    };
  }, [cropLabel]);

  // 3. Multi-Layer Parallax Offsets
  const bgParallaxX = !isReducedMotion ? mousePos.x * 4 : 0;
  const bgParallaxY = !isReducedMotion ? mousePos.y * 3 : 0;
  const fgParallaxX = !isReducedMotion ? mousePos.x * 10 : 0;
  const fgParallaxY = !isReducedMotion ? mousePos.y * 6 : 0;

  return (
    <div
      className="relative flex h-full min-h-[280px] sm:min-h-[320px] lg:min-h-[350px] max-h-[380px] w-full flex-col overflow-hidden bg-gradient-to-b from-[#EBF5ED] via-[#F4F9F2] to-[#FBF8F1]"
      aria-hidden="true"
    >
      {/* ── LAYER 1: BASE CROP FIELD IMAGE WITH SLOW NATURAL PAN ────────── */}
      <div
        className={`absolute inset-0 transition-transform duration-1000 ease-out ${
          !isReducedMotion ? "animate-slow-hero-pan" : ""
        }`}
        style={{
          transform: `scale(1.08) translate3d(${bgParallaxX}px, ${bgParallaxY}px, 0)`,
        }}
      >
        <img
          src={cropData.image}
          alt={cropData.name}
          onLoad={() => setImgLoaded(true)}
          className={`h-full w-full object-cover object-bottom transition-opacity duration-700 ${
            imgLoaded ? "opacity-95" : "opacity-80"
          }`}
        />
      </div>

      {/* ── LAYER 2: NATURAL TIME-OF-DAY SUNLIGHT & SKY ATMOSPHERE ──────── */}
      {timePeriod === "morning" && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-amber-900/20 via-amber-400/10 to-amber-100/30 mix-blend-overlay">
          {/* Warm Morning Sun Glow */}
          <div className="absolute right-4 top-2 h-44 w-44 rounded-full bg-[#F7D774]/35 blur-3xl animate-sun-glow" />
        </div>
      )}

      {timePeriod === "day" && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-emerald-950/15 via-transparent to-sky-300/15" />
      )}

      {timePeriod === "evening" && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-orange-950/40 via-amber-600/15 to-rose-300/20 mix-blend-overlay">
          <div className="absolute right-6 top-0 h-40 w-40 rounded-full bg-orange-400/30 blur-2xl" />
        </div>
      )}

      {timePeriod === "night" && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/75 via-emerald-950/45 to-indigo-950/60">
          <div className="absolute right-8 top-5 h-9 w-9 rounded-full bg-amber-100/90 shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
        </div>
      )}

      {/* ── LAYER 3: DRIFTING SOFT NATURAL CLOUDS ───────────────────────── */}
      {!isReducedMotion && (
        <div className="absolute inset-x-0 top-1 h-20 pointer-events-none overflow-hidden opacity-60">
          {/* Cloud 1 (Slow) */}
          <div className="absolute top-2 animate-cloud-drift-slow">
            <Cloud size={32} className="text-white/80 fill-white/50 blur-[0.5px]" />
          </div>
          {/* Cloud 2 (Mid speed) */}
          <div className="absolute top-6 animate-cloud-drift-mid" style={{ animationDelay: "12s" }}>
            <Cloud size={24} className="text-amber-50/70 fill-amber-50/40 blur-[0.5px]" />
          </div>
        </div>
      )}

      {/* ── LAYER 4: NATURAL WIND WAVE PASSING ACROSS CROP FIELD ────────── */}
      {!isReducedMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {/* Wind Wave Light Sweeping Overlay */}
          <div className="animate-wind-wave absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-emerald-100/25 to-transparent blur-xl" />
        </div>
      )}

      {/* ── LAYER 5: FOREGROUND SWAYING CROP LEAF CLUSTERS (SWAYING IN WIND) ── */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 pointer-events-none transition-transform duration-700"
        style={{
          transform: `translate3d(${fgParallaxX}px, ${fgParallaxY}px, 0)`,
        }}
      >
        <svg
          viewBox="0 0 800 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-24 sm:h-28 lg:h-32 object-cover object-bottom"
        >
          {/* Soil Ground Line Base */}
          <path
            d="0 140 Q 200 130 400 138 T 800 135 L 800 160 L 0 160 Z"
            fill="#3B2615"
            fillOpacity="0.4"
          />

          {/* Plant Cluster 1 (Left Field Edge) */}
          <g className={!isReducedMotion ? "animate-leaf-sway" : ""}>
            <path
              d="M 40 140 Q 30 90 10 70 Q 35 85 45 140 Z"
              fill="#15803D"
              fillOpacity="0.85"
            />
            <path
              d="M 42 140 Q 60 80 80 65 Q 65 95 45 140 Z"
              fill="#166534"
              fillOpacity="0.9"
            />
            <path
              d="M 45 140 Q 45 60 30 40 Q 55 65 48 140 Z"
              fill="#22C55E"
              fillOpacity="0.75"
            />
          </g>

          {/* Plant Cluster 2 (Mid-Left Field) */}
          <g
            className={!isReducedMotion ? "animate-leaf-sway" : ""}
            style={{ animationDelay: "1.1s" }}
          >
            <path
              d="M 220 142 Q 200 85 180 60 Q 210 80 225 142 Z"
              fill="#166534"
              fillOpacity="0.85"
            />
            <path
              d="M 225 142 Q 245 75 270 55 Q 245 90 228 142 Z"
              fill="#15803D"
              fillOpacity="0.9"
            />
          </g>

          {/* Plant Cluster 3 (Mid-Right Field) */}
          <g
            className={!isReducedMotion ? "animate-leaf-sway" : ""}
            style={{ animationDelay: "2.3s" }}
          >
            <path
              d="M 580 140 Q 560 80 535 50 Q 570 75 585 140 Z"
              fill="#15803D"
              fillOpacity="0.85"
            />
            <path
              d="M 585 140 Q 610 70 635 55 Q 610 90 588 140 Z"
              fill="#166534"
              fillOpacity="0.9"
            />
          </g>

          {/* Plant Cluster 4 (Right Field Edge) */}
          <g
            className={!isReducedMotion ? "animate-leaf-sway" : ""}
            style={{ animationDelay: "3.2s" }}
          >
            <path
              d="M 740 145 Q 720 90 695 70 Q 730 90 745 145 Z"
              fill="#166534"
              fillOpacity="0.85"
            />
            <path
              d="M 745 145 Q 770 85 790 65 Q 770 100 748 145 Z"
              fill="#22C55E"
              fillOpacity="0.75"
            />
          </g>
        </svg>
      </div>

      {/* ── LAYER 6: SPARSE NATURAL POLLEN / DUST PARTICLES ──────────────── */}
      {!isReducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <div
            className="animate-pollen absolute left-[20%] bottom-[35%] h-1.5 w-1.5 rounded-full bg-amber-300/60 blur-[0.4px]"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="animate-pollen absolute left-[45%] bottom-[45%] h-1 w-1 rounded-full bg-emerald-200/60 blur-[0.4px]"
            style={{ animationDelay: "2.1s" }}
          />
          <div
            className="animate-pollen absolute right-[30%] bottom-[30%] h-1.5 w-1.5 rounded-full bg-amber-200/60 blur-[0.4px]"
            style={{ animationDelay: "4.3s" }}
          />
          <div
            className="animate-pollen absolute right-[15%] bottom-[50%] h-1 w-1 rounded-full bg-white/70 blur-[0.4px]"
            style={{ animationDelay: "6.2s" }}
          />
        </div>
      )}

      {/* ── LAYER 7: ORGANIC QUIET CROP STATUS BADGES (HUMAN DESIGNED) ──── */}
      {/* Top Left: Crop Name */}
      <div className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-lg border border-emerald-900/15 bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-[#00C26E]" />
        <span className="text-[11px] font-extrabold text-[#0F5132] tracking-wide">{cropData.name}</span>
      </div>

      {/* Bottom Left: Soil Moisture */}
      <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-lg border border-emerald-900/15 bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-md">
        <Droplets size={12} className="text-[#00C26E]" />
        <span className="text-[10.5px] font-bold text-[#0F5132]">Soil Moisture &bull; {cropData.moisture}</span>
      </div>

      {/* Bottom Right: Growth Stage */}
      <div className="absolute bottom-3 right-3 z-30 hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-900/15 bg-amber-50/90 px-2.5 py-1 shadow-sm backdrop-blur-md">
        <Sprout size={12} className="text-amber-700" />
        <span className="text-[10.5px] font-bold text-amber-900">{cropData.stage}</span>
      </div>
    </div>
  );
};

export default DynamicSmartFarmHero;
