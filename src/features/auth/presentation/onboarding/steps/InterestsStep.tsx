import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { INTEREST_OPTIONS, type IOnboardingData } from '../onboardingData';
import { OnboardingCta, StepTitle } from './common';
import { optChipOptions } from '@/i18n/options';

/**
 * STEP 6 — Interests. Curates the home dashboard tiles each farmer sees.
 */
export const InterestsStep: React.FC<{
  data: IOnboardingData;
  set: (patch: Partial<IOnboardingData>) => void;
  onNext: () => void;
}> = ({ data, set, onNext }) => {
  const { t } = useLanguage();
  const canNext = data.interests.length > 0;
  const options = optChipOptions(t, INTEREST_OPTIONS);

  return (
    <div>
      <StepTitle
        badge={t('onb.int.badge')}
        title={t('onb.int.title')}
        subtitle={t('onb.int.subtitle')}
      />

      <div className="grid grid-cols-1 gap-2.5">
        {options.map((interest) => {
          const active = data.interests.includes(interest.id);
          return (
            <button
              key={interest.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                const next = active
                  ? data.interests.filter((i) => i !== interest.id)
                  : [...data.interests, interest.id];
                set({ interests: next });
              }}
              className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-all duration-150 active:scale-[0.98] ${
                active ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-lime-100 text-xl">
                {interest.emoji}
              </span>
              <span className="flex-1 text-sm font-extrabold text-slate-800">{interest.label}</span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                  active ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <OnboardingCta label={t('common.continue')} disabled={!canNext} onClick={onNext} />
        <button
          type="button"
          onClick={onNext}
          className="mt-2 w-full py-2 text-center text-xs font-bold text-slate-400 transition-colors hover:text-slate-600"
        >
          {t('onb.int.skip')}
        </button>
      </div>
    </div>
  );
};
