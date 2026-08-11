import React from 'react';
import { ILivestockInventory } from '../../domain/models/FarmerProfile';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Enterprise Livestock Inventory Section.
 * Stepper counter controls (+ / -) for cattle, bullocks, goats/sheep, and poultry.
 */
interface ILivestockSectionProps {
  livestock: ILivestockInventory;
  onChange: (updated: ILivestockInventory) => void;
}

const LIVESTOCK_ITEMS: { key: keyof ILivestockInventory; labelKey: string; icon: string; descKey: string }[] = [
  { key: 'cows', labelKey: 'pdetail.cowsLabel', icon: '🐄', descKey: 'pdetail.cowsDesc' },
  { key: 'buffaloes', labelKey: 'pdetail.buffaloesLabel', icon: '🐃', descKey: 'pdetail.buffaloesDesc' },
  { key: 'bullocks', labelKey: 'pdetail.bullocksLabel', icon: '🐂', descKey: 'pdetail.bullocksDesc' },
  { key: 'goatsOrSheep', labelKey: 'pdetail.goatsLabel', icon: '🐐', descKey: 'pdetail.goatsDesc' },
  { key: 'poultry', labelKey: 'pdetail.poultryLabel', icon: '🐓', descKey: 'pdetail.poultryDesc' },
];

export const LivestockSection: React.FC<ILivestockSectionProps> = ({ livestock, onChange }) => {
  const { t } = useLanguage();
  const updateCount = (key: keyof ILivestockInventory, delta: number) => {
    const current = livestock[key] || 0;
    const next = Math.max(0, current + delta);
    onChange({
      ...livestock,
      [key]: next,
    });
  };

  const totalLivestock = Object.values(livestock).reduce((sum, val) => sum + (val || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <span>🐄</span> {t('pdetail.livestockInventory')}
          </h3>
          <p className="text-xs text-muted-foreground">{t('pdetail.livestockSub')}</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
          {t('pdetail.totalHead').replace('{count}', String(totalLivestock))}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {LIVESTOCK_ITEMS.map((item) => {
          const count = livestock[item.key] || 0;
          return (
            <div
              key={item.key}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between transition-all hover:border-slate-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                  {item.icon}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground">{t(item.labelKey)}</h4>
                  <p className="text-[11px] text-muted-foreground">{t(item.descKey)}</p>
                </div>
              </div>

              {/* Stepper controls */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                  type="button"
                  onClick={() => updateCount(item.key, -1)}
                  disabled={count === 0}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-foreground font-extrabold flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-extrabold text-foreground font-mono">{count}</span>
                <button
                  type="button"
                  onClick={() => updateCount(item.key, 1)}
                  className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold flex items-center justify-center transition-colors shadow-sm"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
