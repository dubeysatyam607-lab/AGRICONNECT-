import React from "react";
import { Sprout, Sun, Radio } from "lucide-react";

export interface HeroFallbackProps {
  weatherCondition?: string;
}

export const HeroFallback: React.FC<HeroFallbackProps> = ({ weatherCondition }) => {
  return (
    <div
      className="relative flex h-full min-h-[260px] w-full flex-col overflow-hidden bg-gradient-to-br from-[#FEF8ED] via-[#EDF7EE] to-[#DDF0E1] sm:min-h-[300px] lg:min-h-[360px]"
      aria-hidden="true"
    >
      {/* Morning Golden Sunlight & Sky Atmosphere Glow */}
      <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-[#FDE68A]/60 blur-3xl" />
      <div className="absolute left-1/4 top-6 h-32 w-64 rounded-full bg-emerald-200/50 blur-2xl" />
      <div className="absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-[#00C26E]/15 blur-2xl" />

      {/* Far horizon tree line silhouette */}
      <div className="absolute inset-x-0 bottom-[36%] h-16 opacity-60">
        <svg viewBox="0 0 800 120" preserveAspectRatio="none" className="h-full w-full fill-[#0F5132]">
          <path d="M0,120 L0,75 Q30,45 70,68 Q110,38 150,62 Q210,25 270,58 Q330,32 390,65 Q450,20 510,52 Q570,38 630,68 Q690,42 750,72 L800,78 L800,120 Z" />
        </svg>
      </div>

      {/* Rich Black/Brown Cultivated Soil Foundation */}
      <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-[#1F130E] via-[#2D1B15] to-[#422C23]">
        {/* Soil furrows & tilled row lines */}
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              "repeating-linear-gradient(80deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 16px)",
          }}
        />
      </div>

      {/* Midground Lush Green Soybean Rows */}
      <div className="animate-crop-row-drift absolute inset-x-0 bottom-[18%] h-[34%] opacity-90">
        <svg viewBox="0 0 800 120" preserveAspectRatio="none" className="h-full w-full">
          <g fill="#16A34A" opacity="0.85">
            <ellipse cx="50" cy="78" rx="40" ry="20" />
            <ellipse cx="130" cy="72" rx="45" ry="22" />
            <ellipse cx="220" cy="80" rx="42" ry="20" />
            <ellipse cx="310" cy="75" rx="48" ry="24" />
            <ellipse cx="400" cy="82" rx="40" ry="20" />
            <ellipse cx="490" cy="74" rx="50" ry="24" />
            <ellipse cx="580" cy="80" rx="44" ry="22" />
            <ellipse cx="670" cy="76" rx="42" ry="20" />
            <ellipse cx="750" cy="83" rx="38" ry="18" />
          </g>
        </svg>
      </div>

      {/* Foreground Healthy Soybean Canopy */}
      <div className="animate-crop-row-drift absolute inset-x-0 bottom-0 h-[32%]">
        <svg viewBox="0 0 800 140" preserveAspectRatio="none" className="h-full w-full">
          <g fill="#0F5132">
            <ellipse cx="35" cy="110" rx="60" ry="28" />
            <ellipse cx="145" cy="104" rx="68" ry="32" />
            <ellipse cx="265" cy="112" rx="64" ry="30" />
            <ellipse cx="385" cy="106" rx="70" ry="34" />
            <ellipse cx="505" cy="114" rx="62" ry="28" />
            <ellipse cx="625" cy="105" rx="68" ry="32" />
            <ellipse cx="735" cy="112" rx="64" ry="30" />
          </g>
          {/* Top highlight leaf sprouts */}
          <g fill="#22C55E" opacity="0.9">
            <circle cx="145" cy="88" r="14" />
            <circle cx="385" cy="88" r="16" />
            <circle cx="625" cy="88" r="15" />
          </g>
        </svg>
      </div>

      {/* Indian Farmer Figure Inspecting Crop */}
      <div className="absolute right-[18%] bottom-[12%] h-48 w-32 opacity-95">
        <svg viewBox="0 0 100 160" className="h-full w-full drop-shadow-md">
          {/* Turban / Head */}
          <circle cx="50" cy="26" r="14" fill="#4A2E2B" />
          <path d="M34,24 C34,16 66,16 66,24 Z" fill="#8C3A27" />
          {/* Kurta Body */}
          <path d="M30,42 L70,42 L74,96 L26,96 Z" fill="#EFEBE9" />
          {/* Gamcha Cloth over shoulder */}
          <path d="M30,42 C32,60 28,78 26,94 L34,96 C36,78 38,60 36,42 Z" fill="#0F5132" />
          {/* Inspecting Arm */}
          <path d="M66,50 Q84,63 74,80" stroke="#8D5B4C" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* Legs */}
          <rect x="34" y="96" width="11" height="44" fill="#374151" rx="4" />
          <rect x="53" y="96" width="11" height="44" fill="#374151" rx="4" />
        </svg>
      </div>

      {/* Top Floating Field Status Badge */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-[#0F5132]/15 bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C26E] opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00C26E]" />
        </span>
        <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#0F5132]">
          Soybean Field · Live Telemetry
        </span>
      </div>

      {/* Bottom Telemetry Chip */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2 rounded-lg border border-emerald-900/10 bg-white/80 px-2.5 py-1 text-[11px] font-bold text-[#0F5132] shadow-xs backdrop-blur-xs">
        <Sprout size={13} className="text-[#00C26E]" />
        <span>Optimal Growth Environment</span>
      </div>

      {/* Field scan laser boundary animation */}
      <div className="animate-field-scan absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#00C26E]/60 to-transparent" />
    </div>
  );
};

export default HeroFallback;
