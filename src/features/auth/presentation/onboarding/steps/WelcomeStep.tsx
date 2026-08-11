import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { OnboardingCta } from './common';

/**
 * STEP 1 — Welcome. A warm, farm-illustrated handshake before personalization begins.
 */
export const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const { t } = useLanguage();
  return (
  <div className="flex min-h-full flex-col items-center justify-center text-center">
    <div className="relative flex w-full max-w-sm items-center justify-center">
      <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-400 via-lime-300 to-amber-300 opacity-30 blur-3xl" />
      <svg viewBox="0 0 320 240" className="w-full max-w-[19rem]">
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#BBF7D0" />
            <stop offset="1" stopColor="#FEF3C7" />
          </linearGradient>
          <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4ADE80" />
            <stop offset="1" stopColor="#16A34A" />
          </linearGradient>
        </defs>
        {/* Sky */}
        <rect x="0" y="0" width="320" height="240" rx="48" fill="url(#skyGrad)" />
        {/* Sun */}
        <circle cx="252" cy="54" r="26" fill="#F59E0B" />
        <g stroke="#F59E0B" strokeWidth="6" strokeLinecap="round">
          <path d="M252 14v10M252 84v10M212 54h10M282 54h10M220 22l7 7M277 69l7 7M284 22l-7 7M227 69l-7 7" />
        </g>
        {/* Fields */}
        <path d="M24 200 q68 -44 136 0 t136 0 v40 h-272z" fill="url(#fieldGrad)" />
        <g stroke="#15803D" strokeWidth="5" strokeLinecap="round" opacity="0.7">
          <path d="M40 200q60 -34 120 0t120 0M40 220q60 -34 120 0t120 0" />
        </g>
        {/* Seedlings */}
        <g stroke="#22C55E" strokeWidth="5" strokeLinecap="round">
          <path d="M84 176 l10 -18M94 176 l-10 -18M84 176 l10 0" fill="none" />
          <path d="M228 176 l10 -18M238 176 l-10 -18M228 176 l10 0" fill="none" />
        </g>
        {/* Tractor */}
        <g fill="none" stroke="#1F2937" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="150" cy="176" r="9" />
          <circle cx="188" cy="176" r="9" />
          <path d="M140 168 h58 l16 -22 h-16z" />
          <path d="M150 176 v-6" />
        </g>
        {/* Floating sparkles */}
        <path d="M96 60 l8 10M96 60 l-8 10M96 60 l0 14" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
        <circle cx="176" cy="88" r="4" fill="#34D399" />
      </svg>
    </div>

    <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">{t('onb.welcome.titleA')} <span className="text-emerald-600">{t('onb.welcome.titleAccent')}</span></h1>
    <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
      {t('onb.welcome.subtitle')}
    </p>
    <p className="mt-4 flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1.5 text-[11px] font-bold text-emerald-700">
      {t('onb.welcome.eta')}
    </p>

    <div className="mt-8 w-full">
      <OnboardingCta label={t('onb.welcome.cta')} onClick={onNext} />
    </div>
  </div>
  );
};
