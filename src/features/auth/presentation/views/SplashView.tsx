import React, { useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';

/**
 * Premium Splash Screen View.
 * Google/Notion/CRED-inspired: glowing logo mark, pulsing rings, staggered tagline
 * chips, and a soft aurora gradient. Auto-advances in under 2.5 seconds while the
 * DI container and user session initialize in the background.
 */
export const SplashView: React.FC<{ onFinish: (isAuthenticated: boolean) => void }> = ({ onFinish }) => {
  const [state] = useAuthViewModel();
  const { t } = useLanguage();

  useEffect(() => {
    if (state.isInitializing) return;
    const timer = setTimeout(() => onFinish(state.isAuthenticated), 2200);
    return () => clearTimeout(timer);
  }, [state.isInitializing, state.isAuthenticated, onFinish]);

  const chips = [t('splash.chipMandi'), t('splash.chipDoctor'), t('splash.chipWeather')];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#0B1F14] text-white">
      {/* Aurora gradient glows */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-emerald-500/30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-amber-500/20 blur-[130px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-lime-400/15 blur-[100px]" />
      {/* Subtle field-grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      {/* Logo mark with expanding rings */}
      <div className="relative flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-40 w-40 animate-ping rounded-full bg-emerald-400/25" style={{ animationDuration: '2.4s' }} />
          <span className="absolute inline-flex h-32 w-32 animate-ping rounded-full bg-emerald-400/15" style={{ animationDuration: '3.2s', animationDelay: '0.4s' }} />
          <div className="animate-scale-in relative">
            <Logo size={116} className="drop-shadow-2xl shadow-emerald-500/40" />
          </div>
        </div>

        {/* Wordmark + tagline */}
        <div className="mt-8 text-center">
          <h1 className="animate-slide-up fill-mode-both text-4xl font-extrabold tracking-tight" style={{ animationDelay: '150ms' }}>
            AgriConnect
          </h1>
          <p
            className="animate-slide-up fill-mode-both mt-2 bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-300 bg-clip-text text-base font-semibold tracking-wide text-transparent"
            style={{ animationDelay: '300ms' }}
          >
            {t('splash.tagline')}
          </p>
        </div>

        {/* Feature chips */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {chips.map((chip, i) => (
            <span
              key={chip}
              className="animate-slide-up fill-mode-both rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-emerald-100 backdrop-blur"
              style={{ animationDelay: `${450 + i * 120}ms` }}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1.5 px-6 text-center">
        <span className="animate-fade-in fill-mode-both text-[11px] font-bold tracking-[0.25em] uppercase text-emerald-300/60" style={{ animationDelay: '900ms' }}>
          {t('splash.madeIn')}
        </span>
        <span className="animate-fade-in fill-mode-both flex items-center gap-1.5 text-[10px] font-medium text-white/40" style={{ animationDelay: '1100ms' }}>
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {t('splash.securing')}
        </span>
      </div>
    </div>
  );
};
