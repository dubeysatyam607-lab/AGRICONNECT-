import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LIVESTOCK_OPTIONS,
  MACHINERY_OPTIONS,
  WATER_SOURCES,
  type IOnboardingData,
} from '../onboardingData';
import { ChipGroup, FieldLabel, LargeCard, OnboardingCta, StepTitle, Stepper } from './common';
import { optOptions } from '@/i18n/options';

/**
 * STEP 5 — Resources. Water, machinery and livestock → irrigation & cost advice.
 */
export const ResourcesStep: React.FC<{
  data: IOnboardingData;
  set: (patch: Partial<IOnboardingData>) => void;
  onNext: () => void;
}> = ({ data, set, onNext }) => {
  const { t } = useLanguage();
  const canNext = data.waterSources.length > 0;

  const setLivestock = (key: keyof typeof data.livestock, value: number) =>
    set({ livestock: { ...data.livestock, [key]: value } });

  return (
    <div>
      <StepTitle
        badge={t('onb.res.badge')}
        title={t('onb.res.title')}
        subtitle={t('onb.res.subtitle')}
      />

      <LargeCard>
        <FieldLabel emoji="💧">{t('onb.res.water')} <span className="text-slate-300">{t('onb.res.waterHint')}</span></FieldLabel>
        <ChipGroup options={optOptions(t, WATER_SOURCES)} selected={data.waterSources} onToggle={(id) => {
          const next = data.waterSources.includes(id)
            ? data.waterSources.filter((w) => w !== id)
            : [...data.waterSources, id];
          set({ waterSources: next });
        }} />
      </LargeCard>

      <LargeCard className="mt-3">
        <FieldLabel emoji="🚜" hint={t('common.optional')}>{t('onb.res.machinery')}</FieldLabel>
        <ChipGroup options={optOptions(t, MACHINERY_OPTIONS)} selected={data.machinery} onToggle={(id) => {
          const next = data.machinery.includes(id)
            ? data.machinery.filter((m) => m !== id)
            : data.machinery.length < 6
              ? [...data.machinery, id]
              : data.machinery;
          set({ machinery: next });
        }} />
      </LargeCard>

      <LargeCard className="mt-3">
        <FieldLabel emoji="🐄" hint={t('common.optional')}>{t('onb.res.livestock')}</FieldLabel>
        <div className="space-y-2">
          {LIVESTOCK_OPTIONS.map((liv) => (
            <Stepper
              key={liv.key}
              emoji={liv.emoji}
              label={t(`opt:${liv.label}`)}
              value={data.livestock[liv.key]}
              onChange={(v) => setLivestock(liv.key, v)}
            />
          ))}
        </div>
      </LargeCard>

      <div className="mt-8">
        <OnboardingCta label={t('common.continue')} disabled={!canNext} onClick={onNext} />
      </div>
    </div>
  );
};
