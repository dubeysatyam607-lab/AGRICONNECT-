import React from "react";

export interface HeroFallbackProps {
  weatherCondition?: string;
}

export const HeroFallback: React.FC<HeroFallbackProps> = ({ weatherCondition }) => {
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#FEF6E4] via-[#F1F8EE] to-[#E5F2E7]"
      aria-hidden="true"
    >
      {/* Sun glow atmosphere */}
      <div className="absolute -right-6 top-4 h-32 w-32 rounded-full bg-[#FDE68A]/70 blur-2xl" />
      <div className="absolute left-1/4 top-10 h-24 w-48 rounded-full bg-emerald-100/40 blur-xl" />

      {/* Far Treeline silhouettes on horizon */}
      <div className="absolute inset-x-0 bottom-[35%] h-14 opacity-50">
        <svg viewBox="0 0 800 100" preserveAspectRatio="none" className="h-full w-full fill-[#15803D]">
          <path d="M0,100 L0,70 Q40,40 80,65 Q120,35 160,60 Q220,25 280,55 Q340,30 400,60 Q460,20 520,50 Q580,35 640,65 Q700,40 760,70 L800,75 L800,100 Z" />
        </svg>
      </div>

      {/* Cultivated soil ground base */}
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#2A1810] via-[#3E2723] to-[#5D4037]">
        {/* Soil furrows & row ridges */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(82deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 14px)",
          }}
        />
      </div>

      {/* Midground Soybean rows (Drifting SVG/CSS lines) */}
      <div className="animate-crop-row-drift absolute inset-x-0 bottom-[18%] h-[32%] opacity-90">
        <svg viewBox="0 0 800 120" preserveAspectRatio="none" className="h-full w-full">
          <g fill="#16A34A" opacity="0.8">
            <ellipse cx="60" cy="80" rx="35" ry="18" />
            <ellipse cx="140" cy="75" rx="40" ry="20" />
            <ellipse cx="230" cy="82" rx="38" ry="19" />
            <ellipse cx="320" cy="78" rx="42" ry="22" />
            <ellipse cx="410" cy="84" rx="36" ry="18" />
            <ellipse cx="500" cy="76" rx="44" ry="22" />
            <ellipse cx="590" cy="82" rx="40" ry="20" />
            <ellipse cx="680" cy="78" rx="38" ry="19" />
            <ellipse cx="760" cy="85" rx="35" ry="17" />
          </g>
        </svg>
      </div>

      {/* Foreground Soybean rows */}
      <div className="animate-crop-row-drift absolute inset-x-0 bottom-0 h-[30%]">
        <svg viewBox="0 0 800 140" preserveAspectRatio="none" className="h-full w-full">
          <g fill="#0F5132">
            <ellipse cx="40" cy="110" rx="55" ry="25" />
            <ellipse cx="150" cy="105" rx="60" ry="28" />
            <ellipse cx="270" cy="112" rx="58" ry="26" />
            <ellipse cx="390" cy="108" rx="62" ry="30" />
            <ellipse cx="510" cy="114" rx="55" ry="25" />
            <ellipse cx="630" cy="106" rx="60" ry="28" />
            <ellipse cx="740" cy="112" rx="58" ry="26" />
          </g>
        </svg>
      </div>

      {/* Indian Farmer Silhouette inspecting crop */}
      <div className="absolute right-[22%] bottom-[14%] h-44 w-28 opacity-95">
        <svg viewBox="0 0 100 160" className="h-full w-full">
          {/* Turban / Head */}
          <circle cx="50" cy="28" r="14" fill="#4A2E2B" />
          <path d="M36,26 C36,18 64,18 64,26 Z" fill="#8C3A27" />
          {/* Body / Kurta */}
          <path d="M32,44 L68,44 L72,95 L28,95 Z" fill="#EFEBE9" />
          {/* Gamcha over shoulder */}
          <path d="M32,44 C34,60 30,75 28,90 L36,92 C38,75 40,60 38,44 Z" fill="#0F5132" />
          {/* Inspecting Arm */}
          <path d="M64,52 Q82,65 72,82" stroke="#8D5B4C" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* Legs */}
          <rect x="36" y="95" width="10" height="42" fill="#374151" rx="4" />
          <rect x="54" y="95" width="10" height="42" fill="#374151" rx="4" />
        </svg>
      </div>

      {/* Field scan telemetry line */}
      <div className="animate-field-scan absolute inset-x-2 h-px bg-[#00C26E]/50" />
    </div>
  );
};

export default HeroFallback;
