import React from "react";
import { Sprout, Droplets } from "lucide-react";

export interface HeroFallbackProps {
  weatherCondition?: string;
}

export const HeroFallback: React.FC<HeroFallbackProps> = () => {
  return (
    <div
      className="relative flex h-full min-h-[280px] sm:min-h-[320px] lg:min-h-[350px] max-h-[380px] w-full flex-col overflow-hidden bg-gradient-to-b from-[#EBF5ED] via-[#F4F9F2] to-[#FBF8F1]"
      aria-hidden="true"
    >
      {/* Base Crop Field Image */}
      <img
        src="/images/smart-farm-hero.jpg"
        alt="AgriConnect Indian Farm"
        className="h-full w-full object-cover object-bottom opacity-90"
      />
      
      {/* Soft natural ambient lighting vignettes */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F5132]/30 via-transparent to-[#F7D774]/10 mix-blend-overlay" />

      {/* Top Floating Field Status Badge */}
      <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-lg border border-emerald-900/15 bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-[#00C26E]" />
        <span className="text-[11px] font-extrabold text-[#0F5132] tracking-wide">Soybean Field</span>
      </div>

      {/* Moisture Badge */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-lg border border-emerald-900/15 bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-md">
        <Droplets size={12} className="text-[#00C26E]" />
        <span className="text-[10.5px] font-bold text-[#0F5132]">Soil Moisture &bull; 48%</span>
      </div>

      {/* Stage Badge */}
      <div className="absolute bottom-3 right-3 z-20 hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-900/15 bg-amber-50/90 px-2.5 py-1 shadow-sm backdrop-blur-md">
        <Sprout size={12} className="text-amber-700" />
        <span className="text-[10.5px] font-bold text-amber-900">Flowering Stage</span>
      </div>
    </div>
  );
};

export default HeroFallback;
