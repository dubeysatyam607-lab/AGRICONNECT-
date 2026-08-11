import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import {
  generateRecommendations,
  loadOnboardingData,
} from '@/features/auth/presentation/onboarding/onboardingData';

const DISMISS_KEY = 'agri_firstday_dismissed';

// Regional greeting — Namaste is a pan-Indian safe default.
const GREETINGS: Record<string, string> = {
  en: 'Namaste',
  hi: 'नमस्ते',
  pa: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
  ta: 'வணக்கம்',
  te: 'నమస్తే',
  bn: 'নমস্কার',
  gu: 'નમસ્તે',
  mr: 'नमस्कार',
  kn: 'ನಮಸ್ಕಾರ',
  ml: 'നമസ്കാരം',
  or: 'ନମସ୍କାର',
  as: 'নমস্কাৰ',
};

/**
 * First-day board shown right after the 8-step onboarding: the AI's
 * personalized weather, mandi, schemes and tasks for this farmer's farm.
 * Dismissible — appears only once after the journey completes.
 */
export const FirstDayBoard: React.FC<{ onGo: (tab: string) => void }> = ({ onGo }) => {
  const { language, t } = useLanguage();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const board = useMemo(() => {
    try {
      const seen = localStorage.getItem('agri_onboarding_seen') === 'true';
      const complete = localStorage.getItem('agri_profile_complete') === 'true';
      if (!seen || !complete) return null;
      const data = loadOnboardingData(language);
      const firstName = data.fullName.trim().split(' ')[0] || t('onb.ai.farmer');
      return { recs: generateRecommendations(data, t), firstName };
    } catch {
      return null;
    }
  }, [language, t]);

  if (dismissed || !board) return null;

  const greeting = GREETINGS[language] ?? 'Namaste';
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <section aria-label={t('fd.aria')} className="px-4 mt-5 animate-fade-in fill-mode-both">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-5 text-white shadow-colorful">
        <span className="pointer-events-none absolute -top-10 -right-8 text-7xl opacity-15 select-none" aria-hidden="true">🌾</span>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100">{t('fd.badge')}</p>
            <h2 className="mt-1 font-display text-[19px] font-bold leading-tight">
              {interpolate(t('fd.ready'), { greeting, name: board.firstName })}
            </h2>
          </div>
          <button
            onClick={dismiss}
            aria-label={t('fd.dismissAria')}
            className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white/90 active:scale-95 transition-transform"
          >
            {t('fd.dismiss')}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => onGo('weather')} className="rounded-2xl bg-white/14 p-3 text-left active:scale-[0.97] transition-transform">
            <span className="text-lg">{board.recs.weather.emoji}</span>
            <p className="mt-0.5 text-[15px] font-black leading-none">{board.recs.weather.temp}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-50/90">{board.recs.weather.title}</p>
          </button>
          <button onClick={() => onGo('mandi')} className="rounded-2xl bg-white/14 p-3 text-left active:scale-[0.97] transition-transform">
            <span className="text-lg">🌾</span>
            <p className="mt-0.5 text-[15px] font-black leading-none">{board.recs.mandi.crop}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-emerald-50/90">{interpolate(t('fd.priceQtl'), { price: board.recs.mandi.price, market: board.recs.mandi.market })}</p>
          </button>
          <button onClick={() => onGo('schemes')} className="col-span-2 flex items-center gap-3 rounded-2xl bg-white/14 p-3 text-left active:scale-[0.98] transition-transform">
            <span className="text-lg">🏛️</span>
            <div className="min-w-0">
              <p className="text-[12px] font-bold">{t('fd.schemes')}</p>
              <p className="truncate text-[11px] font-semibold text-emerald-50/90">
                {board.recs.schemes.slice(0, 3).map((s) => s.title).join(' · ')}
              </p>
            </div>
          </button>
          <button onClick={() => onGo('crop-calendar')} className="col-span-2 flex items-center gap-3 rounded-2xl bg-white/14 p-3 text-left active:scale-[0.98] transition-transform">
            <span className="text-lg">✅</span>
            <div className="min-w-0">
              <p className="text-[12px] font-bold">{t('fd.suggested')}</p>
              <p className="truncate text-[11px] font-semibold text-emerald-50/90">{board.recs.tasks[0]}</p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};
