import React from "react";
import { Sprout, Cpu, Droplets } from "lucide-react";

export interface HeroFallbackProps {
  weatherCondition?: string;
}

export const HeroFallback: React.FC<HeroFallbackProps> = () => {
  return (
    <div
      className="relative flex h-full min-h-[260px] w-full flex-col overflow-hidden bg-emerald-950 sm:min-h-[300px] lg:min-h-[360px]"
      aria-hidden="true"
    >
      {/* ── REALISTIC INDIAN AGRICULTURAL FIELD IMAGE ───────────────────── */}
      <img
        src="/images/smart-farm-hero.jpg"
        alt="AgriConnect Smart Farm"
        className="h-full w-full object-cover object-bottom"
      />
      
      {/* Ambient lighting vignettes */}
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/60 via-transparent to-amber-500/15 mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/30 via-transparent to-amber-400/20" />

      {/* Top Floating Field Status Badge */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-white/20 bg-emerald-950/80 px-3 py-1.5 shadow-md backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className="relative h-2.5 w-2.5 rounded-full bg-[#00C26E]" />
        </span>
        <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-white">
          <Cpu size={13} className="text-[#00C26E]" />
          <span className="tracking-wider uppercase">Soybean Field · Smart Intelligence</span>
        </div>
      </div>

      {/* Telemetry Node 1 */}
      <div className="absolute bottom-[24%] left-[12%] z-20">
        <div className="rounded-xl border border-white/20 bg-emerald-950/80 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-300">
            <Droplets size={12} className="text-[#00C26E]" />
            <span>Soil Moisture · 48%</span>
          </div>
          <p className="text-[9.5px] font-semibold text-emerald-100/80">NPK: Optimal</p>
        </div>
      </div>

      {/* Telemetry Node 2 */}
      <div className="absolute bottom-[44%] right-[16%] z-20">
        <div className="rounded-xl border border-white/20 bg-emerald-950/80 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300">
            <Sprout size={12} className="text-amber-400" />
            <span>Flowering Stage · Health 98%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroFallback;
