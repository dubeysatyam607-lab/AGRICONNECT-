import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Sparkles } from "lucide-react";

interface FeatureButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  colorClass?: string;
  highlight?: boolean;
  className?: string;
  image?: string;
  index?: number;
}

const FeatureButton: React.FC<FeatureButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  colorClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  highlight = false,
  className,
  image,
  index = 0,
}) => {
  const [ripple, setRipple] = React.useState(false);

  const handleClick = () => {
    // 1. Haptic feedback (spring bounce & vibration)
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
    // 2. Trigger ripple animation
    setRipple(true);
    setTimeout(() => setRipple(false), 400);

    // 3. Execute callback
    if (onClick) onClick();
  };

  return (
    <button
      onClick={handleClick}
      style={{ animationDelay: `${index * 80}ms` }}
      className={cn(
        "group relative flex flex-col items-center justify-between gap-2.5 p-3.5",
        "backdrop-blur-md bg-white/75 dark:bg-slate-900/75 border border-white/60 dark:border-white/10",
        "rounded-[24px] shadow-[0_6px_24px_rgba(0,0,0,0.05)]",
        "transition-all duration-300 ease-out will-change-transform",
        "hover:-translate-y-1.5 hover:scale-[1.06] hover:shadow-[0_14px_35px_rgba(16,185,129,0.25)] hover:border-emerald-500/40",
        "active:scale-90 active:transition-transform",
        "overflow-hidden cursor-pointer animate-fade-in",
        highlight && "bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-amber-500/15 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]",
        className
      )}
    >
      {/* Ripple expansion element */}
      {ripple && (
        <span className="absolute inset-0 bg-emerald-500/20 rounded-[24px] animate-ping pointer-events-none" />
      )}

      {/* Subtle ambient hover glow behind card */}
      <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Highlight badge / corner spark */}
      {highlight && (
        <div className="absolute top-1.5 right-1.5 text-amber-500 animate-pulse">
          <Sparkles size={14} />
        </div>
      )}

      {/* Icon Container with Lottie-like dynamic hover physics */}
      <div
        className={cn(
          "w-13 h-13 rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-300 ease-out",
          "group-hover:scale-115 group-hover:rotate-6 group-hover:shadow-md",
          image ? "" : colorClass
        )}
      >
        {image ? (
          <img
            src={image}
            alt={label}
            loading="lazy"
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <Icon size={26} className="transition-transform duration-300 group-hover:scale-110" />
        )}
      </div>

      {/* Typography with sleek Material 3 truncation and weight */}
      <span
        className={cn(
          "text-[11px] font-semibold text-slate-800 dark:text-slate-100 text-center leading-tight tracking-tight line-clamp-2 w-full",
          highlight && "font-bold text-emerald-700 dark:text-emerald-300"
        )}
      >
        {label}
      </span>
    </button>
  );
};

export { FeatureButton };
