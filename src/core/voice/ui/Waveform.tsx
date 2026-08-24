import React from "react";
import { cn } from "@/lib/utils";

/**
 * Waveform — animated equaliser bars used to visualise live speech.
 * A deterministic pseudo-random bar pattern stays stable across renders
 * while the bounce animation conveys active input.
 *
 * Theme: AgriConnect green — matches the main app visual identity.
 */
interface WaveformProps {
  bars?: number;
  active?: boolean;
  className?: string;
}

export const Waveform: React.FC<WaveformProps> = ({
  bars = 24,
  active = true,
  className,
}) => {
  // Deterministic pseudo-random heights per bar (no hydration mismatch).
  const seed = 7;
  const heights = Array.from({ length: bars }, (_, i) => {
    const value = Math.abs(Math.sin(seed * (i + 1) * 12.9898) * 43758.5453);
    return Math.floor((value % 1) * 60) + 30; // 30%–90%
  });

  return (
    <div className={cn("flex items-center justify-center gap-[3px]", className)} aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[4px] rounded-full",
            active ? "bg-primary animate-wave" : "bg-muted-foreground/30"
          )}
          style={{
            height: `${h}%`,
            animationDuration: `${0.7 + (i % 5) * 0.12}s`,
            animationDelay: `${(i % 7) * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
};
