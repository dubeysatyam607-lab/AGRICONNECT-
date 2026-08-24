import React from 'react';
import { AgriCard } from '@/components/ui/agri-card';
import { StructuredSoilReport } from '../domain/soilTestingTypes';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, AlertTriangle, ArrowUpRight, Leaf, ShieldAlert } from 'lucide-react';

interface SoilHealthParametersCardProps {
  report: StructuredSoilReport;
}

export const SoilHealthParametersCard: React.FC<SoilHealthParametersCardProps> = ({ report }) => {
  const { t } = useLanguage();

  if (!report || !report.parameters || Object.keys(report.parameters).length === 0) {
    return null;
  }

  const p = report.parameters;

  const PARAMETER_META: Record<
    string,
    { label: string; sub: string; category: 'macro' | 'micro' | 'physical' }
  > = {
    ph: { label: 'Soil pH', sub: 'Acidity / Alkalinity', category: 'physical' },
    ec: { label: 'Electrical Conductivity (EC)', sub: 'Salinity level (dS/m)', category: 'physical' },
    organicCarbon: { label: 'Organic Carbon (% OC)', sub: 'Soil organic matter & humus', category: 'physical' },
    nitrogen: { label: 'Available Nitrogen (N)', sub: 'Vegetative growth & chlorophyll', category: 'macro' },
    phosphorus: { label: 'Available Phosphorus (P)', sub: 'Root development & flowering', category: 'macro' },
    potassium: { label: 'Available Potassium (K)', sub: 'Disease immunity & grain filling', category: 'macro' },
    sulphur: { label: 'Available Sulphur (S)', sub: 'Oil & protein synthesis', category: 'macro' },
    zinc: { label: 'Available Zinc (Zn)', sub: 'Enzyme activation & leaf size', category: 'micro' },
    iron: { label: 'Available Iron (Fe)', sub: 'Chlorophyll synthesis', category: 'micro' },
    manganese: { label: 'Available Manganese (Mn)', sub: 'Photosynthesis & nitrogen uptake', category: 'micro' },
    copper: { label: 'Available Copper (Cu)', sub: 'Grain formation & pollen fertility', category: 'micro' },
    boron: { label: 'Available Boron (B)', sub: 'Flowering & fruit set', category: 'micro' },
  };

  const getStatusBadge = (status: 'low' | 'optimal' | 'high' | 'normal') => {
    switch (status) {
      case 'optimal':
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle className="w-3 h-3" />
            {t('soil.status.optimal') || 'Optimal'}
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3" />
            {t('soil.status.low') || 'Deficient (Low)'}
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <ArrowUpRight className="w-3 h-3" />
            {t('soil.status.high') || 'High / Excess'}
          </span>
        );
      default:
        return null;
    }
  };

  const entries = Object.entries(p).filter(([_, val]) => Boolean(val));

  return (
    <div className="space-y-6">
      {/* Parameter Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {entries.map(([key, item]) => {
          if (!item) return null;
          const meta = PARAMETER_META[key] || {
            label: key.toUpperCase(),
            sub: 'Soil Parameter',
            category: 'macro',
          };

          return (
            <AgriCard
              key={key}
              className="p-4 rounded-xl border border-border/70 bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{meta.label}</h4>
                    <p className="text-[10px] text-muted-foreground">{meta.sub}</p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <div className="my-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-foreground tracking-tight">
                    {item.value}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {item.unit}
                  </span>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  <span className="font-medium">{t('soil.benchmark') || 'Standard Target'}:</span>{' '}
                  <span className="text-foreground font-semibold">{item.benchmark}</span>
                </div>
              </div>

              {item.interpretation && (
                <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground italic">
                  {item.interpretation}
                </div>
              )}
            </AgriCard>
          );
        })}
      </div>

      {/* Fertilizer & Crop Action Plan */}
      {report.recommendations && (
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2 mb-3">
            <Leaf className="w-4 h-4 text-emerald-600" />
            {t('soil.recommendation.title') || 'Laboratory Tailored Action & Fertilizer Schedule'}
          </h4>

          {report.recommendations.cropsRecommended && (
            <div className="mb-4">
              <div className="text-xs font-bold text-foreground mb-1.5">
                {t('soil.cropsRecommended') || 'Highly Recommended Crops for this Soil'}:
              </div>
              <div className="flex flex-wrap gap-2">
                {report.recommendations.cropsRecommended.map((crop, idx) => (
                  <span
                    key={idx}
                    className="bg-white dark:bg-card border border-emerald-300/60 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-lg shadow-sm"
                  >
                    🌾 {crop}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.recommendations.fertilizerPlan && report.recommendations.fertilizerPlan.length > 0 && (
            <div>
              <div className="text-xs font-bold text-foreground mb-2">
                {t('soil.fertilizerPlan') || 'Targeted Nutrient Application Plan'}:
              </div>
              <div className="space-y-2">
                {report.recommendations.fertilizerPlan.map((f, idx) => (
                  <div
                    key={idx}
                    className="bg-white/80 dark:bg-card/80 border border-border/60 rounded-xl p-3 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-foreground">{f.item}</span>
                      <span className="text-muted-foreground ml-2">({f.timing})</span>
                    </div>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400 shrink-0">
                      {f.dosePerAcre}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
