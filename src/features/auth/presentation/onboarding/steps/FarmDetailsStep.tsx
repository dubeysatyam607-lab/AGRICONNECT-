import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import {
  CROP_STAGES,
  FARM_SIZES,
  OWNERSHIP_OPTIONS,
  PRIMARY_CROPS,
  SECONDARY_CROPS,
  type IOnboardingData,
} from '../onboardingData';
import { Chip, ChipGroup, FieldLabel, LargeCard, OnboardingCta, SingleChipGroup, StepTitle } from './common';
import { optOptions } from '@/i18n/options';

/**
 * STEP 4 — Farm Details. The heart of personalization — crops, stage and land.
 */
export const FarmDetailsStep: React.FC<{
  data: IOnboardingData;
  set: (patch: Partial<IOnboardingData>) => void;
  onNext: () => void;
}> = ({ data, set, onNext }) => {
  const { t } = useLanguage();
  const canNext = data.farmSize !== '' && data.ownership !== '' && data.primaryCrops.length > 0 && data.cropStage !== '';

  const pickSize = (value: string, unit: typeof data.landUnit) => set({ farmSize: value, landUnit: unit });
  const sizeLabel = (size: (typeof FARM_SIZES)[number]) => ({
    category: size.label.includes('·') ? size.label.split('·')[0].trim() : size.label,
    range: size.label.includes('·') ? size.label.split('·')[1].trim() : '',
  });
  const sizeCategoryLabel: Record<string, string> = {
    Small: t('onb.farm.sizeSmall'),
    Medium: t('onb.farm.sizeMedium'),
    Large: t('onb.farm.sizeLarge'),
    'Very large': t('onb.farm.sizeVeryLarge'),
  };

  return (
    <div>
      <StepTitle
        badge={t('onb.farm.badge')}
        title={t('onb.farm.title')}
        subtitle={t('onb.farm.subtitle')}
      />

      <LargeCard className="space-y-4">
        <div>
          <FieldLabel emoji="📐">{t('onb.farm.size')}</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {FARM_SIZES.map((size) => {
              const parts = sizeLabel(size);
              return (
                <Chip key={size.label} active={data.farmSize === size.value} onClick={() => pickSize(size.value, size.unit)} className="flex-col py-3">
                  <span className="text-sm">{parts.range}</span>
                  <span className="text-[10px] font-bold text-slate-400">{sizeCategoryLabel[parts.category] ?? parts.category}</span>
                </Chip>
              );
            })}
          </div>
          {data.farmSize !== '' && (
            <p className="mt-2 text-[11px] font-bold text-emerald-600">
              {interpolate(t('onb.farm.confirmed'), { size: data.farmSize, unit: t(`opt:${data.landUnit}`) })}
            </p>
          )}
        </div>

        <div>
          <FieldLabel emoji="🗝️">{t('onb.farm.ownership')}</FieldLabel>
          <SingleChipGroup options={optOptions(t, OWNERSHIP_OPTIONS)} value={data.ownership} onSelect={(v) => set({ ownership: v })} />
        </div>
      </LargeCard>

      <LargeCard className="mt-3 space-y-4">
        <div>
          <FieldLabel emoji="🌾">{t('onb.farm.primary')} <span className="text-slate-300">{t('onb.farm.pick13')}</span></FieldLabel>
          <ChipGroup options={optOptions(t, PRIMARY_CROPS)} selected={data.primaryCrops} onToggle={(id) => {
            const next = data.primaryCrops.includes(id)
              ? data.primaryCrops.filter((c) => c !== id)
              : data.primaryCrops.length < 3
                ? [...data.primaryCrops, id]
                : data.primaryCrops;
            set({ primaryCrops: next });
          }} />
        </div>

        <div>
          <FieldLabel emoji="🌱" hint={t('common.optional')}>{t('onb.farm.secondary')}</FieldLabel>
          <ChipGroup options={optOptions(t, SECONDARY_CROPS)} selected={data.secondaryCrops} onToggle={(id) => {
            const next = data.secondaryCrops.includes(id)
              ? data.secondaryCrops.filter((c) => c !== id)
              : data.secondaryCrops.length < 4
                ? [...data.secondaryCrops, id]
                : data.secondaryCrops;
            set({ secondaryCrops: next });
          }} />
        </div>
      </LargeCard>

      <LargeCard className="mt-3">
        <FieldLabel emoji="🌿">{t('onb.farm.stage')}</FieldLabel>
        <SingleChipGroup options={optOptions(t, CROP_STAGES)} value={data.cropStage} onSelect={(v) => set({ cropStage: v })} />
      </LargeCard>

      <div className="mt-8">
        <OnboardingCta label={t('common.continue')} disabled={!canNext} onClick={onNext} />
      </div>
    </div>
  );
};
