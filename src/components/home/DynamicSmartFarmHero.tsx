import React, { useState, useEffect, useMemo } from "react";
import {
  Sprout, Sun, CloudRain, Zap, Cloud, CloudFog, Flame, Moon, Stars,
  Droplets, Cpu, ShieldCheck, Activity, Thermometer, Radio, Wheat, RefreshCw
} from "lucide-react";

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

  // Periodically keep hour in sync
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Listen for reduced motion preference
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

  // 1. Determine Time Period based on local device hour
  const timePeriod: TimePeriod = useMemo(() => {
    if (currentHour >= 5 && currentHour < 11) return "morning";
    if (currentHour >= 11 && currentHour < 17) return "day";
    if (currentHour >= 17 && currentHour < 20) return "evening";
    return "night";
  }, [currentHour]);

  // 2. Determine Weather Type
  const weatherType = useMemo(() => {
    const w = weatherCondition.toLowerCase();
    if (w.includes("thunder") || w.includes("storm")) return "thunderstorm";
    if (w.includes("rain") || w.includes("drizzle") || w.includes("shower")) return "rain";
    if (w.includes("fog") || w.includes("mist") || w.includes("haze")) return "fog";
    if (w.includes("cloud") || w.includes("overcast")) return "cloudy";
    if (w.includes("hot") || w.includes("sunny") || w.includes("warm")) return "hot";
    return "clear";
  }, [weatherCondition]);

  // 3. Select Crop Asset & Label
  const cropData = useMemo(() => {
    const c = cropLabel.toLowerCase();
    if (c.includes("wheat") || c.includes("gehun")) {
      return {
        name: "Wheat (Gehun)",
        image: "/images/wheat-smart-farm.jpg",
        icon: Wheat,
        stage: "Tillering / Heading",
        moisture: "42%",
      };
    }
    if (c.includes("rice") || c.includes("paddy") || c.includes("dhan")) {
      return {
        name: "Paddy Rice (Dhan)",
        image: "/images/paddy-smart-farm.jpg",
        icon: Sprout,
        stage: "Vegetative / Flooded",
        moisture: "85%",
      };
    }
    // Default: Soybean or Generic Healthy Crop
    return {
      name: cropLabel || "Soybean (Flowering)",
      image: "/images/smart-farm-hero.jpg",
      icon: Sprout,
      stage: "Flowering Stage",
      moisture: "48%",
    };
  }, [cropLabel]);

  // 4. Parallax Offset Calculation
  const parallaxX = !isReducedMotion ? mousePos.x * 12 : 0;
  const parallaxY = !isReducedMotion ? mousePos.y * 8 : 0;

  return (
    <div
      className="relative flex h-full min-h-[280px] w-full flex-col overflow-hidden bg-emerald-950 sm:min-h-[320px] lg:min-h-[380px]"
      aria-hidden="true"
    >
      {/* ── LAYER 1: BASE PHOTOREALISTIC INDIAN CROP FIELD IMAGE ────────── */}
      <div
        className={`absolute inset-0 transition-transform duration-1000 ease-out ${
          !isReducedMotion ? "animate-slow-hero-pan" : ""
        }`}
        style={{
          transform: `scale(1.08) translate3d(${parallaxX}px, ${parallaxY}px, 0)`,
        }}
      >
        <img
          src={cropData.image}
          alt={cropData.name}
          onLoad={() => setImgLoaded(true)}
          className={`h-full w-full object-cover object-bottom transition-opacity duration-700 ${
            imgLoaded ? "opacity-100" : "opacity-90"
          }`}
        />
      </div>

      {/* ── LAYER 2: DYNAMIC TIME-OF-DAY OVERLAYS ───────────────────────── */}
      {/* Morning: Sunrise Golden Light Flare */}
      {timePeriod === "morning" && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-amber-900/35 via-amber-500/15 to-amber-200/20 mix-blend-overlay">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-amber-400/35 blur-3xl animate-pulse-slow" />
        </div>
      )}

      {/* Day: Bright Natural Daylight */}
      {timePeriod === "day" && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-emerald-950/25 via-transparent to-sky-400/15" />
      )}

      {/* Evening: Golden Hour Sunset Sky */}
      {timePeriod === "evening" && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-orange-950/60 via-amber-600/25 to-rose-400/30 mix-blend-overlay">
          <div className="absolute right-10 top-0 h-48 w-48 rounded-full bg-orange-500/40 blur-3xl" />
        </div>
      )}

      {/* Night: Deep Twilight Sky & Twinkling Stars */}
      {timePeriod === "night" && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/85 via-emerald-950/60 to-indigo-950/80">
          {!isReducedMotion && (
            <div className="absolute inset-0 opacity-80">
              <div className="absolute left-[15%] top-[12%] h-1 w-1 rounded-full bg-white animate-twinkle" />
              <div className="absolute left-[35%] top-[8%] h-1.5 w-1.5 rounded-full bg-white/90 animate-twinkle" />
              <div className="absolute right-[25%] top-[15%] h-1 w-1 rounded-full bg-amber-100 animate-twinkle" />
              <div className="absolute right-[45%] top-[6%] h-1 w-1 rounded-full bg-white animate-twinkle" />
            </div>
          )}
          {/* Moon Glow */}
          <div className="absolute right-12 top-6 h-12 w-12 rounded-full bg-amber-100/90 shadow-[0_0_30px_rgba(251,191,36,0.6)]" />
        </div>
      )}

      {/* ── LAYER 3: DYNAMIC WEATHER REACTION EFFECTS ───────────────────── */}
      {/* Rain Effect */}
      {(weatherType === "rain" || weatherType === "thunderstorm") && !isReducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-75">
          <div className="absolute left-[10%] top-0 h-10 w-0.5 bg-sky-200/80 animate-rain-drop" />
          <div className="absolute left-[25%] top-0 h-12 w-0.5 bg-sky-200/70 animate-rain-drop" style={{ animationDelay: "0.2s" }} />
          <div className="absolute left-[45%] top-0 h-8 w-0.5 bg-sky-200/90 animate-rain-drop" style={{ animationDelay: "0.5s" }} />
          <div className="absolute right-[30%] top-0 h-11 w-0.5 bg-sky-200/80 animate-rain-drop" style={{ animationDelay: "0.3s" }} />
          <div className="absolute right-[15%] top-0 h-9 w-0.5 bg-sky-200/70 animate-rain-drop" style={{ animationDelay: "0.7s" }} />
        </div>
      )}

      {/* Thunderstorm Lightning Flash */}
      {weatherType === "thunderstorm" && !isReducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-10 bg-sky-100/30 animate-lightning-flash" />
      )}

      {/* Fog / Mist Haze Layer */}
      {(weatherType === "fog" || timePeriod === "morning") && !isReducedMotion && (
        <div className="animate-mist-slow pointer-events-none absolute inset-x-0 bottom-[25%] z-10 h-24 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-md" />
      )}

      {/* Hot Weather Heat Shimmer */}
      {weatherType === "hot" && !isReducedMotion && (
        <div className="animate-heat-wave pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-amber-500/15 via-transparent to-transparent" />
      )}

      {/* ── LAYER 4: AGRI-CONNECT SMART AI FIELD SCAN LASER ─────────────── */}
      {!isReducedMotion && (
        <div className="animate-crop-scan-beam pointer-events-none absolute inset-x-0 z-20 h-24 bg-gradient-to-b from-transparent via-[#00C26E]/20 to-transparent">
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#00C26E] to-transparent shadow-[0_0_15px_#00C26E]" />
        </div>
      )}

      {/* ── LAYER 5: ANCHORED CROP TELEMETRY TARGET NODES ───────────────── */}
      {/* Node 1 — Crop Moisture & Stage (Bottom Left) */}
      <div
        className="absolute bottom-[22%] left-[10%] z-30 transition-transform duration-700"
        style={{ transform: `translate3d(${parallaxX * 0.5}px, ${parallaxY * 0.5}px, 0)` }}
      >
        <div className="relative flex items-center gap-2">
          <div className="relative flex h-5 w-5 items-center justify-center">
            <span className={`absolute h-full w-full rounded-full bg-[#00C26E] opacity-75 ${!isReducedMotion ? "animate-ping" : ""}`} />
            <span className="h-2.5 w-2.5 rounded-full bg-[#00C26E] shadow-[0_0_10px_#00C26E]" />
          </div>

          <div className="hidden sm:block h-px w-6 bg-gradient-to-r from-[#00C26E] to-white/40" />

          <div className="rounded-xl border border-white/25 bg-emerald-950/80 px-3 py-1.5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300">
              <Droplets size={12} className="text-[#00C26E]" />
              <span>Soil Moisture · {cropData.moisture}</span>
            </div>
            <p className="text-[9.5px] font-semibold text-emerald-100/85">{cropData.stage}</p>
          </div>
        </div>
      </div>

      {/* Node 2 — Crop Health & Growth Status (Mid Right) */}
      <div
        className="absolute bottom-[42%] right-[12%] z-30 transition-transform duration-700"
        style={{ transform: `translate3d(${parallaxX * 0.3}px, ${parallaxY * 0.3}px, 0)` }}
      >
        <div className="relative flex items-center gap-2">
          <div className="rounded-xl border border-white/25 bg-emerald-950/80 px-3 py-1.5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300">
              <Sprout size={12} className="text-amber-400" />
              <span>{cropData.name}</span>
            </div>
            <p className="text-[9.5px] font-semibold text-emerald-100/85">Crop Health · 98% Optimal</p>
          </div>

          <div className="hidden sm:block h-px w-6 bg-gradient-to-r from-white/40 to-[#00C26E]" />

          <div className="relative flex h-5 w-5 items-center justify-center">
            <span className={`absolute h-full w-full rounded-full bg-amber-400 opacity-75 ${!isReducedMotion ? "animate-ping" : ""}`} />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#FBBF24]" />
          </div>
        </div>
      </div>

      {/* ── LAYER 6: TOP INTEGRATED TIME & WEATHER STATUS HUD ────────────── */}
      <div className="absolute left-4 top-4 z-40 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-white/25 bg-emerald-950/85 px-3.5 py-1.5 shadow-md backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute h-full w-full rounded-full bg-[#00C26E] opacity-75 ${!isReducedMotion ? "animate-ping" : ""}`} />
            <span className="relative h-2.5 w-2.5 rounded-full bg-[#00C26E]" />
          </span>
          <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-white">
            <Cpu size={13} className="text-[#00C26E]" />
            <span className="tracking-wide uppercase">{cropData.name}</span>
          </div>
        </div>

        {/* Time-of-Day Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur-md">
          {timePeriod === "morning" && <Sun size={12} className="text-amber-400" />}
          {timePeriod === "day" && <Sun size={12} className="text-amber-300" />}
          {timePeriod === "evening" && <Sun size={12} className="text-orange-400" />}
          {timePeriod === "night" && <Moon size={12} className="text-indigo-300" />}
          <span className="capitalize">{timePeriod} Atmosphere</span>
        </div>
      </div>

      {/* ── LAYER 7: BOTTOM REAL-TIME SUMMARY STRIP ─────────────────────── */}
      <div className="absolute bottom-4 left-4 z-40 hidden md:flex items-center gap-3 rounded-xl border border-white/20 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white/95 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-1 text-emerald-300">
          <Activity size={13} />
          <span>Real-time Field AI</span>
        </div>
        <span className="text-white/30">•</span>
        <div className="flex items-center gap-1 text-amber-300">
          <Thermometer size={13} />
          <span>{weatherCondition || "Clear"} Environment</span>
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

export default DynamicSmartFarmHero;
