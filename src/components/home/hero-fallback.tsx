import React from "react";

export const HeroFallback: React.FC = () => {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10"
      aria-hidden="true"
    >
      {/* Soil base layer */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#3a2a18] via-[#5b4026] to-[#7a5a36]" />

      {/* Far crop rows — subtle ambient drift */}
      <div
        className="animate-crop-row-drift absolute inset-x-0 bottom-0 h-3/5 opacity-70"
        style={{
          backgroundImage:
            "repeating-linear-gradient(87deg, hsl(136 100% 88% / 0.16) 0 2px, transparent 2px 14px), repeating-linear-gradient(93deg, hsl(136 100% 88% / 0.09) 0 1px, transparent 1px 14px)",
        }}
      />

      {/* Swaying foreground crop silhouette */}
      <div
        className="absolute inset-x-0 bottom-0 h-3/5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(58,88,44,0) 0 17px, rgba(34,68,40,0.4) 17px 20px, rgba(0,194,110,0.35) 20px 24px)",
        }}
      />

      {/* Field intelligence boundary line */}
      <div className="animate-field-boundary absolute inset-4 rounded-lg border border-emerald-200/70" />

      {/* Field scan band */}
      <div className="animate-field-scan absolute inset-x-2 h-px bg-white/50" />

      {/* Warm daylight wash */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-amber-100/10 to-transparent" />
    </div>
  );
};

export default HeroFallback;
