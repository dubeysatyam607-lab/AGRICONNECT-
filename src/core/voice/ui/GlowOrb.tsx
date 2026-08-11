import React from "react";
import { cn } from "@/lib/utils";

/**
 * GlowOrb — the pulsing microphone orb shown while listening.
 * Layers concentric ping rings over a gradient core, matching the
 * premium emerald/slate assistant theme.
 */
interface GlowOrbProps {
  size?: number;
  active?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const GlowOrb: React.FC<GlowOrbProps> = ({
  size = 112,
  active = true,
  className,
  children,
}) => (
  <div
    className={cn("relative flex items-center justify-center", className)}
    style={{ width: size, height: size }}
  >
    {active && (
      <>
        <span
          className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"
          style={{ animationDuration: "1.8s" }}
        />
        <span
          className="absolute inset-3 rounded-full bg-emerald-500/25 animate-ping"
          style={{ animationDuration: "1.8s", animationDelay: "300ms" }}
        />
        <span
          className="absolute inset-6 rounded-full bg-teal-500/20 animate-ping"
          style={{ animationDuration: "1.8s", animationDelay: "600ms" }}
        />
      </>
    )}
    <div
      className="relative rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-[0_0_40px_rgba(16,185,129,0.55)]"
      style={{ width: size * 0.55, height: size * 0.55 }}
    >
      {children}
    </div>
  </div>
);
