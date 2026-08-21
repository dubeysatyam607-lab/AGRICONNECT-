import React, { useState, useEffect } from "react";
import { Settings, Sparkles, Sun, Moon, Cloud, Tractor, Award, TrendingUp, Scan, ShieldCheck, ArrowUpRight, Zap, ChevronRight, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/contexts/RoleContext";

interface HeroSectionProps {
  onNavigate: (tab: string) => void;
  userName?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigate,
  userName,
}) => {
  const { t } = useLanguage();
  const { activeRole } = useRole();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [rippleSlide, setRippleSlide] = useState<number | null>(null);

  // Auto-rotate carousel every 6 seconds unless paused by hover
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered]);

  // Determine time of day for dynamic celestial effects
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 19;
  const isSunset = hour >= 17 && hour < 19;
  const isMorning = hour >= 6 && hour < 11;

  const getBackgroundGradient = () => {
    if (activeSlide === 1) {
      return "from-emerald-800 via-teal-900 to-slate-950"; // CRED Stocks style
    }
    if (activeSlide === 2) {
      return "from-indigo-900 via-purple-900 to-slate-950"; // AI Doctor style
    }
    if (isNight) return "from-slate-900 via-indigo-950 to-slate-900";
    if (isSunset) return "from-amber-600 via-orange-600 to-rose-700";
    if (isMorning) return "from-sky-500 via-teal-600 to-emerald-700";
    return "from-emerald-700 via-teal-700 to-sky-600";
  };

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([15, 30]);
      } catch {
        // Haptics not supported by this browser/device – fail silently.
      }
    }
  };

  const handleSlideChange = (index: number) => {
    triggerHaptic();
    setActiveSlide(index);
  };

  const handleCardClick = (slideIdx: number, tabTarget?: string) => {
    triggerHaptic();
    setRippleSlide(slideIdx);
    setTimeout(() => setRippleSlide(null), 400);
    if (tabTarget) {
      onNavigate(tabTarget);
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative min-h-[280px] md:min-h-[320px] overflow-hidden rounded-[32px] bg-gradient-to-br ${getBackgroundGradient()} shadow-[0_20px_50px_rgba(16,185,129,0.25)] text-white transition-all duration-700 mb-6 group will-change-transform`}
      style={{ transform: 'translate3d(0, 0, 0)' }}
    >
      {/* Ripple Animation Overlay */}
      {rippleSlide !== null && (
        <span className="absolute inset-0 bg-white/20 rounded-[32px] animate-ping pointer-events-none z-50" />
      )}

      {/* --- SLIDE 1: CELESTIAL SUNRISE / SUNSET / TRACTOR HERO --- */}
      {activeSlide === 0 && (
        <div className="absolute inset-0 animate-fade-in pointer-events-none">
          {/* 1. Celestial Orb (Animated Sunrise / Sunset / Moon) */}
          <div className="absolute top-6 right-12 transition-transform duration-700">
            {isNight ? (
              <div className="relative">
                <Moon size={68} className="text-amber-200 animate-pulse drop-shadow-[0_0_30px_rgba(253,230,138,0.8)]" />
                <div className="absolute -top-1 -right-2 w-2.5 h-2.5 bg-white rounded-full animate-ping" />
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 bg-amber-400/35 rounded-full blur-2xl animate-sun-pulse" />
                <Sun size={72} className="text-amber-300 animate-spin-slow drop-shadow-[0_0_35px_rgba(252,211,77,0.95)]" />
              </div>
            )}
          </div>

          {/* 2. Drifting Floating Clouds */}
          <div className="absolute top-8 left-0 w-full overflow-hidden h-32">
            <div className="absolute top-2 left-[-10%] animate-cloud-slow text-white/35 dark:text-white/20">
              <Cloud size={60} fill="currentColor" />
            </div>
            <div className="absolute top-10 left-[-20%] animate-cloud-fast text-white/45 dark:text-white/25">
              <Cloud size={48} fill="currentColor" />
            </div>
          </div>

          {/* 3. Flying Birds in Sky */}
          {!isNight && (
            <div className="absolute top-12 left-10 animate-bird-fly text-white/65">
              <svg width="36" height="18" viewBox="0 0 32 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M2 12C7 4 13 4 16 10C19 4 25 4 30 12" />
              </svg>
            </div>
          )}

          {/* 4. Waving Wheat Fields at Bottom */}
          <div className="absolute bottom-0 inset-x-0 h-16 flex items-end justify-around overflow-hidden opacity-40 bg-gradient-to-t from-black/50 to-transparent">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="animate-wave-wheat text-amber-300 transform"
                style={{ animationDelay: `${(i % 5) * 0.4}s` }}
              >
                <svg width="22" height="38" viewBox="0 0 20 36" fill="currentColor">
                  <path d="M10 36V6C10 6 6 12 4 18C6 24 10 36 10 36ZM10 6C10 6 14 12 16 18C14 24 10 36 10 36Z" />
                  <circle cx="10" cy="4" r="3" />
                </svg>
              </div>
            ))}
          </div>

          {/* 5. Moving Tractor Driving Across the Field */}
          <div className="absolute bottom-4 left-0 w-full overflow-hidden z-10">
            <div className="animate-tractor-drive inline-flex items-center gap-1.5 text-amber-200/95 drop-shadow-lg">
              <Tractor size={42} className="transform -scale-x-100" />
              <span className="text-[10px] font-black tracking-wider uppercase bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/20">
                Mahindra 575 DI
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- SLIDE 2: CRED / APPLE STOCKS LIVE MANDI BHAV TICKER --- */}
      {activeSlide === 1 && (
        <div className="absolute inset-0 animate-fade-in pointer-events-none flex flex-col justify-end pb-4 px-6 md:px-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        </div>
      )}

      {/* --- SLIDE 3: AI CROP DOCTOR & SCHEME SUBSIDY RADAR --- */}
      {activeSlide === 2 && (
        <div className="absolute inset-0 animate-fade-in pointer-events-none flex flex-col justify-end pb-4 px-6 md:px-8">
          <div className="absolute top-4 right-8 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-6 right-12 w-28 h-28 border-2 border-dashed border-purple-400/30 rounded-full animate-spin-slow flex items-center justify-center">
            <Scan size={36} className="text-purple-300 animate-pulse" />
          </div>
        </div>
      )}

      {/* --- GLASSMORPHISM CONTENT AREA (ALL SLIDES) --- */}
      <div className="relative z-20 p-6 md:p-8 flex flex-col justify-between h-full min-h-[280px] md:min-h-[320px]">
        {/* Top Header Row */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 bg-white/20 dark:bg-black/30 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/25 shadow-md">
            <Sparkles size={16} className="text-amber-300 animate-pulse" />
            <span className="text-xs font-bold tracking-wide uppercase text-white">
              {activeRole} Dashboard
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-1" />
          </div>

          <div className="flex items-center gap-2">
            {/* Carousel Arrow Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-black/20 backdrop-blur-md px-2 py-1 rounded-full border border-white/15">
              <button
                onClick={() => handleSlideChange((activeSlide + 2) % 3)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Previous Slide"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold px-1.5">{activeSlide + 1} / 3</span>
              <button
                onClick={() => handleSlideChange((activeSlide + 1) % 3)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Next Slide"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => {
                triggerHaptic();
                onNavigate("settings");
              }}
              className="bg-white/20 dark:bg-black/30 hover:bg-white/30 active:scale-90 p-3 rounded-2xl transition-all duration-200 backdrop-blur-xl border border-white/30 shadow-lg flex items-center justify-center relative group-hover:rotate-6"
              aria-label="Settings"
            >
              <Settings size={20} className="text-white animate-spin-slow" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-emerald-900 animate-ping" />
            </button>
          </div>
        </div>

        {/* --- SLIDE SPECIFIC CONTENT --- */}
        <div className="mt-8 mb-6">
          {activeSlide === 0 && (
            <div className="animate-fade-in cursor-pointer" onClick={() => handleCardClick(0)}>
              <div className="inline-flex items-center gap-2 bg-black/25 backdrop-blur-md px-3.5 py-1 rounded-xl text-xs font-semibold text-amber-200 mb-2.5 border border-white/15 shadow-sm">
                <Award size={14} className="text-amber-400" />
                <span>{t('agr208')}</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-md mb-2 flex items-center gap-2.5 leading-tight">
                <span>{t("home.welcome") || "Welcome"}, {userName}!</span>
                <span className="inline-block animate-bounce">🌾</span>
              </h1>
              <p className="text-sm md:text-base text-white/90 max-w-lg font-medium leading-relaxed drop-shadow-sm">
                {isMorning ? (t('hero.morningPrompt') || "Fresh morning! Check today's mandi rates and soil moisture across your fields.") :
                 isSunset ? (t('hero.sunsetPrompt') || "Golden hour is here. Review your farm ledger and plan tomorrow's tasks.") :
                 isNight ? (t('hero.nightPrompt') || "Rest well, Kisan. AI Crop Doctor can check any leaf photo whenever you need.") :
                 (t('hero.dayPrompt') || "Plan your day — check mandi prices, book farm machinery, and consult AI advisory.")}
              </p>
            </div>
          )}

          {activeSlide === 1 && (
            <div className="animate-fade-in cursor-pointer" onClick={() => handleCardClick(1, "mandi")}>
              <div className="inline-flex items-center gap-2 bg-emerald-500/30 backdrop-blur-md px-3.5 py-1 rounded-xl text-xs font-extrabold text-emerald-200 mb-2.5 border border-emerald-400/30 shadow-sm">
                <TrendingUp size={14} className="text-emerald-300 animate-bounce" />
                <span>{t('hero.mandiPill') || "Mandi Bhav • Tap for Today's Rates"}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-md mb-3">
                {t('mandi.title') || "Mandi Prices"}
              </h1>
              <div className="max-w-xl">
                <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                  <div className="text-[11px] font-bold text-slate-200 uppercase">{t('agr209')}</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{t('hero.mandiSub') || "Tap to see today's live rates for your crops"}</div>
                  <div className="text-[11px] text-white/70 mt-1.5">{t('agr210')}</div>
                </div>
              </div>
            </div>
          )}

          {activeSlide === 2 && (
            <div className="animate-fade-in cursor-pointer" onClick={() => handleCardClick(2, "crop-doctor")}>
              <div className="inline-flex items-center gap-2 bg-purple-500/30 backdrop-blur-md px-3.5 py-1 rounded-xl text-xs font-extrabold text-purple-200 mb-2.5 border border-purple-400/30 shadow-sm">
                <Scan size={14} className="text-purple-300 animate-spin-slow" />
                <span>{t('agr211')}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-md mb-2 flex items-center gap-2">
                <span>{t('agr212')}</span>
                <span className="bg-amber-400 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full">{t('agr213')}</span>
              </h1>
              <p className="text-sm md:text-base text-white/90 max-w-lg font-medium leading-relaxed drop-shadow-sm mb-3">
                {t('hero.cropDoctorDesc') || "Take a photo of a leaf and get an AI diagnosis with remedy suggestions. Check the Schemes tab for available government subsidies."}
              </p>
              <div className="inline-flex items-center gap-2 bg-white text-slate-950 px-4 py-2 rounded-2xl font-black text-xs hover:bg-slate-100 transition-colors shadow-lg">
                <span>{t('agr214')}</span>
                <ArrowUpRight size={14} className="text-emerald-600" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Carousel Indicator Pills */}
        <div className="flex items-center justify-between pt-3 border-t border-white/15">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                onClick={() => handleSlideChange(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ease-out ${
                  activeSlide === idx
                    ? "w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                    : "w-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
            <Zap size={12} className="text-amber-300 animate-pulse" />
            <span>{t('agr215')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
