import React from 'react';
import { Droplets, Wind, Cloud, CloudRain, CloudLightning, CloudFog, Sun } from 'lucide-react';
import { IHourlyForecast } from '../../domain/models/WeatherModels';
import { useLanguage } from '@/contexts/LanguageContext';

interface HourlyForecastTimelineProps {
  hourly: IHourlyForecast[];
  formatTemp: (celsius: number) => string;
}

const conditionIcon = (condition: string) => {
  const c = (condition || '').toLowerCase();
  if (c.includes('thunder')) return <CloudLightning className="h-5 w-5 text-amber-500" aria-hidden="true" />;
  if (c.includes('rain') || c.includes('shower')) return <CloudRain className="h-5 w-5 text-sky-600" aria-hidden="true" />;
  if (c.includes('cloud')) return <Cloud className="h-5 w-5 text-slate-500" aria-hidden="true" />;
  if (c.includes('fog') || c.includes('mist')) return <CloudFog className="h-5 w-5 text-slate-400" aria-hidden="true" />;
  return <Sun className="h-5 w-5 text-amber-500" aria-hidden="true" />;
};

/**
 * Horizontal scrollable 24-hour forecast.
 * Temperature leads; rain and wind are quiet metadata.
 */
export const HourlyForecastTimeline: React.FC<HourlyForecastTimelineProps> = ({ hourly, formatTemp }) => {
  const { t } = useLanguage();
  if (!hourly || hourly.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="type-h3">{t('wth.hourlyTitle')}</h3>
        <span className="type-meta text-muted-foreground">{t('wth.scrollH')} →</span>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {hourly.map((item, index) => {
          const isNow = index === 0;
          return (
            <div
              key={item.timestamp || index}
              className={`shrink-0 w-[80px] rounded-lg border p-2.5 flex flex-col items-center gap-1.5 text-center ${
                isNow ? 'border-primary/30 bg-primary/5' : 'border-border'
              }`}
            >
              <span className={`type-meta font-semibold ${isNow ? 'text-primary' : 'text-muted-foreground'}`}>
                {isNow ? 'Now' : item.time}
              </span>

              <span className="flex items-center justify-center w-6 h-6" aria-hidden="true">
                {conditionIcon(item?.condition || '')}
              </span>

              <span className="type-h3 type-num">{formatTemp(item.temp)}</span>

              <span className={`flex items-center gap-0.5 type-meta ${item.rainProbability >= 25 ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground'}`}>
                <Droplets size={10} aria-hidden="true" />
                {item.rainProbability}%
              </span>

              <span className="flex items-center gap-0.5 type-meta text-muted-foreground pt-1.5 border-t border-border w-full justify-center">
                <Wind size={9} aria-hidden="true" />
                {item.windSpeed}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
