import React from 'react';
import { useProfileViewModel } from '../viewmodels/useProfileViewModel';
import { AppButton } from '@/shared/widgets/AppButton';
import { AppCard } from '@/shared/widgets/AppCard';
import { FadeIn } from '@/shared/widgets/AppAnimations';
import { maskAadhaar } from '../../domain/models/ProfileValidations';
import { LANGUAGE_NAMES, useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';

/**
 * Enterprise Farmer Profile View.
 * CRED / Apple inspired Agricultural Identity Dashboard displaying personal specs, GPS mapping, crops, and assets.
 */
interface IFarmerProfileViewProps {
  onEditProfile: () => void;
  onBack?: () => void;
}

export const FarmerProfileView: React.FC<IFarmerProfileViewProps> = ({ onEditProfile, onBack }) => {
  const { t } = useLanguage();
  const [state, { captureGpsLocation }] = useProfileViewModel();

  if (state.isLoading || !state.profile) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground animate-pulse">
          {t('pdetail.loadingIdentity')}
        </p>
      </div>
    );
  }

  const { personal, location, farmSpecs, crops, machineryOwned, livestock, preferredLanguage } = state.profile;
  const totalLivestock = Object.values(livestock || {}).reduce((sum, val) => sum + (val || 0), 0);

  return (
    <FadeIn className="w-full space-y-6 pb-20">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              ←
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/20">
                {t('pdetail.verifiedId')}
              </span>
              <span className="text-xs text-muted-foreground">ID: {state.profile.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t('pdetail.myIdentity')}</h1>
          </div>
        </div>

        <AppButton variant="primary" size="md" onClick={onEditProfile} className="text-xs font-bold shadow-md">
          ✏️ {t('prof.editProfile')}
        </AppButton>
      </div>

      {/* Hero CRED/Apple Style ID Card */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white shadow-2xl overflow-hidden border border-emerald-500/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-12 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-3xl font-extrabold shrink-0">
            {state.profile.profilePictureUrl ? (
              <img src={state.profile.profilePictureUrl} alt={personal.fullName} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=400"; }} className="w-full h-full object-cover" />
            ) : (
              <span>{personal.fullName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">{personal.fullName}</h2>
              {personal.isAadhaarVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/40">
                  <span>🛡️</span> {t('pdetail.aadhaarVerified')}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-300 font-medium">
              <span>📱 {personal.mobileNumber}</span>
              <span>•</span>
              <span>📍 {location.villageOrTehsil}, {location.district}</span>
              <span>•</span>
              <span>🗣️ {LANGUAGE_NAMES?.[preferredLanguage] || 'English'}</span>
            </div>

            {/* Quick Metrics Bar */}
            <div className="pt-3 grid grid-cols-3 gap-3 border-t border-white/10 text-center sm:text-left">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">{t('pdetail.landSize')}</span>
                <span className="text-sm font-extrabold text-white">{farmSpecs.totalArea} {farmSpecs.landUnit}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">{t('prof.soilType')}</span>
                <span className="text-sm font-extrabold text-white">{farmSpecs.soilType}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">{t('pdetail.livestock')}</span>
                <span className="text-sm font-extrabold text-white">{totalLivestock} {t('pdetail.head')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Profile Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Farm GPS & Satellite Location Card */}
        <AppCard variant="glass" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <span>🛰️</span> {t('pdetail.gpsLocation')}
            </h3>
            {location.gpsCoordinates ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{interpolate(t('pdetail.accuracy'), { meters: location.gpsCoordinates.accuracyMeters })}</span>
            ) : (
              <button
                onClick={captureGpsLocation}
                disabled={state.isGpsLocating}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {state.isGpsLocating ? t('pdetail.locating') : t('pdetail.detectGps')}
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
              <span className="font-semibold">{t('pdetail.villageTehsil')}</span>
              <span className="font-bold text-foreground">{location.villageOrTehsil}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
              <span className="font-semibold">{t('pdetail.districtState')}</span>
              <span className="font-bold text-foreground">{location.district}, {location.state}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
              <span className="font-semibold">{t('pdetail.pinCode')}</span>
              <span className="font-mono font-bold text-foreground">{location.pinCode}</span>
            </div>
            {location.gpsCoordinates && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-1 mt-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>{t('pdetail.latitude')}</span>
                  <span className="font-bold">{location.gpsCoordinates.latitude.toFixed(6)}° N</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('pdetail.longitude')}</span>
                  <span className="font-bold">{location.gpsCoordinates.longitude.toFixed(6)}° E</span>
                </div>
              </div>
            )}
          </div>
        </AppCard>

        {/* Agricultural Specifications Card */}
        <AppCard variant="glass" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <span>🌾</span> {t('pdetail.agriInfra')}
            </h3>
            <span className="text-xs text-muted-foreground font-semibold">{interpolate(t('pdetail.system'), { unit: farmSpecs.landUnit })}</span>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
              <span className="font-semibold">{t('pdetail.totalArea')}</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                {farmSpecs.totalArea} {farmSpecs.landUnit}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
              <span className="font-semibold">{t('pdetail.predominantSoil')}</span>
              <span className="font-bold text-foreground">{farmSpecs.soilType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
              <span className="font-semibold">{t('pdetail.irrigation')}</span>
              <span className="font-bold text-foreground">{farmSpecs.irrigationType}</span>
            </div>
            {farmSpecs.primaryWaterSource && (
              <div className="flex justify-between py-1">
                <span className="font-semibold">{t('prof.waterSource')}:</span>
                <span className="font-bold text-foreground text-right max-w-[60%]">{farmSpecs.primaryWaterSource}</span>
              </div>
            )}
          </div>
        </AppCard>

        {/* Crops Grown Tag Pills Card */}
        <AppCard variant="glass" padding="lg" className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <span>🌱</span> {t('pdetail.cropsRotation')}
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{interpolate(t('pdetail.cropsCount'), { count: crops.length })}</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {crops.length === 0 ? (
              <span className="text-xs text-muted-foreground">{t('pdetail.noCrops')}</span>
            ) : (
              crops.map((c, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20"
                >
                  ✓ {c}
                </span>
              ))
            )}
          </div>
        </AppCard>

        {/* Machinery Owned Tag Pills Card */}
        <AppCard variant="glass" padding="lg" className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <span>🚜</span> {t('pdetail.machineryInventory')}
            </h3>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{interpolate(t('pdetail.assetsCount'), { count: machineryOwned.length })}</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {machineryOwned.length === 0 ? (
              <span className="text-xs text-muted-foreground">{t('pdetail.noMachinery')}</span>
            ) : (
              machineryOwned.map((m, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/20"
                >
                  ⚙️ {m}
                </span>
              ))
            )}
          </div>
        </AppCard>
      </div>

      {/* Livestock Inventory Summary */}
      <AppCard variant="glass" padding="lg" className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <span>🐄</span> {t('pdetail.livestockSummary')}
          </h3>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{interpolate(t('pdetail.totalAnimals'), { count: totalLivestock })}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center pt-1">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-2xl block mb-1">🐄</span>
            <span className="text-sm font-extrabold text-foreground block">{livestock?.cows || 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('opt:Cows')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-2xl block mb-1">🐃</span>
            <span className="text-sm font-extrabold text-foreground block">{livestock?.buffaloes || 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('opt:Buffaloes')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-2xl block mb-1">🐂</span>
            <span className="text-sm font-extrabold text-foreground block">{livestock?.bullocks || 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('opt:Bullocks')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-2xl block mb-1">🐐</span>
            <span className="text-sm font-extrabold text-foreground block">{livestock?.goatsOrSheep || 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('opt:Goats / Sheep')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
            <span className="text-2xl block mb-1">🐓</span>
            <span className="text-sm font-extrabold text-foreground block">{livestock?.poultry || 0}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{t('opt:Poultry')}</span>
          </div>
        </div>
      </AppCard>

      {/* Aadhaar Privacy Footer Note */}
      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>🔒</span>
          <span>{interpolate(t('pdetail.aadhaarEncrypted'), { aadhaar: maskAadhaar(personal.aadhaarNumber || 'XXXX-XXXX-8942') })}</span>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          {t('pdetail.enterpriseProtected')}
        </span>
      </div>
    </FadeIn>
  );
};
