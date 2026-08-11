import React from 'react';
import { Droplets, Sun, Wind, Compass, Gauge, Sunrise, Sunset } from 'lucide-react';
import { ILiveWeather } from '../../domain/models/WeatherModels';

interface WeatherMetricsGridProps {
  live: ILiveWeather;
  formatTemp: (celsius: number) => string;
  rainProbability?: number;
}

/**
 * Premium CRED/Apple Inspired Weather Metrics Gauge Grid.
 * Displays 6 detailed agricultural environmental sensors using SVG-based micro-visualizations.
 */
export const WeatherMetricsGrid: React.FC<WeatherMetricsGridProps> = ({ live, formatTemp, rainProbability }) => {
  const rainProb =
    typeof rainProbability === 'number' && Number.isFinite(rainProbability)
      ? Math.min(100, Math.max(0, Math.round(rainProbability)))
      : null;

  const getUvLevel = (uv: number) => {
    if (uv <= 2) return { label: 'Low', color: 'text-emerald-400', stroke: '#34d399', bg: 'bg-emerald-500/20' };
    if (uv <= 5) return { label: 'Mod', color: 'text-amber-400', stroke: '#fbbf24', bg: 'bg-amber-500/20' };
    if (uv <= 7) return { label: 'High', color: 'text-orange-400', stroke: '#fb923c', bg: 'bg-orange-500/20' };
    if (uv <= 10) return { label: 'V. High', color: 'text-rose-400', stroke: '#f87171', bg: 'bg-rose-500/20' };
    return { label: 'Extreme', color: 'text-purple-400', stroke: '#c084fc', bg: 'bg-purple-500/20' };
  };
  const uvVal = typeof live?.uvIndex === 'number' ? live.uvIndex : 0;
  const uvLevel = getUvLevel(uvVal);
  const uvAngle = Math.min(180, Math.max(0, (uvVal / 12) * 180));
  const uvNeedleRad = Math.PI - (uvAngle * Math.PI) / 180;
  const uvNeedleX = 40 + 26 * Math.cos(uvNeedleRad);
  const uvNeedleY = 45 - 26 * Math.sin(uvNeedleRad);

  const getTurbineSpinClass = (speed: number) => {
    if (speed < 8) return 'animate-turbine-spin-slow';
    if (speed < 18) return 'animate-turbine-spin-normal';
    return 'animate-turbine-spin-fast';
  };
  const turbineSpinClass = getTurbineSpinClass(live?.windSpeed || 0);

  const clampedPressure = Math.min(1040, Math.max(980, live?.pressureHpa || 1013));
  const pressureRatio = (clampedPressure - 980) / (1040 - 980);
  const pressureAngle = pressureRatio * 180;
  const pressureNeedleRad = Math.PI - (pressureAngle * Math.PI) / 180;
  const pressureNeedleX = 40 + 26 * Math.cos(pressureNeedleRad);
  const pressureNeedleY = 45 - 26 * Math.sin(pressureNeedleRad);

  const progressPercent = typeof live?.daylightProgressPercent === 'number' ? live.daylightProgressPercent : 50;
  const progressRad = (progressPercent / 100) * Math.PI;
  const sunX = 64 - 44 * Math.cos(progressRad);
  const sunY = 55 - 44 * Math.sin(progressRad);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      
      {/* 1. Rain Chance Beaker Card */}
      <div className="bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all group duration-300">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider">Rain Chance</span>
          <Droplets size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
        </div>
        
        <div className="flex items-center justify-between my-1">
          <div>
            <span className="text-3xl font-black text-white">{rainProb != null ? `${rainProb}%` : '—'}</span>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              {rainProb == null ? 'Data unavailable' : rainProb >= 50 ? 'Rainfall expected' : 'Precipitation unlikely'}
            </p>
          </div>

          {/* Liquid Water Drop Graphic */}
          <div className="shrink-0 pl-2">
            <svg width="34" height="44" viewBox="0 0 30 40" className="overflow-visible select-none">
              <defs>
                <clipPath id="dropClip">
                  <path d="M15 3 C15 3 27 18 27 27 C27 34 21.5 39 15 39 C8.5 39 3 34 3 27 C3 18 15 3 15 3 Z" />
                </clipPath>
                <linearGradient id="rainDropFill" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              {/* Background empty path */}
              <path d="M15 3 C15 3 27 18 27 27 C27 34 21.5 39 15 39 C8.5 39 3 34 3 27 C3 18 15 3 15 3 Z" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
              {/* Clip path filled liquid */}
              <g clipPath="url(#dropClip)">
                <rect x="0" y={rainProb != null ? 40 - (rainProb / 100) * 36 : 40} width="30" height="40" fill="url(#rainDropFill)" className="transition-all duration-1000" />
              </g>
            </svg>
          </div>
        </div>

        {/* Moisture Horizontal progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000"
            style={{ width: `${rainProb != null ? rainProb : 0}%` }}
          />
        </div>
      </div>

      {/* 2. UV Index Dashboard Arc Card */}
      <div className="bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all group duration-300">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider">UV Index</span>
          <Sun size={16} className="text-amber-400 animate-spin-slow" />
        </div>
        
        <div className="flex items-center justify-between my-0.5">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{uvVal > 0 ? uvVal : '—'}</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${uvVal > 0 ? uvLevel.bg : 'bg-white/10'} ${uvVal > 0 ? uvLevel.color : 'text-slate-400'}`}>
                {uvVal > 0 ? uvLevel.label : 'N/A'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-tight">
              {uvVal > 0 ? (uvVal >= 6 ? 'Sun protection advised' : 'Safe solar exposure') : 'Not measured locally'}
            </p>
          </div>

          {/* UV Semi-circle Dial Gauge */}
          <div className="shrink-0 relative w-[80px] h-[50px] overflow-hidden select-none">
            <svg width="80" height="50" className="absolute top-0 left-0">
              <defs>
                <linearGradient id="uvDialGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              {/* Dial Track */}
              <path d="M 12 45 A 28 28 0 0 1 68 45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeLinecap="round" />
              <path d="M 12 45 A 28 28 0 0 1 68 45" fill="none" stroke="url(#uvDialGrad)" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
              
              {/* Needle center anchor */}
              <circle cx="40" cy="45" r="3" fill="#ffffff" />
              
              {/* Needle pointer */}
              <line x1="40" y1="45" x2={uvNeedleX} y2={uvNeedleY} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
          </div>
        </div>

        {/* Small range marker */}
        <div className="flex justify-between text-[9px] text-slate-500 font-bold mt-2 border-t border-white/5 pt-1.5">
          <span>0 (Low)</span>
          <span>11+ (Ext)</span>
        </div>
      </div>

      {/* 3. Wind Turbine & Compass Card */}
      <div className="bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/5 transition-all group duration-300">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider">Wind & Direction</span>
          <Wind size={16} className="text-teal-400" />
        </div>
        
        <div className="flex items-center justify-between my-0.5">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{live.windSpeed}</span>
              <span className="text-[10px] text-slate-400 font-bold">km/h</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-tight">
              Direction: <strong className="text-teal-300">{live.windDirection} ({live.windDegrees}°)</strong>
            </p>
          </div>

          {/* Turbine + Compass Graphic container */}
          <div className="flex items-center gap-1.5 select-none shrink-0 pl-1">
            {/* Spinning wind turbine */}
            <svg width="32" height="42" viewBox="0 0 30 40" className="overflow-visible text-slate-400">
              {/* Tower */}
              <line x1="15" y1="15" x2="15" y2="40" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              {/* Rotating Blades */}
              <g className={turbineSpinClass} style={{ transformOrigin: '15px 15px' }}>
                <circle cx="15" cy="15" r="1.5" fill="#fff" />
                <path d="M 15 15 L 15 2 C 14 6, 16 6, 15 15" fill="rgba(255,255,255,0.85)" />
                <path d="M 15 15 L 26 21 C 23 18, 22 20, 15 15" fill="rgba(255,255,255,0.85)" />
                <path d="M 15 15 L 4 21 C 7 20, 6 18, 15 15" fill="rgba(255,255,255,0.85)" />
              </g>
            </svg>

            {/* Compass dial */}
            <svg width="34" height="34" viewBox="0 0 30 30" className="overflow-visible">
              <circle cx="15" cy="15" r="13" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              {/* Compass Needle */}
              <g transform={`rotate(${live.windDegrees}, 15, 15)`} className="transition-transform duration-1000">
                <polygon points="15,4 18,15 15,12 12,15" fill="#f43f5e" />
                <polygon points="15,26 18,15 15,12 12,15" fill="rgba(255,255,255,0.6)" />
              </g>
            </svg>
          </div>
        </div>

        {/* Advisory condition for farming */}
        <div className="text-[9px] text-slate-500 font-bold border-t border-white/5 pt-1.5 mt-2">
          {live.windSpeed <= 15 ? '✓ Good for chemical spray' : '⚠️ Too windy for spraying'}
        </div>
      </div>

      {/* 4. Humidity Circular Ring Card */}
      <div className="bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition-all group duration-300">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider">Humidity</span>
          <Droplets size={16} className="text-cyan-400 animate-pulse" />
        </div>
        
        <div className="flex items-center justify-between my-0.5">
          <div>
            <span className="text-3xl font-black text-white">{live.humidity}%</span>
            <p className="text-[10px] text-slate-400 mt-1 leading-tight">
              Dew point: <strong className="text-white">{formatTemp(live.dewPoint)}</strong>
            </p>
          </div>

          {/* Circular Progress Ring */}
          <div className="shrink-0 relative w-[48px] h-[48px] flex items-center justify-center select-none">
            <svg width="48" height="48" className="transform -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3.5"
                strokeDasharray="125.6"
                strokeDashoffset={125.6 - (live.humidity / 100) * 125.6}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-[10px] font-black text-cyan-300">
              {live.humidity}%
            </div>
          </div>
        </div>

        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-1000"
            style={{ width: `${live.humidity}%` }}
          />
        </div>
      </div>

      {/* 5. Barometric Pressure Dial Card */}
      <div className="bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5 transition-all group duration-300">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider">Barometer</span>
          <Gauge size={16} className="text-purple-400 group-hover:rotate-12 transition-transform" />
        </div>
        
        <div className="flex items-center justify-between my-0.5">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{live.pressureHpa}</span>
              <span className="text-[10px] text-slate-400 font-bold">hPa</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 leading-tight">
              <span>Trend:</span>
              <strong className={`font-black ${
                live.pressureTrend === 'Rising' ? 'text-emerald-400' :
                live.pressureTrend === 'Falling' ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {live.pressureTrend} {live.pressureTrend === 'Rising' ? '↗' : live.pressureTrend === 'Falling' ? '↘' : '→'}
              </strong>
            </p>
          </div>

          {/* Barometric Arc Dial Gauge */}
          <div className="shrink-0 relative w-[80px] h-[50px] overflow-hidden select-none">
            <svg width="80" height="50" className="absolute top-0 left-0">
              <defs>
                <linearGradient id="pressureGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path d="M 12 45 A 28 28 0 0 1 68 45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeLinecap="round" />
              <path d="M 12 45 A 28 28 0 0 1 68 45" fill="none" stroke="url(#pressureGrad)" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
              <circle cx="40" cy="45" r="3" fill="#ffffff" />
              <line x1="40" y1="45" x2={pressureNeedleX} y2={pressureNeedleY} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
          </div>
        </div>

        {/* Lower and upper range markers */}
        <div className="flex justify-between text-[9px] text-slate-500 font-bold mt-2 border-t border-white/5 pt-1.5">
          <span>980 hPa</span>
          <span>1040 hPa</span>
        </div>
      </div>

      {/* 6. Sun Trajectory Solar Arc Card */}
      <div className="bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all group duration-300 col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider">Sun trajectory</span>
          <div className="flex items-center gap-1 text-amber-400">
            <Sunrise size={14} />
            <Sunset size={14} className="opacity-70" />
          </div>
        </div>
        
        {/* Semi-Circle Sky Arc Visual */}
        <div className="relative my-1 py-1 flex flex-col items-center">
          <div className="w-[128px] h-[55px] overflow-visible relative flex items-end justify-center select-none">
            
            {/* Dashed Sky Track SVG */}
            <svg width="128" height="55" className="absolute top-0 left-0 overflow-visible text-amber-500/40">
              <path
                d="M 20 55 A 44 44 0 0 1 108 55"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
              
              {/* Dynamic Sun Node position calculated on the arc */}
              <g transform={`translate(${sunX}, ${sunY})`}>
                {/* Pulsing solar halo glow */}
                <circle cx="0" cy="0" r="8" fill="rgba(245, 158, 11, 0.4)" className="animate-pulse" />
                {/* Central glowing sun node */}
                <circle cx="0" cy="0" r="4.5" fill="#f59e0b" className="drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
              </g>
            </svg>
            
            <span className="text-[9px] text-slate-300 pb-1 font-extrabold uppercase tracking-wide">
              Daylight {live.daylightProgressPercent}%
            </span>
          </div>

          <div className="w-full flex justify-between text-[9px] font-bold text-white pt-1.5 border-t border-white/10">
            <span className="flex items-center gap-0.5 text-amber-300">⬆ {live.sunriseTime}</span>
            <span className="flex items-center gap-0.5 text-orange-400">⬇ {live.sunsetTime}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

