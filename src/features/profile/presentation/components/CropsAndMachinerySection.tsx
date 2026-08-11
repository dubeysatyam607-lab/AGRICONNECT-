import React, { useState } from 'react';
import { MAJOR_INDIAN_CROPS, MAJOR_FARM_MACHINERY } from '../../domain/models/FarmerProfile';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Enterprise Crops & Machinery Inventory Section.
 * Interactive multi-select tag pills for major Indian crops and farm machinery assets.
 */
interface ICropsAndMachinerySectionProps {
  crops: string[];
  machinery: string[];
  onCropsChange: (crops: string[]) => void;
  onMachineryChange: (machinery: string[]) => void;
}

export const CropsAndMachinerySection: React.FC<ICropsAndMachinerySectionProps> = ({
  crops,
  machinery,
  onCropsChange,
  onMachineryChange,
}) => {
  const { t } = useLanguage();
  const [customCrop, setCustomCrop] = useState('');
  const [customMachinery, setCustomMachinery] = useState('');

  const toggleCrop = (cropName: string) => {
    if (crops.includes(cropName)) {
      onCropsChange(crops.filter((c) => c !== cropName));
    } else {
      onCropsChange([...crops, cropName]);
    }
  };

  const addCustomCrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (customCrop.trim() && !crops.includes(customCrop.trim())) {
      onCropsChange([...crops, customCrop.trim()]);
      setCustomCrop('');
    }
  };

  const toggleMachinery = (machName: string) => {
    if (machinery.includes(machName)) {
      onMachineryChange(machinery.filter((m) => m !== machName));
    } else {
      onMachineryChange([...machinery, machName]);
    }
  };

  const addCustomMachinery = (e: React.FormEvent) => {
    e.preventDefault();
    if (customMachinery.trim() && !machinery.includes(customMachinery.trim())) {
      onMachineryChange([...machinery, customMachinery.trim()]);
      setCustomMachinery('');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
        <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
          <span>🌱</span> {t('pdetail.cropsMachinery')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('pdetail.cropsMachinerySub')}</p>
      </div>

      {/* Crops Grown Multi-Select Tag Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('pdetail.cropsGrown')}
          </label>
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
            {t('pdetail.selected').replace('{count}', String(crops.length))}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {MAJOR_INDIAN_CROPS.map((cropName) => {
            const isSelected = crops.includes(cropName);
            return (
              <button
                key={cropName}
                type="button"
                onClick={() => toggleCrop(cropName)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-500 text-white shadow-sm scale-105'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{isSelected ? '✓' : '+'}</span>
                <span>{cropName}</span>
              </button>
            );
          })}
        </div>

        {/* Add Custom Crop Input */}
        <form onSubmit={addCustomCrop} className="flex gap-2 pt-1 max-w-sm">
          <input
            type="text"
            value={customCrop}
            onChange={(e) => setCustomCrop(e.target.value)}
            placeholder={t('pdetail.addCrop')}
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!customCrop.trim()}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold disabled:opacity-50"
          >
            {t('pdetail.add')}
          </button>
        </form>
      </div>

      {/* Farm Machinery Owned Tag Pills */}
      <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('pdetail.machineryOwned')}
          </label>
          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
            {t('pdetail.assetsCount').replace('{count}', String(machinery.length))}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {MAJOR_FARM_MACHINERY.map((machName) => {
            const isSelected = machinery.includes(machName);
            return (
              <button
                key={machName}
                type="button"
                onClick={() => toggleMachinery(machName)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm scale-105'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{isSelected ? '✓' : '+'}</span>
                <span>{machName}</span>
              </button>
            );
          })}
        </div>

        {/* Add Custom Machinery Input */}
        <form onSubmit={addCustomMachinery} className="flex gap-2 pt-1 max-w-sm">
          <input
            type="text"
            value={customMachinery}
            onChange={(e) => setCustomMachinery(e.target.value)}
            placeholder={t('pdetail.addMachinery')}
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!customMachinery.trim()}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold disabled:opacity-50"
          >
            {t('pdetail.add')}
          </button>
        </form>
      </div>
    </div>
  );
};
