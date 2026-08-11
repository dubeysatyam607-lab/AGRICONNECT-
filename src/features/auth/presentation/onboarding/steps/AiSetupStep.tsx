import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { generateRecommendations, type IOnboardingData } from '../onboardingData';
import { OnboardingCta } from './common';

/**
 * STEP 8 — AI Setup. Trains the assistant, then reveals the first
 * personalized dashboard: weather, mandi, schemes and suggested tasks.
 */
const LOADING_STEPS = ['onb.ai.load1', 'onb.ai.load2', 'onb.ai.load3', 'onb.ai.load4', 'onb.ai.load5'];

export const AiSetupStep: React.FC<{ data: IOnboardingData; onComplete: () => void }> = ({ data, onComplete }) => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [loadingIndex, setLoadingIndex] = useState(0);
  const recommendations = useMemo(() => generateRecommendations(data, t), [data, t]);
  const firstName = data.fullName.trim().split(' ')[0] || t('onb.ai.farmer');

  useEffect(() => {
    if (phase !== 'loading') return;
    const stepTimer = setInterval(() => setLoadingIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1)), 640);
    const done = setTimeout(() => setPhase('ready'), 2900);
    return () => {
      clearInterval(stepTimer);
      clearTimeout(done);
    };
  }, [phase]);

  if (phase === 'loading') {
    return (
      <div className="flex min-h-full flex-col items-center justify-center py-10 text-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute h-36 w-36 animate-ping rounded-full bg-emerald-400/20" style={{ animationDuration: '2.4s' }} />
          <span className="absolute h-28 w-28 animate-ping rounded-full bg-emerald-400/15" style={{ animationDuration: '3.2s', animationDelay: '0.4s' }} />
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-xl shadow-emerald-500/30 animate-scale-in">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8" />
            </svg>
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">{t('onb.ai.preparing')}</h2>
        <p className="mt-2 text-sm text-slate-500">{t(LOADING_STEPS[loadingIndex])}</p>
        <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500"
            style={{ width: `${Math.round(((loadingIndex + 1) / LOADING_STEPS.length) * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-2">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-700">
          {t('onb.ai.badge')}
        </span>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
          {interpolate(t('onb.ai.ready'), { name: firstName })}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t('onb.ai.readySub')}</p>
      </div>

      <div className="mt-5 space-y-3">
        {/* Weather */}
        <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-sky-400 to-indigo-400 p-4 text-white shadow-lg shadow-sky-500/20">
          <span className="text-4xl">{recommendations.weather.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold leading-none">{recommendations.weather.temp}</p>
            <p className="mt-1 text-sm font-bold">{recommendations.weather.title}</p>
            <p className="mt-0.5 truncate text-xs text-white/80">{recommendations.weather.detail}</p>
          </div>
        </div>

        {/* Mandi */}
        <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-400 p-4 text-white shadow-lg shadow-amber-500/20">
          <span className="text-4xl">🌾</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-50/80">{t('onb.ai.mandiToday')}</p>
            <p className="text-xl font-extrabold leading-none">{recommendations.mandi.crop}</p>
            <p className="mt-0.5 text-xs text-white/80">
              {interpolate(t('rec.mandi.line'), { price: recommendations.mandi.price, market: recommendations.mandi.market })}
            </p>
          </div>
        </div>

        {/* Schemes */}
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{t('onb.ai.schemes')}</p>
          <div className="mt-2.5 space-y-2">
            {recommendations.schemes.map((s) => (
              <div key={s.title} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-700">✓</span>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">{s.title}</p>
                  <p className="text-[11px] text-slate-500">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested tasks */}
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{t('onb.ai.tasks')}</p>
          <ul className="mt-2.5 space-y-2">
            {recommendations.tasks.slice(0, 3).map((task) => (
              <li key={task} className="flex items-start gap-2.5">
                <span className="mt-0.5 text-sm">🌱</span>
                <span className="text-xs font-semibold leading-relaxed text-slate-600">{task}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <OnboardingCta label={t('onb.ai.open')} onClick={onComplete} />
      </div>
    </div>
  );
};
