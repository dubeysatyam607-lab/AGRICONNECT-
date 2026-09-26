import React, { useState, useEffect, useMemo, useRef } from "react";
import { Sprout, Droplets, Sun, Cloud, Moon, CloudRain, Cpu, Activity, Thermometer, ShieldCheck } from "lucide-react";

export interface DynamicSmartFarmHeroProps {
  mousePos?: { x: number; y: number };
  weatherCondition?: string;
  cropLabel?: string;
}

export type TimeOfDay = "DAWN" | "MORNING" | "DAY" | "EVENING" | "NIGHT";
export type WeatherState = "clear" | "partly_cloudy" | "cloudy" | "rain" | "heavy_rain" | "storm" | "fog";
type CropType = "soybean" | "wheat" | "paddy";

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

/** Debug parameter helper: ?heroDebug=night-rain or ?heroDebug=evening-clear */
function getDebugEnvironment(): { time?: TimeOfDay; weather?: WeatherState } | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const debug = params.get("heroDebug");
    if (!debug) return null;

    const parts = debug.toLowerCase().split("-");
    let time: TimeOfDay | undefined;
    let weather: WeatherState | undefined;

    for (const part of parts) {
      if (part === "dawn") time = "DAWN";
      else if (part === "morning") time = "MORNING";
      else if (part === "day" || part === "noon") time = "DAY";
      else if (part === "evening" || part === "dusk") time = "EVENING";
      else if (part === "night") time = "NIGHT";

      if (part === "clear" || part === "sunny") weather = "clear";
      else if (part === "partlycloudy" || part === "partly") weather = "partly_cloudy";
      else if (part === "cloudy" || part === "overcast") weather = "cloudy";
      else if (part === "rain") weather = "rain";
      else if (part === "heavyrain") weather = "heavy_rain";
      else if (part === "storm" || part === "thunderstorm") weather = "storm";
      else if (part === "fog" || part === "mist" || part === "haze") weather = "fog";
    }

    if (time || weather) return { time, weather };
  } catch {
    /* fallback */
  }
  return null;
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return "DAWN";
  if (hour >= 7 && hour < 11) return "MORNING";
  if (hour >= 11 && hour < 16) return "DAY";
  if (hour >= 16 && hour < 19) return "EVENING";
  return "NIGHT";
}

function parseWeatherState(rawCondition: string): WeatherState {
  if (!rawCondition) return "clear";
  const cond = rawCondition.toLowerCase();

  if (cond.includes("thunder") || cond.includes("storm") || cond.includes("heavy rain")) return "storm";
  if (cond.includes("rain") || cond.includes("shower") || cond.includes("drizzle")) return "rain";
  if (cond.includes("fog") || cond.includes("mist") || cond.includes("haze") || cond.includes("smoke")) return "fog";
  if (cond.includes("overcast") || (cond.includes("cloudy") && !cond.includes("partly"))) return "cloudy";
  if (cond.includes("partly") || cond.includes("scattered")) return "partly_cloudy";
  return "clear";
}

/**
 * DynamicSmartFarmHero — Photorealistic Indian Agriculture Smart Farm Visual Engine.
 *
 * Blends high-resolution real farm photography with dynamic time-of-day lighting,
 * real location weather effects, interactive parallax movement, and telemetry HUD overlays.
 */
