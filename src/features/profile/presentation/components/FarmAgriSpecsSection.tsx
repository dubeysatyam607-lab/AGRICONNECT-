import React from 'react';
import { IFarmAgriSpecs, FarmLandUnit, SoilType, IrrigationType } from '../../domain/models/FarmerProfile';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Enterprise Farm Agri Specifications Section.
 * Visual cards for Soil Types and Irrigation methods with land area unit conversion support.
 */
interface IFarmAgriSpecsSectionProps {
  specs: IFarmAgriSpecs;
  onChange: (updated: IFarmAgriSpecs) => void;
}

const SOIL_TYPES: { type: SoilType; color: string; key: string }[] = [
  { type: 'Alluvial', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30', key: 'pdetail.soilAlluvial' },
  { type: 'Black Cotton', color: 'bg-slate-800 text-slate-100 dark:bg-slate-700 border-slate-600', key: 'pdetail.soilBlack' },
  { type: 'Red & Yellow', color: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30', key: 'pdetail.soilRed' },
  { type: 'Laterite', color: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30', key: 'pdetail.soilLaterite' },
  { type: 'Saline & Alkaline', color: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30', key: 'pdetail.soilSaline' },
  { type: 'Arid & Desert', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30', key: 'pdetail.soilArid' },
];

const IRRIGATION_TYPES: { type: IrrigationType; icon: string; key: string }[] = [
  { type: 'Drip Irrigation', icon: '💧', key: 'pdetail.irrDrip' },
  { type: 'Sprinkler System', icon: '💦', key: 'pdetail.irrSprinkler' },
  { type: 'Tube Well', icon: '⛲', key: 'pdetail.irrTube' },
  { type: 'Canal Irrigation', icon: '🌊', key: 'pdetail.irrCanal' },
  { type: 'Rainfed / Monsoon', icon: '🌧️', key: 'pdetail.irrRainfed' },
  { type: 'Open Borewell', icon: '🚰', key: 'pdetail.irrBorewell' },
];

export const FarmAgriSpecsSection: React.FC<IFarmAgriSpecsSectionProps> = ({ specs, onChange }) => {
  const { t } = useLanguage();
  const handleFieldChange = (field: keyof IFarmAgriSpecs, value: any) => {
    onChange({
      ...specs,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
        <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
          <span>🌾</span> {t('pdetail.landSoil')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('pdetail.landSoilSub')}</p>
      </div>

      {/* Land Area and Unit Selector */}
      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          {t('pdetail.landAreaUnit')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="50000"
              required
              value={specs.totalArea}
              onChange={(e) => handleFieldChange('totalArea', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-extrabold text-foreground"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              {t(`opt:${specs.landUnit}`)}
            </span>
          </div>

          <select
            value={specs.landUnit}
            onChange={(e) => handleFieldChange('landUnit', e.target.value as FarmLandUnit)}
            className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-foreground"
          >
            <option value="Acres">{t('opt:Acres')}</option>
            <option value="Hectares">{t('opt:Hectares')}</option>
            <option value="Bigha">{t('opt:Bigha')}</option>
            <option value="Guntha">{t('opt:Guntha')}</option>
            <option value="Kanal">{t('opt:Kanal')}</option>
          </select>
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
          <span>{t('pdetail.conversion')}</span>
          <span>{t('pdetail.conversion2')}</span>
        </div>
      </div>

      {/* Soil Type Cards */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          {t('pdetail.selectSoil')}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SOIL_TYPES.map((st) => {
            const isSelected = specs.soilType === st.type;
            return (
              <button
                key={st.type}
                type="button"
                onClick={() => handleFieldChange('soilType', st.type)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/10 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-foreground">{t(st.key)}</span>
                  {isSelected && <span className="text-emerald-500 text-xs font-bold">✓</span>}
                </div>
                <span className="text-[10px] text-muted-foreground leading-tight">{t(`${st.key}Desc`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Irrigation Type Cards */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          {t('pdetail.irrigationSystem')}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {IRRIGATION_TYPES.map((it) => {
            const isSelected = specs.irrigationType === it.type;
            return (
              <button
                key={it.type}
                type="button"
                onClick={() => handleFieldChange('irrigationType', it.type)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/10 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{it.icon}</span>
                  <span className="text-xs font-extrabold text-foreground">{t(it.key)}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{t(`${it.key}Desc`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Water Source Input */}
      <div className="space-y-1 pt-1">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('pdetail.waterSourceOpt')}
        </label>
        <input
          type="text"
          value={specs.primaryWaterSource || ''}
          onChange={(e) => handleFieldChange('primaryWaterSource', e.target.value)}
          placeholder="e.g., 5 HP Solar Powered Submersible Tube Well, 200ft bore"
          className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
        />
      </div>
    </div>
  );
};
