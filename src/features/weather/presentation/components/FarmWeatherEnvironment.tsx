import React, { useMemo, useState, useEffect } from 'react';
import { WeatherConditionType } from '../../domain/models/WeatherModels';

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
 * World-Class Photorealistic Agriculture Farm Weather Environment.
 * Blends real high-resolution smart farm photography with dynamic atmospheric time-of-day solar palettes
 * (Golden Dawn, Emerald Farm Daylight, Crimson Twilight, Starry Midnight, and Monsoon Dew),
 * live weather particles (falling rain, lightning, mist haze), and swaying crop fields.
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

  // Resolve photorealistic background imagery & dynamic atmospheric gradient overlays
  const theme = useMemo(() => {
    let photoSrc = '/images/smart-farm-hero.jpg';
    let gradientOverlay = 'from-[#062c43]/70 via-[#055147]/70 to-[#022c22]/85'; // Emerald farm daytime

    if (weatherCategory === 'storm') {
      photoSrc = '/images/paddy-smart-farm.jpg';
      gradientOverlay = 'from-[#040812]/92 via-[#0f172a]/92 to-[#1e1b4b]/95';
    } else if (weatherCategory === 'rain') {
      photoSrc = '/images/paddy-smart-farm.jpg';
      gradientOverlay = 'from-[#06141d]/85 via-[#0e2a36]/85 to-[#052e2b]/90';
    } else if (weatherCategory === 'fog') {
      photoSrc = '/images/wheat-smart-farm.jpg';
      gradientOverlay = 'from-[#0b131a]/85 via-[#1c2a36]/85 to-[#0e1f26]/90';
    } else {
      switch (timeOfDay) {
        case 'dawn':
          photoSrc = '/images/wheat-smart-farm.jpg';
          gradientOverlay = 'from-[#2a1306]/85 via-[#451a03]/75 to-[#78350f]/85';
          break;
        case 'morning':
        case 'afternoon':
          photoSrc = temperature > 36 ? '/images/wheat-smart-farm.jpg' : '/images/smart-farm-hero.jpg';
          gradientOverlay = temperature > 36
            ? 'from-[#451a03]/70 via-[#1e293b]/80 to-[#022c22]/90'
            : 'from-[#062c43]/70 via-[#055147]/70 to-[#022c22]/85';
          break;
        case 'evening':
          photoSrc = '/images/wheat-smart-farm.jpg';
          gradientOverlay = 'from-[#1f0a24]/85 via-[#4a1236]/80 to-[#9a3412]/85';
          break;
        case 'night':
        default:
          photoSrc = '/images/paddy-smart-farm.jpg';
          gradientOverlay = 'from-[#030712]/90 via-[#0b1329]/90 to-[#022c22]/90';
          break;
      }
    }

    return { photoSrc, gradientOverlay };
  }, [timeOfDay, weatherCategory, temperature]);

  // Calculated wind duration for CSS animation (lower = faster)
  const windAnimDuration = useMemo(() => {
    if (windSpeed <= 2) return '12s';
    if (windSpeed <= 8) return '7s';
    if (windSpeed <= 15) return '4s';
    return '2.5s';
  }, [windSpeed]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-1000">
      {/* ── ENVIRONMENT BACKGROUND CANVAS & PHOTOREALISTIC LAYERS ───────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        {/* 1. PHOTOREALISTIC FARM SCENERY BACKDROP */}
        <div
          className="absolute inset-0 bg-cover bg-center filter contrast-105 brightness-95 scale-105 transition-all duration-1000"
          style={{ backgroundImage: `url(${theme.photoSrc})` }}
        />

        {/* 2. DYNAMIC ATMOSPHERIC TIME-OF-DAY & WEATHER GRADIENT OVERLAY */}
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradientOverlay} transition-all duration-1000`} />

        {/* 3. SOLAR FLARE / ATMOSPHERIC GLOW */}
        {(timeOfDay === 'morning' || timeOfDay === 'afternoon' || timeOfDay === 'dawn') && weatherCategory !== 'rain' && weatherCategory !== 'storm' && (
          <div
            className="absolute rounded-full blur-3xl opacity-35 transition-all duration-1000 pointer-events-none"
            style={{
              top: timeOfDay === 'dawn' ? '40%' : '10%',
              left: timeOfDay === 'dawn' ? '15%' : '60%',
              width: '400px',
              height: '400px',
              background: timeOfDay === 'dawn'
                ? 'radial-gradient(circle, rgba(249, 115, 22, 0.4) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(254, 240, 138, 0.4) 0%, transparent 70%)',
            }}
          />
        )}

        {/* 4. MOONLIGHT & STARRY ATMOSPHERE AT NIGHT */}
        {timeOfDay === 'night' && weatherCategory !== 'storm' && (
          <>
            <div className="absolute top-12 right-16 w-32 h-32 rounded-full bg-indigo-200/20 blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
          </>
        )}

        {/* 5. PARALLAX DRIFTING CLOUDS */}
        {(weatherCategory === 'partly_cloudy' || weatherCategory === 'cloudy' || weatherCategory === 'rain' || weatherCategory === 'storm') && (
          <div className={`absolute inset-x-0 top-0 h-96 pointer-events-none opacity-50 ${motionEnabled ? 'animate-pulse duration-[10000ms]' : ''}`}>
            <svg className="absolute top-4 -left-20 w-[1200px] h-32 fill-current text-white/20 dark:text-slate-400/15" viewBox="0 0 1000 100">
              <path d="M0 60 Q 150 20 300 60 T 600 60 T 900 60 L 1000 100 L 0 100 Z" />
            </svg>
            <svg className="absolute top-16 -right-10 w-[1400px] h-44 fill-current text-white/25 dark:text-slate-500/20" viewBox="0 0 1000 100">
              <path d="M0 70 Q 200 30 400 70 T 800 70 L 1000 100 L 0 100 Z" />
            </svg>
          </div>
        )}

        {/* 6. REALISTIC BASE CROP FIELD & ANIMATED CROP ROWS */}
        <div className="absolute inset-x-0 bottom-0 h-44 sm:h-64 pointer-events-none">
          {/* Ground soil blend */}
          <div
            className="absolute inset-0"
            style={{
              background: timeOfDay === 'night'
                ? 'linear-gradient(to bottom, transparent, rgba(3, 7, 18, 0.95))'
                : 'linear-gradient(to bottom, transparent, rgba(69, 26, 3, 0.8), rgba(42, 15, 3, 0.95))',
            }}
          />

          {/* Animated SVG Crop Rows swaying with wind */}
          <svg className="w-full h-full absolute inset-0 opacity-85" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cropGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#14532d" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="cropGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#84cc16" stopOpacity="0.9" />
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

        {/* 7. RAIN PARTICLES OVER FIELD (when raining or storm) */}
        {(weatherCategory === 'rain' || weatherCategory === 'storm') && motionEnabled && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-75">
            <div className="rain-layer absolute inset-0" />
          </div>
        )}

        {/* 8. FOG / MIST OVERLAY */}
        {weatherCategory === 'fog' && (
          <div className="absolute inset-0 bg-stone-200/25 dark:bg-stone-900/35 backdrop-blur-[2px] pointer-events-none" />
        )}
      </div>

      {/* ── WIND & WEATHER ANIMATION KEYFRAMES ───────────────────────── */}
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

