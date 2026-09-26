import React from 'react';
import { Sprout, CloudRain, Droplets, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useFarm } from '@/contexts/FarmContext';

interface CropWeatherActionFlowProps {
  temperature: number;
  condition: string;
  rainProbability?: number;
  formatTemp: (c: number) => string;
}

export const CropWeatherActionFlow: React.FC<CropWeatherActionFlowProps> = ({
  temperature,
  condition,
  rainProbability = 0,
  formatTemp,
}) => {
  const { profile } = useFarm();
  const cropName = profile.crop || 'Soybean';
  const cropStage = profile.stage || 'Flowering';

  // Agriculture advice logic based on condition and rain probability
  const advice = React.useMemo(() => {
    if (rainProbability >= 60) {
      return {
        weatherDesc: `High rain chance (${rainProbability}%)`,
        actionTitle: 'Hold Irrigation & Chemical Spray',
        actionDesc: `Heavy rain expected. Do not irrigate or apply pesticides today to prevent nutrient runoff and wasted inputs.`,
        tone: 'rain' as const,
      };
    }
    if (temperature > 35) {
      return {
        weatherDesc: `Hot & dry weather (${formatTemp(temperature)})`,
        actionTitle: 'Evening Irrigation Recommended',
        actionDesc: `High temperatures can induce flower/fruit drop. Water early morning or evening to reduce soil evaporation.`,
        tone: 'warn' as const,
      };
    }
    if (rainProbability === 0 || rainProbability < 20) {
      return {
        weatherDesc: `Dry weather (${rainProbability}% rain)`,
        actionTitle: 'Light Irrigation Recommended',
        actionDesc: `Dry conditions during ${cropStage} stage. Apply light irrigation if soil moisture is low.`,
        tone: 'normal' as const,
      };
    }
    return {
      weatherDesc: `Favorable weather (${rainProbability}% rain probability)`,
      actionTitle: 'Optimal Farm Maintenance',
      actionDesc: `Weather is suitable for routine weeding, crop inspection, and field monitoring.`,
      tone: 'normal' as const,
    };
  }, [rainProbability, temperature, cropStage, formatTemp]);

  return (
    <div className="rounded-2xl border border-white/20 dark:border-border bg-card/85 dark:bg-card/90 backdrop-blur-md p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sprout size={15} className="text-emerald-600 dark:text-emerald-400" />
          Agricultural Weather & Action Flow
        </h4>
        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
          Live Farm Advisory
        </span>
      </div>

      {/* Visual Flow Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
        {/* Step 1: Live Weather Impact */}
        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-1">
          <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
            1. Weather Condition
          </span>
          <p className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
            <CloudRain size={16} className="text-sky-600 shrink-0" />
            {formatTemp(temperature)} · {advice.weatherDesc}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium">
            {condition} sky with {rainProbability}% precipitation forecast.
          </p>
        </div>

        {/* Step 2: Target Crop & Stage */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
            2. Active Crop Stage
          </span>
          <p className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
            <Sprout size={16} className="text-emerald-600 shrink-0" />
            {cropName} ({cropStage})
          </p>
          <p className="text-[11px] text-muted-foreground font-medium">
            Critical moisture sensitivity stage for optimal grain development.
          </p>
        </div>

        {/* Step 3: Recommended Action */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
            3. Recommended Action
          </span>
          <p className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
            <Droplets size={16} className="text-amber-600 shrink-0" />
            {advice.actionTitle}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium">
            {advice.actionDesc}
          </p>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground font-medium">
        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
        <span>Tailored to your {profile.farmArea || 5.2}-acre farm location & stage.</span>
      </div>
    </div>
  );
};
