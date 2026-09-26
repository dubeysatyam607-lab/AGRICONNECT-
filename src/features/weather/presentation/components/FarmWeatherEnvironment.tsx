import React, { useMemo, useState, useEffect } from 'react';
import { WeatherConditionType, ILiveWeather, IWeatherLocation } from '../../domain/models/WeatherModels';

interface FarmWeatherEnvironmentProps {
  condition: WeatherConditionType;
  temperature: number;
  windSpeed: number;
  humidity: number;
  rainProbability?: number;
  sunriseTime?: string | null;
  sunsetTime?: string | null;
  children?: React.ReactNode;
}

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Derives current time of day based on hour or sunrise/sunset timestamps.
 */
export function getTimeOfDay(sunriseTime?: string | null, sunsetTime?: string | null): TimeOfDay {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'evening';
  return 'night';
}

/**
 * Normalizes condition text into broad weather categories
 */
export function getConditionCategory(condition: string): 'clear' | 'partly_cloudy' | 'cloudy' | 'rain' | 'fog' | 'storm' {
  const c = (condition || '').toLowerCase();
  if (c.includes('thunder') || c.includes('storm')) return 'storm';
  if (c.includes('heavy rain') || c.includes('shower') || c.includes('monsoon') || c.includes('rain')) return 'rain';
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return 'fog';
  if (c.includes('partly') || c.includes('scattered')) return 'partly_cloudy';
  if (c.includes('overcast') || c.includes('cloudy')) return 'cloudy';
  return 'clear';
}

/**
 * Realistic Agriculture Farm Weather Environment.
 * Multi-layered dynamic background simulating a real agricultural field in India (e.g. Rajasthan / MP / Punjab farmland).
 * Dynamically reacts to weather condition, wind speed, time of day, and temperature.
 */
