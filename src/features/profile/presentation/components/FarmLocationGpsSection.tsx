import React from 'react';
import { IFarmLocation } from '../../domain/models/FarmerProfile';
import { AppButton } from '@/shared/widgets/AppButton';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Enterprise Farm Location & GPS Mapping Section.
 * Manages geolocation permissions, coordinate accuracy display, and visual interactive map card.
 */
interface IFarmLocationGpsSectionProps {
  location: IFarmLocation;
  isLocating: boolean;
  onLocationChange: (updated: IFarmLocation) => void;
  onCaptureGps: () => Promise<boolean>;
}

export const FarmLocationGpsSection: React.FC<IFarmLocationGpsSectionProps> = ({
  location,
  isLocating,
  onLocationChange,
  onCaptureGps,
}) => {
  const { t } = useLanguage();
  const handleFieldChange = (field: keyof IFarmLocation, value: any) => {
    onLocationChange({
      ...location,
      [field]: value,
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <span>📍</span> {t('pdetail.locMapping')}
          </h3>
          <p className="text-xs text-muted-foreground">{t('pdetail.locMappingSub')}</p>
        </div>
        {location.isLocationPermissionGranted ? (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1">
            <span>📡</span> {t('pdetail.gpsActive')}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
            {t('pdetail.permNeeded')}
          </span>
        )}
      </div>

      {/* Interactive GPS Geolocation Banner Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 text-white space-y-4 shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛰️</span>
              <h4 className="text-base font-extrabold text-white">{t('pdetail.satelliteMap')}</h4>
            </div>
            <p className="text-xs text-slate-300 max-w-md">
              {t('pdetail.satelliteSub')}
            </p>
          </div>

          <AppButton
            type="button"
            variant="primary"
            size="md"
            isLoading={isLocating}
            onClick={onCaptureGps}
            className="text-xs font-bold shrink-0 shadow-md"
          >
            {t('pdetail.detectCoords')}
          </AppButton>
        </div>

        {/* Display Captured Coordinates if available */}
        {location.gpsCoordinates ? (
          <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
              <span className="text-[10px] text-emerald-400 uppercase font-sans font-bold block">{t('pdetail.latitude')}</span>
              <span className="font-bold text-white">{location.gpsCoordinates.latitude.toFixed(6)}° N</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
              <span className="text-[10px] text-emerald-400 uppercase font-sans font-bold block">{t('pdetail.longitude')}</span>
              <span className="font-bold text-white">{location.gpsCoordinates.longitude.toFixed(6)}° E</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
              <span className="text-[10px] text-emerald-400 uppercase font-sans font-bold block">{t('pdetail.gpsAccuracy')}</span>
              <span className="font-bold text-emerald-300">±{location.gpsCoordinates.accuracyMeters} meters</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
              <span className="text-[10px] text-emerald-400 uppercase font-sans font-bold block">{t('pdetail.mappedAt')}</span>
              <span className="font-bold text-slate-200">
                {new Date(location.gpsCoordinates.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-slate-300 font-medium">
            {t('pdetail.noGpsYet')}
          </div>
        )}
      </div>

      {/* Address Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('pdetail.villageLabel')}
          </label>
          <input
            type="text"
            required
            value={location.villageOrTehsil}
            onChange={(e) => handleFieldChange('villageOrTehsil', e.target.value)}
            placeholder="e.g., Pimpri / Tehsil Haveli"
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('pdetail.district')}</label>
          <input
            type="text"
            required
            value={location.district}
            onChange={(e) => handleFieldChange('district', e.target.value)}
            placeholder="e.g., Pune"
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('pdetail.stateUt')}</label>
          <input
            type="text"
            required
            value={location.state}
            onChange={(e) => handleFieldChange('state', e.target.value)}
            placeholder="e.g., Maharashtra"
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('pdetail.pinCodeLabel')}</label>
          <input
            type="text"
            required
            maxLength={6}
            value={location.pinCode}
            onChange={(e) => handleFieldChange('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="e.g., 411033"
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium font-mono transition-all"
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('pdetail.landmark')}
          </label>
          <input
            type="text"
            value={location.farmCentroidAddress || ''}
            onChange={(e) => handleFieldChange('farmCentroidAddress', e.target.value)}
            placeholder="e.g., Survey No. 42, Near Canal Gate, Green Belt Road"
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
          />
        </div>
      </div>
    </div>
  );
};