export const DynamicSmartFarmHero: React.FC<DynamicSmartFarmHeroProps> = ({
  mousePos = { x: 0, y: 0 },
  weatherCondition = "",
  cropLabel = "",
}) => {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Time & Weather State Resolution
  const debugEnv = useMemo(() => getDebugEnvironment(), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const timeOfDay: TimeOfDay = debugEnv?.time || getTimeOfDay(currentHour);
  const weatherState: WeatherState = debugEnv?.weather || parseWeatherState(weatherCondition);

  // Accessibility Check
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
        /* fallback */
      }
    }
  }, []);

  // Crop Type & Photo Selection
  const cropType: CropType = useMemo(() => {
    const c = (cropLabel || "").toLowerCase();
    if (c.includes("wheat") || c.includes("gehun") || c.includes("gehu")) return "wheat";
    if (c.includes("rice") || c.includes("paddy") || c.includes("dhan")) return "paddy";
    return "soybean";
  }, [cropLabel]);

  const heroImageSrc = useMemo(() => {
    switch (cropType) {
      case "wheat":
        return "/images/wheat-smart-farm.jpg";
      case "paddy":
        return "/images/paddy-smart-farm.jpg";
      default:
        return "/images/smart-farm-hero.jpg";
    }
  }, [cropType]);

  const cropInfo = useMemo(() => {
    switch (cropType) {
      case "wheat":
        return {
          name: "Golden Wheat (गेहूं)",
          stage: "Earhead Stage",
          moisture: "44%",
          npk: "NPK: 120:60:40 · Optimal",
        };
      case "paddy":
        return {
          name: "Paddy Rice (धान)",
          stage: "Panicle Stage",
          moisture: "76%",
          npk: "NPK: 100:50:50 · Submerged",
        };
      default:
        return {
          name: cropLabel || "Green Soybean (सोयाबीन)",
          stage: "Flowering Stage",
          moisture: "52%",
          npk: "NPK: Optimal · Depth 15cm",
        };
    }
  }, [cropType, cropLabel]);

  // Parallax transform calculations
  const parallaxX = !isReducedMotion ? mousePos.x * 12 : 0;
  const parallaxY = !isReducedMotion ? mousePos.y * 8 : 0;

  // Render Rain / Particle Canvas Overlay for Rain & Weather
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let startTime = performance.now();

    const resize = () => {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // Weather particles
    const rainCount = weatherState === "storm" ? 70 : weatherState === "rain" || weatherState === "heavy_rain" ? 45 : 0;
    const drops: RainDrop[] = Array.from({ length: rainCount }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      length: 10 + Math.random() * 14,
      speed: 0.02 + Math.random() * 0.02,
      alpha: 0.3 + Math.random() * 0.4,
    }));

    const starCount = timeOfDay === "NIGHT" && weatherState !== "storm" && weatherState !== "heavy_rain" ? 35 : 0;
    const starsList: Star[] = Array.from({ length: starCount }).map(() => ({
      x: Math.random(),
      y: Math.random() * 0.45,
      radius: 0.8 + Math.random() * 1.2,
      alpha: 0.3 + Math.random() * 0.7,
    }));

    const render = (now: number) => {
      const elapsed = (now - startTime) * 0.001;
      const width = canvas.parentElement?.getBoundingClientRect().width || 400;
      const height = canvas.parentElement?.getBoundingClientRect().height || 300;

      ctx.clearRect(0, 0, width, height);

      // Render Stars (Night)
      if (starsList.length > 0) {
        ctx.fillStyle = "#F8FAFC";
        starsList.forEach((st) => {
          const a = isReducedMotion ? st.alpha : 0.2 + (Math.sin(elapsed * 2 + st.x * 10) + 1) * 0.4 * st.alpha;
          ctx.save();
          ctx.globalAlpha = Math.max(0.1, Math.min(1, a));
          ctx.beginPath();
          ctx.arc(st.x * width, st.y * height, st.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // Render Rain
      if (drops.length > 0) {
        ctx.strokeStyle = "rgba(224, 242, 254, 0.65)";
        drops.forEach((d) => {
          if (!isReducedMotion) {
            d.y += d.speed;
            d.x += d.speed * 0.25;
            if (d.y > 1) d.y = -0.1;
            if (d.x > 1) d.x = -0.1;
          }
          const rx = d.x * width;
          const ry = d.y * height;
          ctx.save();
          ctx.globalAlpha = d.alpha;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - d.length * 0.25, ry + d.length);
          ctx.stroke();
          ctx.restore();
        });
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      ro.disconnect();
    };
  }, [weatherState, timeOfDay, isReducedMotion]);

  // Atmospheric Overlay Class Names based on Time of Day & Weather
  const timeOverlayClass = useMemo(() => {
    switch (timeOfDay) {
      case "DAWN":
        return "bg-gradient-to-t from-[#78350F]/45 via-[#B45309]/25 to-[#3B1C4D]/50";
      case "MORNING":
        return "bg-gradient-to-t from-emerald-950/50 via-transparent to-amber-400/20";
      case "DAY":
        return "bg-gradient-to-t from-emerald-950/40 via-transparent to-sky-400/10";
      case "EVENING":
        return "bg-gradient-to-t from-[#451A03]/60 via-[#C2410C]/30 to-[#1E1B4B]/40";
      case "NIGHT":
        return "bg-gradient-to-t from-[#064E3B]/60 via-[#1E293B]/70 to-[#0F172A]/85";
    }
  }, [timeOfDay]);

  return (
    <div
      className="relative flex h-full min-h-[280px] sm:min-h-[320px] lg:min-h-[370px] max-h-[400px] w-full flex-col overflow-hidden bg-emerald-950 rounded-[24px]"
      aria-label="Photorealistic Indian Agriculture Smart Farm Environment"
    >
      {/* ── 1. CINEMATIC REAL AGRICULTURAL FIELD PHOTOGRAPHY LAYER ──────────── */}
      <div
        className={`absolute inset-0 transition-transform duration-700 ease-out ${
          !isReducedMotion ? "scale-105" : ""
        }`}
        style={{
          transform: `scale(1.08) translate3d(${parallaxX}px, ${parallaxY}px, 0)`,
        }}
      >
        <img
          src={heroImageSrc}
          alt={cropInfo.name}
          onLoad={() => setImgLoaded(true)}
          className={`h-full w-full object-cover object-center transition-opacity duration-700 ${
            imgLoaded ? "opacity-100" : "opacity-85"
          }`}
        />

        {/* Dynamic Time-of-Day Atmospheric Overlay */}
        <div className={`absolute inset-0 ${timeOverlayClass} mix-blend-multiply`} />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/40 via-transparent to-amber-400/15" />

        {/* Weather Overlays (Cloudy / Fog / Storm) */}
        {(weatherState === "cloudy" || weatherState === "rain" || weatherState === "heavy_rain" || weatherState === "storm") && (
          <div className="absolute inset-0 bg-slate-900/40 mix-blend-overlay" />
        )}

        {weatherState === "fog" && (
          <div className="absolute inset-0 bg-slate-100/25 backdrop-blur-[1px]" />
        )}
      </div>

      {/* ── 2. SUNLIGHT / MOONLIGHT SWEEP ATMOSPHERE ───────────────────────── */}
      {!isReducedMotion && timeOfDay !== "NIGHT" && (
        <div className="animate-sunlight-sweep pointer-events-none absolute -left-1/4 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-amber-300/15 to-transparent blur-2xl" />
      )}

      {timeOfDay === "NIGHT" && (
        <div className="pointer-events-none absolute right-12 top-6 h-28 w-28 rounded-full bg-slate-200/20 blur-2xl" />
      )}

      {/* ── 3. WEATHER & PARTICLE CANVAS OVERLAY ──────────────────────────── */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full z-10" />

      {/* ── 4. SMART CROP SCANNING BEAM (SUBTLE AGRI-TECH ACCENT) ───────────── */}
      {!isReducedMotion && (
        <div className="animate-crop-scan-beam pointer-events-none absolute inset-x-0 z-15 h-24 bg-gradient-to-b from-transparent via-[#5E9F58]/20 to-transparent">
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#5E9F58] to-transparent shadow-[0_0_12px_#5E9F58]" />
        </div>
      )}

      {/* ── 5. TOP STATUS HUD CHIP ─────────────────────────────────────────── */}
      <div className="absolute left-3.5 top-3.5 z-30 flex items-center gap-2 rounded-xl border border-white/20 bg-[#285943]/85 px-3 py-1.5 shadow-md backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute h-full w-full rounded-full bg-[#5E9F58] opacity-75 ${!isReducedMotion ? "animate-ping" : ""}`} />
          <span className="relative h-2.5 w-2.5 rounded-full bg-[#5E9F58]" />
        </span>
        <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-white">
          <Cpu size={13} className="text-[#5E9F58]" />
          <span className="tracking-wide">{cropInfo.name}</span>
          <span className="hidden sm:inline-block rounded-md bg-[#5E9F58]/25 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase text-[#8EAF82]">
            {timeOfDay} &bull; {weatherState.replace("_", " ").toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── 6. FLOATING FIELD TELEMETRY NODES ───────────────────────────────── */}
      {/* Node 1 — Soil Moisture & NPK (Bottom Left) */}
      <div
        className="absolute bottom-[22%] left-[10%] z-25 transition-transform duration-500"
        style={{ transform: `translate3d(${parallaxX * 0.4}px, ${parallaxY * 0.4}px, 0)` }}
      >
        <div className="relative flex items-center gap-2">
          <div className="relative flex h-5 w-5 items-center justify-center">
            <span className={`absolute h-full w-full rounded-full bg-[#5E9F58] opacity-75 ${!isReducedMotion ? "animate-ping" : ""}`} />
            <span className="h-2 w-2 rounded-full bg-[#5E9F58] shadow-[0_0_8px_#5E9F58]" />
          </div>
          <div className="hidden sm:block h-px w-5 bg-gradient-to-r from-[#5E9F58] to-white/40" />
          <div className="rounded-xl border border-white/20 bg-[#285943]/85 px-3 py-1.5 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#8EAF82]">
              <Droplets size={12} className="text-[#5E9F58]" />
              <span>Soil Moisture &bull; {cropInfo.moisture}</span>
            </div>
            <p className="text-[9.5px] font-semibold text-white/80">{cropInfo.npk}</p>
          </div>
        </div>
      </div>

      {/* Node 2 — Crop Stage (Mid Field Right) */}
      <div
        className="absolute bottom-[42%] right-[14%] z-25 transition-transform duration-500"
        style={{ transform: `translate3d(${parallaxX * 0.3}px, ${parallaxY * 0.3}px, 0)` }}
      >
        <div className="relative flex items-center gap-2">
          <div className="rounded-xl border border-white/20 bg-[#285943]/85 px-3 py-1.5 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300">
              <Sprout size={12} className="text-amber-400" />
              <span>{cropInfo.stage}</span>
            </div>
            <p className="text-[9.5px] font-semibold text-white/80">Growth Index &bull; Optimal</p>
          </div>
          <div className="hidden sm:block h-px w-5 bg-gradient-to-r from-white/40 to-[#5E9F58]" />
          <div className="relative flex h-5 w-5 items-center justify-center">
            <span className={`absolute h-full w-full rounded-full bg-amber-400 opacity-75 ${!isReducedMotion ? "animate-ping" : ""}`} />
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#FBBF24]" />
          </div>
        </div>
      </div>

      {/* ── 7. BOTTOM TELEMETRY SUMMARY STRIP ──────────────────────────────── */}
      <div className="absolute bottom-3.5 left-3.5 z-30 hidden md:flex items-center gap-3 rounded-xl border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white/90 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-1 text-[#8EAF82]">
          <Activity size={13} />
          <span>Live Field Telemetry</span>
        </div>
        <span className="text-white/30">&bull;</span>
        <div className="flex items-center gap-1 text-amber-300">
          <Thermometer size={13} />
          <span>Ambient Weather Active</span>
        </div>
        <span className="text-white/30">&bull;</span>
        <div className="flex items-center gap-1 text-[#8EAF82]">
          <ShieldCheck size={13} />
          <span>Zero Disease Risk</span>
        </div>
      </div>
    </div>
  );
};

export default DynamicSmartFarmHero;