export const FarmWeatherEnvironment: React.FC<FarmWeatherEnvironmentProps> = ({
  condition,
  temperature,
  windSpeed,
  humidity,
  rainProbability = 0,
  sunriseTime,
  sunsetTime,
  children,
}) => {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => getTimeOfDay(sunriseTime, sunsetTime));
  const [motionEnabled, setMotionEnabled] = useState<boolean>(true);

  // Update time of day ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeOfDay(getTimeOfDay(sunriseTime, sunsetTime));
    }, 60000);
    return () => clearInterval(timer);
  }, [sunriseTime, sunsetTime]);

  // Respect system reduced-motion preference
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionEnabled(false);
    }
  }, []);

  const weatherCategory = useMemo(() => getConditionCategory(condition), [condition]);

  // Dynamic sky gradients based on time of day and weather condition
  const skyStyle = useMemo(() => {
    if (weatherCategory === 'storm') {
      return 'from-slate-900 via-slate-800 to-zinc-900';
    }
    if (weatherCategory === 'rain') {
      return 'from-slate-800 via-slate-700 to-emerald-950/80';
    }
    if (weatherCategory === 'fog') {
      return 'from-slate-300 via-stone-200 to-amber-100/60 dark:from-slate-900 dark:via-zinc-800 dark:to-stone-900';
    }

    switch (timeOfDay) {
      case 'dawn':
        return 'from-amber-700/80 via-rose-600/60 to-sky-700';
      case 'morning':
        return 'from-sky-400 via-sky-300 to-amber-100';
      case 'afternoon':
        return 'from-sky-500 via-sky-400 to-amber-50';
      case 'evening':
        return 'from-amber-600 via-orange-500 to-rose-900';
      case 'night':
      default:
        return 'from-slate-950 via-indigo-950 to-emerald-950';
    }
  }, [timeOfDay, weatherCategory]);

  // Calculated wind duration for CSS animation (lower = faster)
  const windAnimDuration = useMemo(() => {
    if (windSpeed <= 2) return '12s';
    if (windSpeed <= 8) return '7s';
    if (windSpeed <= 15) return '4s';
    return '2.5s';
  }, [windSpeed]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-1000">
      {/* ── ENVIRONMENT BACKGROUND CANVAS & SVG LAYERS ───────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* 1. SKY GRADIENT BACKDROP */}
        <div className={`absolute inset-0 bg-gradient-to-b ${skyStyle} transition-all duration-1000`} />

        {/* 2. SUN & ATMOSPHERIC LIGHTING */}
        {(timeOfDay === 'morning' || timeOfDay === 'afternoon' || timeOfDay === 'dawn') && weatherCategory !== 'rain' && weatherCategory !== 'storm' && (
          <div
            className="absolute rounded-full blur-3xl opacity-40 transition-all duration-1000"
            style={{
              top: timeOfDay === 'dawn' ? '45%' : timeOfDay === 'morning' ? '15%' : '10%',
              left: timeOfDay === 'dawn' ? '20%' : timeOfDay === 'morning' ? '40%' : '65%',
              width: '320px',
              height: '320px',
              background: timeOfDay === 'dawn' ? 'radial-gradient(circle, #f97316 0%, transparent 70%)' : 'radial-gradient(circle, #fef08a 0%, transparent 70%)',
            }}
          />
        )}

        {/* 3. MOONLIGHT AT NIGHT */}
        {timeOfDay === 'night' && weatherCategory !== 'storm' && (
          <div className="absolute top-12 right-16 w-24 h-24 rounded-full bg-slate-100/20 blur-xl pointer-events-none" />
        )}

        {/* 4. MOVING CLOUDS (PARALLAX LAYERS) */}
        {(weatherCategory === 'partly_cloudy' || weatherCategory === 'cloudy' || weatherCategory === 'rain' || weatherCategory === 'storm') && (
          <div className={`absolute inset-x-0 top-0 h-96 pointer-events-none opacity-60 ${motionEnabled ? 'animate-pulse duration-[10000ms]' : ''}`}>
            {/* Far cloud layer */}
            <svg className="absolute top-4 -left-20 w-[1200px] h-32 fill-current text-white/30 dark:text-slate-400/20" viewBox="0 0 1000 100">
              <path d="M0 60 Q 150 20 300 60 T 600 60 T 900 60 L 1000 100 L 0 100 Z" />
            </svg>
            {/* Near cloud layer */}
            <svg className="absolute top-16 -right-10 w-[1400px] h-44 fill-current text-white/40 dark:text-slate-500/25" viewBox="0 0 1000 100">
              <path d="M0 70 Q 200 30 400 70 T 800 70 L 1000 100 L 0 100 Z" />
            </svg>
          </div>
        )}

        {/* 5. DISTANT HILLS & TREELINE (DEPTH LAYER) */}
        <div className="absolute inset-x-0 bottom-36 sm:bottom-48 h-48 pointer-events-none opacity-80">
          <svg className="w-full h-full preserve-3d" viewBox="0 0 1440 240" preserveAspectRatio="none">
            {/* Far Aravalli-style rolling hills */}
            <path
              fill={timeOfDay === 'night' ? '#0f172a' : timeOfDay === 'evening' ? '#451a03' : '#15803d'}
              fillOpacity={timeOfDay === 'night' ? '0.6' : '0.35'}
              d="M0,160 C320,100 480,210 800,140 C1120,70 1280,180 1440,120 L1440,240 L0,240 Z"
            />
            {/* Midground treeline & farm ridge */}
            <path
              fill={timeOfDay === 'night' ? '#022c22' : timeOfDay === 'evening' ? '#365314' : '#166534'}
              fillOpacity={timeOfDay === 'night' ? '0.8' : '0.65'}
              d="M0,190 C240,150 480,220 720,170 C960,120 1200,200 1440,160 L1440,240 L0,240 Z"
            />
          </svg>
        </div>

        {/* 6. REALISTIC CROP FIELD & ANIMATED CROP ROWS */}
        <div className="absolute inset-x-0 bottom-0 h-44 sm:h-64 pointer-events-none">
          {/* Ground soil gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: timeOfDay === 'night'
                ? 'linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(2, 44, 34, 1))'
                : 'linear-gradient(to bottom, rgba(20, 83, 45, 0.4), rgba(69, 26, 3, 0.7), rgba(42, 15, 3, 0.95))',
            }}
          />

          {/* Animated SVG Crop Rows swaying with wind */}
          <svg className="w-full h-full absolute inset-0" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cropGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#14532d" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="cropGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#84cc16" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#3f6212" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Back Crop Row */}
            <path
              fill="url(#cropGrad1)"
              className={motionEnabled ? 'origin-bottom transition-transform duration-700' : ''}
              style={{
                animation: motionEnabled ? `fieldWindBack ${windAnimDuration} ease-in-out infinite alternate` : 'none',
              }}
              d="M0,120 Q180,90 360,120 T720,110 T1080,125 T1440,115 L1440,320 L0,320 Z"
            />

            {/* Middle Crop Row */}
            <path
              fill="url(#cropGrad2)"
              className={motionEnabled ? 'origin-bottom transition-transform duration-700' : ''}
              style={{
                animation: motionEnabled ? `fieldWindMid ${windAnimDuration} ease-in-out infinite alternate 0.4s` : 'none',
              }}
              d="M0,170 Q240,140 480,175 T960,160 T1440,170 L1440,320 L0,320 Z"
            />

            {/* Foreground Crop Plants */}
            <path
              fill="#166534"
              className={motionEnabled ? 'origin-bottom transition-transform duration-700' : ''}
              style={{
                animation: motionEnabled ? `fieldWindFront ${windAnimDuration} ease-in-out infinite alternate 0.8s` : 'none',
              }}
              d="M0,220 Q200,190 400,230 T800,210 T1200,230 T1440,220 L1440,320 L0,320 Z"
            />
          </svg>
        </div>

        {/* 7. RAIN PARTICLES OVER FIELD (when raining) */}
        {(weatherCategory === 'rain' || weatherCategory === 'storm') && motionEnabled && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-75">
            <div className="rain-layer absolute inset-0" />
          </div>
        )}

        {/* 8. FOG / MIST OVERLAY */}
        {weatherCategory === 'fog' && (
          <div className="absolute inset-0 bg-stone-200/30 dark:bg-stone-900/40 backdrop-blur-[2px] pointer-events-none" />
        )}
      </div>

      {/* ── WIND ANIMATION KEYFRAMES (CSS INLINED FOR GPU PERFORMANCE) ──────── */}
      <style>{`
        @keyframes fieldWindBack {
          0% { transform: skewX(0deg) scaleY(1); }
          100% { transform: skewX(-2.5deg) scaleY(0.98); }
        }
        @keyframes fieldWindMid {
          0% { transform: skewX(0deg) scaleY(1); }
          100% { transform: skewX(-4deg) scaleY(0.97); }
        }
        @keyframes fieldWindFront {
          0% { transform: skewX(0deg) scaleY(1); }
          100% { transform: skewX(-6.5deg) scaleY(0.96); }
        }
        @keyframes fallingRain {
          0% { background-position: 0 0; }
          100% { background-position: -40px 600px; }
        }
        .rain-layer {
          background-image: repeating-linear-gradient(
            170deg,
            rgba(255, 255, 255, 0.4) 0px,
            rgba(255, 255, 255, 0.4) 2px,
            transparent 2px,
            transparent 18px
          );
          animation: fallingRain 0.6s linear infinite;
        }
      `}</style>

      {/* ── FOREGROUND CONTENT OVERLAY ─────────────────────────────────────── */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
