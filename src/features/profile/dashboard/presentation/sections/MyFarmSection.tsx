import React, { useEffect, useState } from 'react';
import { MapPin, Pencil, Sprout, Droplets, CalendarDays, Waves, LandPlot } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/error-state';
import type { UseDigitalProfileReturn } from '../types';

interface MyFarmSectionProps {
  data: UseDigitalProfileReturn;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/60 last:border-0">
    <span className="text-xs font-semibold text-muted-foreground shrink-0 pt-0.5">{label}</span>
    <span className="text-xs font-extrabold text-foreground text-right">{children}</span>
  </div>
);

export const MyFarmSection: React.FC<MyFarmSectionProps> = ({ data }) => {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [farmName, setFarmName] = useState(data.farmExtras.farmName);
  const [ownership, setOwnership] = useState(data.farmExtras.ownership);
  const [harvestDate, setHarvestDate] = useState(data.farmExtras.expectedHarvestDate);
  const [stage, setStage] = useState(data.cropStage);

  useEffect(() => {
    setFarmName(data.farmExtras.farmName);
    setOwnership(data.farmExtras.ownership);
    setHarvestDate(data.farmExtras.expectedHarvestDate);
  }, [data.farmExtras, editing]);

  const hasFarm =
    data.onboarding.primaryCrops.length > 0 || data.farm.farmArea > 0 || data.profile?.farmSpecs.totalArea;

  const farmArea = data.profile?.farmSpecs.totalArea || Number(data.onboarding.farmSize) || data.farm.farmArea || 0;
  const landUnit = data.profile?.farmSpecs.landUnit || data.onboarding.landUnit || 'Acres';
  const soilType = data.profile?.farmSpecs.soilType || data.farm.soilType || t('prof.na');
  const irrigation = data.profile?.farmSpecs.irrigationType || data.onboarding.waterSources[0] || t('prof.na');
  const waterSource = data.onboarding.waterSources[0] || data.profile?.farmSpecs.primaryWaterSource || t('prof.na');
  const location = [data.profile?.location.villageOrTehsil, data.profile?.location.district, data.profile?.location.state]
    .filter(Boolean)
    .join(', ');

  const daysToHarvest = Math.max(
    0,
    Math.round((new Date(data.farmExtras.expectedHarvestDate).getTime() - Date.now()) / 86400000),
  );

  const handleSave = () => {
    data.saveFarmExtras({ farmName: farmName.trim() || t('prof.farmNameDefault'), ownership, expectedHarvestDate: harvestDate });
    data.updateCropStage(stage);
    setEditing(false);
  };

  const stageOptions = ['Pre-sowing', 'Sowing', 'Vegetative growth', 'Flowering', 'Harvesting', 'Harvested'];

  if (!hasFarm) {
    return (
      <div className="pb-24">
        <EmptyState
          emoji="🚜"
          title={t('prof.noFarmData')}
          description={t('prof.noFarmDataHint')}
          actionLabel={t('prof.setUpFarm')}
          onAction={() => setEditing(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{t('prof.myFarm')}</h2>
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-glow hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Pencil size={13} /> {t('prof.edit')}
        </button>
      </div>

      {/* Farm summary hero */}
      <div className="relative rounded-[28px] bg-gradient-to-br from-lime-700 via-emerald-800 to-teal-900 text-white shadow-colorful overflow-hidden p-6">
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">🌾</span>
          <div>
            <p className="text-lg font-extrabold tracking-tight">{data.farmExtras.farmName}</p>
            <p className="text-xs text-emerald-100">
              {farmArea} {landUnit} · {t(`opt:${ownership}`) || ownership}
            </p>
          </div>
        </div>
        <div className="relative z-10 mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-lg font-extrabold tabular-nums">{farmArea}</p>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">{t('prof.farmSize')}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-lg font-extrabold">{data.onboarding.primaryCrops[0]?.split(' (')[0] || t('prof.na')}</p>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">{t('prof.primaryCrop')}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-lg font-extrabold tabular-nums">{daysToHarvest}d</p>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">{t('prof.untilHarvest')}</p>
          </div>
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="text-sm font-extrabold text-foreground mb-2">{t('prof.farmDetails')}</h3>
        <Field label={t('prof.farmName')}>{data.farmExtras.farmName}</Field>
        <Field label={t('prof.ownership')}>{t(`opt:${ownership}`) || ownership}</Field>
        <Field label={t('prof.farmLocation')}>
          <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-primary" /> {location || t('prof.na')}</span>
        </Field>
        <Field label={t('prof.primaryCrop')}>{data.onboarding.primaryCrops.map((c) => t(`opt:${c}`)).join(', ') || t('prof.na')}</Field>
        <Field label={t('prof.secondaryCrops')}>
          {data.onboarding.secondaryCrops.length > 0 ? data.onboarding.secondaryCrops.map((c) => t(`opt:${c}`)).join(', ') : t('prof.none')}
        </Field>
        <Field label={t('prof.cropStage')}>
          <span className="inline-flex items-center gap-1"><Sprout size={12} className="text-emerald-600" /> {t(`opt:${stage}`) || stage}</span>
        </Field>
        <Field label={t('prof.soilType')}>
          <span className="inline-flex items-center gap-1"><LandPlot size={12} className="text-amber-600" /> {soilType}</span>
        </Field>
        <Field label={t('prof.waterSource')}>
          <span className="inline-flex items-center gap-1"><Droplets size={12} className="text-sky-600" /> {waterSource}</span>
        </Field>
        <Field label={t('prof.irrigation')}>
          <span className="inline-flex items-center gap-1"><Waves size={12} className="text-cyan-600" /> {irrigation}</span>
        </Field>
        <Field label={t('prof.expectedHarvest')}>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} className="text-marigold" /> {data.farmExtras.expectedHarvestDate}
          </span>
        </Field>
      </div>

      {/* Edit sheet */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-[28px]">
          <SheetHeader className="text-left">
            <SheetTitle>{t('prof.updateFarm')}</SheetTitle>
            <SheetDescription>{t('prof.updateFarmHint')}</SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-foreground">{t('prof.farmName')}</span>
              <input
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder={t('prof.farmNamePh')}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold text-foreground">{t('prof.ownership')}</span>
              <select
                value={ownership}
                onChange={(e) => setOwnership(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {['Owned', 'Leased', 'Partly leased'].map((o) => (
                  <option key={o} value={o}>{t(`opt:${o}`) || o}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold text-foreground">{t('prof.cropStage')}</span>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {stageOptions.map((s) => (
                  <option key={s} value={s}>{t(`opt:${s}`) || s}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold text-foreground">{t('prof.expectedHarvest')}</span>
              <input
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
            <p className="flex items-center justify-between gap-3">
              <span className="text-xs font-extrabold text-foreground">{t('prof.locationPerm')}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${data.profile?.location.isLocationPermissionGranted ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {data.profile?.location.isLocationPermissionGranted ? t('prof.locationOn') : t('prof.locationOff')}
              </span>
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{t('prof.locationPermHint')}</p>
          </div>

          <SheetFooter className="mt-6 flex gap-3 sm:justify-end">
            <button onClick={() => setEditing(false)} className="rounded-full px-5 py-2.5 text-xs font-extrabold text-muted-foreground hover:bg-muted transition-colors">
              {t('prof.cancel')}
            </button>
            <button onClick={handleSave} className="rounded-full bg-primary px-6 py-2.5 text-xs font-extrabold text-primary-foreground shadow-glow hover:bg-primary/90 active:scale-95 transition-all">
              {t('prof.save')}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
