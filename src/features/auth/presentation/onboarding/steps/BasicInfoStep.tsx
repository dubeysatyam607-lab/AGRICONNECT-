import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AGE_GROUPS,
  INDIAN_STATES,
  type IOnboardingData,
} from '../onboardingData';
import { Chip, FieldLabel, LargeCard, OnboardingCta, SingleChipGroup, StepTitle, TextField } from './common';
import { optOptions } from '@/i18n/options';

/**
 * STEP 3 — Basic Information. Who are we personalizing for?
 */
export const BasicInfoStep: React.FC<{
  data: IOnboardingData;
  set: (patch: Partial<IOnboardingData>) => void;
  onNext: () => void;
}> = ({ data, set, onNext }) => {
  const { t } = useLanguage();
  const canNext = data.fullName.trim().length >= 2 && data.state !== '' && data.district.trim() !== '' && data.village.trim() !== '';

  return (
    <div>
      <StepTitle
        badge={t('onb.basic.badge')}
        title={t('onb.basic.title')}
        subtitle={t('onb.basic.subtitle')}
      />

      <LargeCard className="space-y-4">
        <div>
          <FieldLabel emoji="👤">{t('onb.basic.name')}</FieldLabel>
          <TextField
            value={data.fullName}
            onChange={(v) => set({ fullName: v })}
            placeholder={t('onb.basic.namePh')}
          />
        </div>

        <div>
          <FieldLabel emoji="🎂" hint={t('common.optional')}>{t('onb.basic.age')}</FieldLabel>
          <SingleChipGroup options={optOptions(t, AGE_GROUPS)} value={data.ageGroup} onSelect={(v) => set({ ageGroup: v })} />
        </div>
      </LargeCard>

      <LargeCard className="mt-3 space-y-4">
        <div>
          <FieldLabel emoji="🗺️">{t('onb.basic.state')}</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {INDIAN_STATES.map((s) => (
              <Chip key={s} active={data.state === s} onClick={() => set({ state: s })} className="px-2 py-2.5 text-[11px]">
                {s}
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel emoji="🏙️">{t('onb.basic.district')}</FieldLabel>
            <TextField value={data.district} onChange={(v) => set({ district: v })} placeholder={t('onb.basic.districtPh')} />
          </div>
          <div>
            <FieldLabel emoji="🏡">{t('onb.basic.village')}</FieldLabel>
            <TextField value={data.village} onChange={(v) => set({ village: v })} placeholder={t('onb.basic.villagePh')} />
          </div>
        </div>
      </LargeCard>

      <div className="mt-8">
        <OnboardingCta label={t('common.continue')} disabled={!canNext} onClick={onNext} />
      </div>
    </div>
  );
};
