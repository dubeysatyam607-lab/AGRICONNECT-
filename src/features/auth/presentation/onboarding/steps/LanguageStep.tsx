import React from 'react';
import { useLanguage, type Language } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { Chip, OnboardingCta, StepTitle } from './common';

/**
 * STEP 2 — Language. Every answer after this is understood in the farmer's tongue.
 */
const LANGUAGES: { code: Language; native: string; name: string }[] = [
  { code: 'hi', native: 'हिंदी', name: 'Hindi' },
  { code: 'en', native: 'English', name: 'English' },
  { code: 'mr', native: 'मराठी', name: 'Marathi' },
  { code: 'gu', native: 'ગુજરાતી', name: 'Gujarati' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', name: 'Punjabi' },
  { code: 'ta', native: 'தமிழ்', name: 'Tamil' },
  { code: 'te', native: 'తెలుగు', name: 'Telugu' },
  { code: 'kn', native: 'ಕನ್ನಡ', name: 'Kannada' },
  { code: 'ml', native: 'മലയാളം', name: 'Malayalam' },
  { code: 'bn', native: 'বাংলা', name: 'Bengali' },
  { code: 'or', native: 'ଓଡ଼ିଆ', name: 'Odia' },
  { code: 'as', native: 'অসমীয়া', name: 'Assamese' },
];

export const LanguageStep: React.FC<{ selected: Language; onSelect: (l: Language) => void; onNext: () => void }> = ({
  selected,
  onSelect,
  onNext,
}) => {
  const { setLanguage, languageName, t } = useLanguage();

  const handleSelect = (code: Language) => {
    onSelect(code);
    setLanguage(code);
    localStorage.setItem('agri_lang_selected', 'true');
  };

  const current = LANGUAGES.find((l) => l.code === selected);

  return (
    <div>
      <StepTitle
        badge={t('onb.lang.badge')}
        title={t('onb.lang.title')}
        subtitle={t('onb.lang.subtitle')}
      />
      <div className="grid grid-cols-3 gap-2">
        {LANGUAGES.map((lang) => (
          <Chip key={lang.code} active={selected === lang.code} onClick={() => handleSelect(lang.code)} className="flex-col py-3.5">
            <span className="text-base font-extrabold text-slate-800">{lang.native}</span>
            <span className={`text-[10px] font-bold ${selected === lang.code ? 'text-emerald-600' : 'text-slate-400'}`}>{lang.name}</span>
          </Chip>
        ))}
      </div>
      <div className="mt-8">
        <OnboardingCta
          label={current ? interpolate(t('onb.lang.continueIn'), { lang: current.name }) : t('common.continue')}
          disabled={!selected}
          onClick={onNext}
        />
        <p className="mt-3 text-center text-[11px] text-slate-400">{interpolate(t('onb.lang.currently'), { lang: languageName })}</p>
      </div>
    </div>
  );
};
