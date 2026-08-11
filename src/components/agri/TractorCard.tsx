import React, { useState } from "react";
import { Tractor as TractorIcon, User, Star, MapPin, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Tractor } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const TRACTOR_IMAGES: Record<string, string> = {
  "Mahindra 575 DI": "https://images.unsplash.com/photo-1622312674917-8a4db95c80ed?auto=format&fit=crop&q=80&w=600",
  "Sonalika Tiger":  "https://images.unsplash.com/photo-1592860824422-0d19d6d02a93?auto=format&fit=crop&q=80&w=600",
  "John Deere 5310": "https://images.unsplash.com/photo-1593978432039-b38e3f12b2ce?auto=format&fit=crop&q=80&w=600",
  "Swaraj 855":      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600",
};

const DEFAULT_TRACTOR_IMAGE =
  "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&q=80&w=600";

interface TractorCardProps {
  tractor: Tractor;
  onBook: (tractor: Tractor) => void;
  className?: string;
}

const TractorCard: React.FC<TractorCardProps> = ({ tractor, onBook, className }) => {
  const [ripple, setRipple] = useState(false);
  const imgSrc = TRACTOR_IMAGES[tractor.name] || DEFAULT_TRACTOR_IMAGE;

  const handleBook = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([15, 30, 15]);
    }
    setRipple(true);
    setTimeout(() => setRipple(false), 400);
    onBook(tractor);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden",
        "backdrop-blur-xl bg-white/85 dark:bg-slate-900/85 border border-white/60 dark:border-white/10",
        "rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
        "transition-all duration-300 ease-out will-change-transform",
        "hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-[0_16px_40px_rgba(16,185,129,0.22)] hover:border-emerald-500/40",
        "active:scale-95 active:transition-transform cursor-pointer",
        className
      )}
    >
      {/* Ripple animation */}
      {ripple && (
        <span className="absolute inset-0 bg-emerald-500/20 rounded-[24px] animate-ping pointer-events-none z-30" />
      )}

      {/* Premium Image Header */}
      <div className="relative w-full h-44 overflow-hidden rounded-t-[24px]">
        <img
          src={imgSrc}
          alt={tractor.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_TRACTOR_IMAGE; }}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        {/* Top Badges (Distance & Status) */}
        <div className="absolute top-3 inset-x-3 flex justify-between items-center z-10">
          <div className="bg-slate-900/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-white text-[11px] font-semibold flex items-center gap-1 shadow-md">
            <MapPin size={11} className="text-emerald-400 animate-pulse" />
            <span>{tractor.distance} away</span>
          </div>
          <StatusBadge status={tractor.status} />
        </div>

        {/* Bottom Title Overlay */}
        <div className="absolute bottom-3 inset-x-3 flex items-end justify-between z-10 text-white">
          <div>
            <div className="flex items-center gap-1 text-[11px] text-amber-300 font-bold uppercase tracking-wider mb-0.5">
              <ShieldCheck size={12} /> Verified Asset
            </div>
            <h4 className="font-extrabold text-lg tracking-tight leading-none text-white drop-shadow-sm">
              {tractor.name}
            </h4>
            <div className="text-xs text-slate-200 flex items-center gap-1 mt-1 font-medium">
              <User size={12} className="text-emerald-400" /> {tractor.owner}
            </div>
          </div>

          {/* Star Rating Badge */}
          <div className="bg-amber-500/90 text-slate-950 backdrop-blur-md px-2 py-1 rounded-xl font-bold text-xs flex items-center gap-1 shadow-lg">
            <Star size={12} className="fill-slate-950 text-slate-950" />
            <span>{tractor.rating}</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="p-4 flex flex-col justify-between flex-1 gap-4">
        <div className="grid grid-cols-3 gap-2 bg-slate-100/80 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-center">
          <div className="border-r border-slate-200 dark:border-slate-700 pr-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Power</p>
            <p className="font-extrabold text-xs text-foreground mt-0.5 flex items-center justify-center gap-0.5">
              <Zap size={10} className="text-amber-500" /> {tractor.hp} HP
            </p>
          </div>
          <div className="border-r border-slate-200 dark:border-slate-700 px-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Implement</p>
            <p className="font-bold text-xs text-foreground mt-0.5 truncate">{tractor.implement}</p>
          </div>
          <div className="pl-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Rate/Acre</p>
            <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">₹{tractor.ratePerAcre}</p>
          </div>
        </div>

        {/* Price & Book Action */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Rental Rate</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                ₹{tractor.ratePerHour}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">/ hr</span>
            </div>
          </div>

          <button
            onClick={handleBook}
            disabled={tractor.status !== "Available"}
            className={cn(
              "px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all duration-200 flex items-center gap-1.5",
              tractor.status === "Available"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20 active:scale-95 group-hover:shadow-lg"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Sparkles size={14} className={tractor.status === "Available" ? "animate-spin-slow text-amber-300" : ""} />
            <span>{tractor.status === "Available" ? "Book Asset" : "Booked Out"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TractorCard;
