import React, { useState, useEffect } from "react";

import { Logo } from "@/components/ui/Logo";

interface SeedLoadingScreenProps {
  onComplete?: () => void;
  message?: string;
}

const SeedLoadingScreen: React.FC<SeedLoadingScreenProps> = ({
  onComplete,
  message = "Nurturing your AgriConnect dashboard...",
}) => {
  const [stage, setStage] = useState<"seed" | "sprout" | "bloom">("seed");

  useEffect(() => {
    const timer1 = setTimeout(() => setStage("sprout"), 300);
    const timer2 = setTimeout(() => setStage("bloom"), 700);
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 950);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-amber-50/90 via-emerald-50/90 to-emerald-100/95 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/80 transition-opacity duration-500">
      <div className="relative flex flex-col items-center justify-center p-8 rounded-3xl max-w-sm w-full text-center">
        {/* Glowing aura behind the logo */}
        <div className="absolute top-2 w-36 h-36 bg-amber-400/25 dark:bg-amber-400/10 rounded-full blur-2xl animate-pulse" />

        {/* Logo bloom */}
        <div
          className={`relative mb-6 transition-all duration-700 transform ${
            stage === "seed"
              ? "opacity-0 scale-75"
              : stage === "sprout"
                ? "opacity-60 scale-95"
                : "opacity-100 scale-100"
          }`}
        >
          <Logo size={108} className="drop-shadow-[0_10px_30px_rgba(46,125,50,0.45)]" />
        </div>

        {/* Premium Typography & Status */}
        <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent mb-2 tracking-tight">
          AgriConnect
        </h2>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {message}
        </p>

        {/* Progress bar */}
        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mt-6 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-1000 ease-out"
            style={{
              width: stage === "seed" ? "30%" : stage === "sprout" ? "70%" : "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SeedLoadingScreen;
