import React from 'react';
import { MapPin, ThermometerSun, Sparkles, RefreshCw, ChevronRight, Wind, Droplets, Sun, Gauge } from 'lucide-react';
import { ILiveWeather, IWeatherLocation } from '../../domain/models/WeatherModels';
import { useLanguage } from '@/contexts/LanguageContext';

interface LiveWeatherHeroCardProps {
  live: ILiveWeather;
  location: IWeatherLocation;
  formatTemp: (celsius: number) => string;
  onRefresh: () => void;
  onOpenDetails: () => void;
  refreshing: boolean;
  isFahrenheit: boolean;
  onToggleUnit: () => void;
}

/**
 * Premium Google Weather Inspired Hero Card.
 * Adapts its visual layout, background gradients, and animations dynamically to the weather.
 */
export const LiveWeatherHeroCard: React.FC<LiveWeatherHeroCardProps> = ({
  live,
  location,
  formatTemp,
  onRefresh,
  onOpenDetails,
  refreshing,
  isFahrenheit,
  onToggleUnit,
}) => {
  const { t } = useLanguage();

  const cond = (live?.condition || '').toLowerCase();

  // Determine background styling, glows, and accents based on weather condition
  const getTheme = () => {
    if (cond.includes('thunderstorm') || cond.includes('storm')) {
      return {
        cardBg: 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 border-purple-800/30 hover:border-purple-500/50 shadow-[0_20px_50px_rgba(88,28,135,0.3)]',
        glowBg: 'bg-purple-500/10',
        textAccent: 'text-purple-300',
        badgeBg: 'bg-purple-500/20 text-purple-200 border-purple-500/30',
        glowColor: 'rgba(147, 51, 234, 0.4)',
      };
    }
    if (cond.includes('heavy') || cond.includes('monsoon') || cond.includes('shower')) {
      return {
        cardBg: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 border-blue-900/30 hover:border-blue-600/50 shadow-[0_20px_50px_rgba(30,58,138,0.35)]',
        glowBg: 'bg-blue-500/10',
        textAccent: 'text-blue-300',
        badgeBg: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
        glowColor: 'rgba(59, 130, 246, 0.4)',
      };
    }
    if (cond.includes('rain') || cond.includes('shower')) {
      return {
        cardBg: 'bg-gradient-to-br from-slate-800 via-cyan-950 to-slate-900 border-cyan-800/30 hover:border-cyan-500/50 shadow-[0_20px_50px_rgba(8,145,178,0.25)]',
        glowBg: 'bg-cyan-500/10',
        textAccent: 'text-cyan-300',
        badgeBg: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30',
        glowColor: 'rgba(6, 182, 212, 0.3)',
      };
    }
    if (cond.includes('loo') || cond.includes('hot') || cond.includes('dry wind')) {
      return {
        cardBg: 'bg-gradient-to-br from-amber-800 via-amber-950 to-rose-950 border-amber-700/30 hover:border-amber-500/50 shadow-[0_20px_50px_rgba(245,158,11,0.25)]',
        glowBg: 'bg-amber-500/15',
        textAccent: 'text-amber-300',
        badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
        glowColor: 'rgba(245, 158, 11, 0.4)',
      };
    }
    if (cond.includes('fog') || cond.includes('mist')) {
      return {
        cardBg: 'bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 border-teal-800/30 hover:border-teal-500/50 shadow-[0_20px_50px_rgba(13,148,136,0.2)]',
        glowBg: 'bg-teal-500/10',
        textAccent: 'text-teal-300',
        badgeBg: 'bg-teal-500/20 text-teal-200 border-teal-500/30',
        glowColor: 'rgba(20, 184, 166, 0.3)',
      };
    }
    if (cond.includes('overcast')) {
      return {
        cardBg: 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-slate-600/30 hover:border-slate-400/50 shadow-[0_20px_50px_rgba(100,116,139,0.2)]',
        glowBg: 'bg-slate-500/10',
        textAccent: 'text-slate-300',
        badgeBg: 'bg-slate-500/20 text-slate-200 border-slate-500/30',
        glowColor: 'rgba(148, 163, 184, 0.25)',
      };
    }
    if (cond.includes('partly cloudy')) {
      return {
        cardBg: 'bg-gradient-to-br from-sky-400/90 via-blue-500/90 to-indigo-600/90 border-sky-300/40 hover:border-sky-200/60 shadow-[0_20px_50px_rgba(14,165,233,0.3)]',
        glowBg: 'bg-sky-200/15',
        textAccent: 'text-sky-200',
        badgeBg: 'bg-white/20 text-white border-white/30',
        glowColor: 'rgba(56, 189, 248, 0.45)',
      };
    }
    // Sunny / Clear
    return {
      cardBg: 'bg-gradient-to-br from-amber-500 via-sky-400 to-blue-500 border-amber-300/45 hover:border-amber-200/65 shadow-[0_20px_50px_rgba(245,158,11,0.35)]',
      glowBg: 'bg-amber-400/20',
      textAccent: 'text-amber-200',
      badgeBg: 'bg-amber-500/20 text-white border-amber-400/40',
      glowColor: 'rgba(251, 191, 36, 0.6)',
    };
  };

  const theme = getTheme();

  // Render animated illustrations similar to Google Weather
  const renderAnimatedVisuals = () => {
    if (cond.includes('thunderstorm') || cond.includes('storm')) {
      return (
        <div className="relative w-32 h-32 flex items-center justify-center pointer-events-none">
          {/* Lightning Flash Overlay simulation */}
          <div className="absolute inset-0 bg-white/25 rounded-full blur-2xl animate-lightning-flash" />
          
          {/* Layered clouds */}
          <svg className="w-16 h-16 text-slate-400 absolute -top-1 left-2 drop-shadow-xl z-20 animate-bounce-slow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
          <svg className="w-20 h-20 text-slate-600/90 absolute bottom-3 right-1 drop-shadow-xl z-10 animate-cloud-slow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
          
          {/* Glowing flickering lightning bolt */}
          <svg className="w-10 h-14 text-yellow-400 absolute bottom-0 left-8 drop-shadow-[0_0_15px_rgba(250,204,21,0.9)] animate-pulse z-30" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v8h4v10l8-12z" />
          </svg>

          {/* Falling heavy rain drops */}
          <div className="absolute inset-x-0 bottom-1 flex justify-around px-5 z-0">
            <span className="w-0.5 h-4 bg-blue-300 rounded-full animate-rain-drop" style={{ animationDelay: '0s', animationDuration: '0.8s' }} />
            <span className="w-0.5 h-5 bg-blue-400 rounded-full animate-rain-drop" style={{ animationDelay: '0.2s', animationDuration: '1s' }} />
            <span className="w-0.5 h-3.5 bg-indigo-300 rounded-full animate-rain-drop" style={{ animationDelay: '0.4s', animationDuration: '0.7s' }} />
          </div>
        </div>
      );
    }

    if (cond.includes('heavy') || cond.includes('monsoon') || cond.includes('shower')) {
      return (
        <div className="relative w-32 h-32 flex items-center justify-center pointer-events-none">
          <div className="absolute w-24 h-24 bg-blue-600/20 rounded-full blur-2xl animate-pulse" />
          
          {/* Thick dark clouds */}
          <svg className="w-22 h-22 text-slate-500 absolute -top-1 right-2 drop-shadow-xl z-20 animate-bounce-slow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
          <svg className="w-18 h-18 text-slate-700/80 absolute bottom-4 left-1 drop-shadow-lg z-10 animate-cloud-slow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>

          {/* Multiple raindrops at offset timings */}
          <div className="absolute inset-x-0 bottom-1 flex justify-between px-4 z-0">
            <span className="w-0.5 h-5 bg-sky-300 rounded-full animate-rain-drop" style={{ animationDelay: '0s', animationDuration: '0.9s' }} />
            <span className="w-0.5 h-6 bg-blue-400 rounded-full animate-rain-drop" style={{ animationDelay: '0.15s', animationDuration: '0.7s' }} />
            <span className="w-0.5 h-4 bg-teal-400 rounded-full animate-rain-drop" style={{ animationDelay: '0.35s', animationDuration: '1.1s' }} />
            <span className="w-0.5 h-5 bg-sky-400 rounded-full animate-rain-drop" style={{ animationDelay: '0.5s', animationDuration: '0.8s' }} />
          </div>
        </div>
      );
    }

    if (cond.includes('rain') || cond.includes('shower')) {
      return (
        <div className="relative w-32 h-32 flex items-center justify-center pointer-events-none">
          <div className="absolute w-20 h-20 bg-cyan-500/25 rounded-full blur-xl animate-pulse" />
          
          <svg className="w-20 h-20 text-slate-200 drop-shadow-xl animate-bounce-slow z-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>

          {/* Rain lines */}
          <div className="absolute inset-x-0 -bottom-1 flex justify-around px-6 z-0">
            <span className="w-0.5 h-4 bg-cyan-400 rounded-full animate-rain-drop" style={{ animationDelay: '0s' }} />
            <span className="w-0.5 h-4.5 bg-blue-400 rounded-full animate-rain-drop" style={{ animationDelay: '0.3s' }} />
            <span className="w-0.5 h-4 bg-teal-300 rounded-full animate-rain-drop" style={{ animationDelay: '0.6s' }} />
          </div>
        </div>
      );
    }

    if (cond.includes('loo') || cond.includes('hot') || cond.includes('dry wind')) {
      return (
        <div className="relative w-32 h-32 flex items-center justify-center pointer-events-none">
          {/* Hot Sun backplate */}
          <div className="absolute w-22 h-22 bg-rose-600/35 rounded-full blur-2xl animate-sun-pulse" />
          
          {/* Rotating Heat Core */}
          <svg className="w-18 h-18 text-amber-500 animate-spin-slow drop-shadow-[0_0_20px_rgba(245,158,11,0.8)] z-10" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>

          {/* Searing Heat Waves */}
          <div className="absolute inset-0 flex flex-col justify-around py-6 px-4 z-20">
            <div className="w-24 h-1 bg-amber-400/40 rounded-full animate-heat-wave" style={{ animationDelay: '0s' }} />
            <div className="w-20 h-1 bg-red-400/30 rounded-full animate-heat-wave ml-6" style={{ animationDelay: '1.2s' }} />
            <div className="w-22 h-1 bg-orange-400/40 rounded-full animate-heat-wave ml-2" style={{ animationDelay: '2.4s' }} />
          </div>

          {/* Blowing Dust Particles */}
          <span className="w-1.5 h-1.5 bg-amber-200 rounded-full absolute bottom-4 left-6 animate-dust-drift" style={{ animationDelay: '0.5s' }} />
          <span className="w-1 h-1 bg-amber-300 rounded-full absolute top-8 right-8 animate-dust-drift" style={{ animationDelay: '1.8s' }} />
        </div>
      );
    }

    if (cond.includes('fog') || cond.includes('mist')) {
      return (
        <div className="relative w-32 h-32 flex items-center justify-center pointer-events-none">
          <div className="absolute w-24 h-24 bg-teal-500/10 rounded-full blur-2xl" />

          {/* Drifting Mist Bands */}
          <div className="w-28 h-2.5 bg-slate-200/40 rounded-full blur-[2px] absolute top-8 -left-2 animate-mist-slow" />
          <div className="w-24 h-3 bg-slate-300/30 rounded-full blur-[3px] absolute top-14 -right-1 animate-mist-medium" style={{ animationDelay: '2s' }} />
          <div className="w-26 h-2 bg-slate-200/50 rounded-full blur-[1px] absolute bottom-8 left-1 animate-mist-slow" style={{ animationDelay: '4s' }} />
          
          {/* Pale obscured cloud */}
          <svg className="w-16 h-16 text-slate-400/50 absolute top-4 right-4 z-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
        </div>
      );
    }

    if (cond.includes('overcast')) {
      return (
        <div className="relative w-32 h-32 flex items-center justify-center pointer-events-none">
          {/* Solid Overlapping Clouds */}
          <svg className="w-20 h-20 text-slate-400 absolute -top-1 left-1 drop-shadow-md animate-cloud-slow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
          <svg className="w-22 h-22 text-slate-500 absolute bottom-3 right-0 drop-shadow-lg animate-cloud-fast" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
        </div>
      );
    }

    if (cond.includes('partly cloudy')) {
      return (
        <div className="relative w-32 h-32 flex items-center justify-center pointer-events-none">
          {/* Sun glowing behind cloud */}
          <div className="absolute top-2 left-6 w-16 h-16 bg-amber-400/40 rounded-full blur-xl animate-sun-pulse" />
          <svg className="w-16 h-16 text-amber-300 absolute top-2 left-6 animate-spin-slow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36l-1.06 1.06a.996.996 0 000 1.41c.39.39 1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41a.992.992 0 00-1.41 0z" />
          </svg>

          {/* Drifting fluffy cloud */}
          <svg className="w-20 h-20 text-slate-100 absolute bottom-3 right-1 drop-shadow-lg animate-cloud-slow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
        </div>
      );
    }

    // Default: Sunny / Clear
    return (
      <div className="relative w-32 h-32 flex items-center justify-center pointer-events-none">
        {/* Pulsing solar aura */}
        <div className="absolute w-26 h-26 bg-amber-400/35 rounded-full blur-2xl animate-sun-pulse" />
        
        {/* Rotating sun icon */}
        <svg className="w-22 h-22 text-amber-300 animate-spin-slow drop-shadow-[0_0_35px_rgba(251,191,36,0.95)]" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  };

  return (
    <div
      onClick={onOpenDetails}
      className={`relative z-20 backdrop-blur-3xl border border-white/20 rounded-[32px] p-6 text-white overflow-hidden transition-all duration-500 hover:-translate-y-1.5 active:scale-[0.98] group cursor-pointer ${theme.cardBg}`}
    >
      {/* Background glowing atmospheric lighting */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" style={{ backgroundColor: theme.glowColor }} />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Location & Unit Controls */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-white border border-white/15 shadow-sm">
            <MapPin size={13} className="text-white animate-pulse" />
            <span className="truncate max-w-[150px] sm:max-w-[200px]">{location.name}</span>
            <span className="opacity-75 font-normal">({location.state})</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            disabled={refreshing}
            className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full transition-all border border-white/10 text-white disabled:opacity-50"
            title={t('wth.refresh')}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleUnit();
          }}
          className="px-3 py-1 bg-white/15 hover:bg-white/25 active:scale-95 rounded-xl text-xs font-black tracking-wider border border-white/20 transition-all shadow-inner"
        >
          {isFahrenheit ? '°F' : '°C'}
        </button>
      </div>

      {/* Center Row: Temperature & Animated Graphic */}
      <div className="flex justify-between items-center relative z-10 my-1">
        <div className="space-y-1">
          <div className="flex items-baseline">
            <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-white drop-shadow-md">
              {formatTemp(live.temp)}
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-extrabold text-white tracking-wide">{live.condition}</span>
            <Sparkles size={16} className="text-white/80 animate-spin-slow" />
          </div>
          
          <p className="text-xs text-white/80 flex items-center gap-1.5 pt-0.5">
            <ThermometerSun size={13} className="text-white" />
            <span>{t('wth.feels')} <strong className="text-white font-bold">{formatTemp(live.feelsLike)}</strong></span>
            <span className="opacity-50">•</span>
            <span>{t('wth.dewPoint')} <strong className="text-white font-bold">{formatTemp(live.dewPoint)}</strong></span>
          </p>
        </div>

        {/* Dynamic SVG Weather Animation */}
        <div className="transform group-hover:scale-110 group-hover:rotate-2 transition-transform duration-500 shrink-0 select-none">
          {renderAnimatedVisuals()}
        </div>
      </div>

      {/* Premium Telemetry Info Row */}
      <div className="grid grid-cols-4 gap-2 bg-black/15 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 mt-5 relative z-10">
        <div className="flex flex-col items-center justify-center text-center">
          <Droplets size={14} className="text-sky-300 mb-1" />
          <span className="text-[10px] text-white/70 font-semibold uppercase">{t('wth.humid')}</span>
          <span className="text-xs font-black text-white">{live.humidity}%</span>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <Wind size={14} className="text-teal-300 mb-1" />
          <span className="text-[10px] text-white/70 font-semibold uppercase">{t('wth.wind')}</span>
          <span className="text-xs font-black text-white">{live.windSpeed}k/h</span>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <Sun size={14} className="text-amber-300 mb-1" />
          <span className="text-[10px] text-white/70 font-semibold uppercase">{t('wth.uv')}</span>
          <span className="text-xs font-black text-white">{live.uvIndex}</span>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <Gauge size={14} className="text-purple-300 mb-1" />
          <span className="text-[10px] text-white/70 font-semibold uppercase">{t('wth.pressure')}</span>
          <span className="text-xs font-black text-white">{live.pressureHpa}</span>
        </div>
      </div>

      {/* Bottom Footer: Advisory Banner */}
      <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between relative z-10 text-xs font-semibold">
        <p className="line-clamp-1 italic text-white/95 max-w-[78%]">
          "{live.conditionDescription}"
        </p>
        <div className="flex items-center gap-1 text-white font-extrabold group-hover:translate-x-1 transition-transform shrink-0">
          <span>Details</span>
          <ChevronRight size={15} />
        </div>
      </div>
    </div>
  );
};

