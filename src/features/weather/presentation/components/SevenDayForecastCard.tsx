import React, { useState } from 'react';
import {
  Droplets, Wind, ChevronDown, ChevronUp, AlertCircle, Calendar,
  Cloud, CloudRain, CloudLightning, CloudFog, Sun,
} from 'lucide-react';
import { IDailyForecast } from '../../domain/models/WeatherModels';
import { useLanguage } from '@/contexts/LanguageContext';

interface SevenDayForecastCardProps {
  daily: IDailyForecast[];
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
 * 7-day agricultural outlook. Each day expands to reveal the ICAR advisory.
 */
export const SevenDayForecastCard: React.FC<SevenDayForecastCardProps> = ({ daily, formatTemp }) => {
  const { t } = useLanguage();
  const [expandedDay, setExpandedDay] = useState<number | null>(0);

  if (!daily || daily.length === 0) return null;

  const globalMin = Math.min(...daily.map(d => d.minTemp));
  const globalMax = Math.max(...daily.map(d => d.maxTemp));
  const totalRange = Math.max(1, globalMax - globalMin);

  const getAdvisoryTag = (advisory: string) => {
    const adv = (advisory || '').toLowerCase();
    if (adv.includes('critical') || adv.includes('lightning') || adv.includes('shelter')) {
      return { text: t('wth.tagWarning'), color: 'bg-destructive/10 text-destructive border-destructive/25' };
    }
    if (adv.includes('spray') || adv.includes('pesticide')) {
      return { text: t('wth.tagSpray'), color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25' };
    }
    if (adv.includes('irrigation') || adv.includes('irrigate') || adv.includes('water')) {
      return { text: t('wth.tagIrrigate'), color: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25' };
    }
    if (adv.includes('harvest') || adv.includes('drying')) {
      return { text: t('wth.tagHarvest'), color: 'bg-primary/10 text-primary border-primary/20' };
    }
    if (adv.includes('weed') || adv.includes('weeding') || adv.includes('intercultur')) {
      return { text: t('wth.tagWeeding'), color: 'bg-muted text-muted-foreground border-border' };
    }
    if (adv.includes('fertilizer') || adv.includes('nutrient') || adv.includes('feeding')) {
      return { text: t('wth.tagFertilize'), color: 'bg-muted text-muted-foreground border-border' };
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="type-h3 flex items-center gap-2">
          <Calendar size={16} aria-hidden="true" />
          {t('wth.dailyTitle')}
        </h3>
        <span className="type-meta text-muted-foreground">{t('wth.tapDay')}</span>
      </div>

      <div className="divide-y divide-border">
        {daily.map((item, index) => {
          const isExpanded = expandedDay === index;
          const leftPercent = Math.max(0, Math.min(100, ((item.minTemp - globalMin) / totalRange) * 100));
          const widthPercent = Math.max(15, Math.min(100 - leftPercent, ((item.maxTemp - item.minTemp) / totalRange) * 100));
          const actionTag = getAdvisoryTag(item.agriAdvisory);

          return (
            <div key={item.date || index}>
              <div
                onClick={() => setExpandedDay(isExpanded ? null : index)}
                className="flex items-center justify-between gap-2.5 cursor-pointer rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
              >
                <div className="w-[84px] shrink-0">
                  <p className="type-small font-semibold text-foreground">{item.dayName}</p>
                  <p className="type-meta mt-0.5">{item.date}</p>
                </div>

                <div className="flex items-center gap-2 w-28 shrink-0">
                  <span className="flex items-center justify-center w-6 h-6" aria-hidden="true">{conditionIcon(item?.condition || '')}</span>
                  <span className="type-meta text-muted-foreground truncate">{item?.condition || ''}</span>
                </div>

                <div className="flex-1 hidden md:flex items-center justify-start overflow-hidden">
                  {actionTag && (
                    <span className={`type-label px-2 py-0.5 rounded border ${actionTag.color}`}>
                      {actionTag.text}
                    </span>
                  )}
                </div>

                <div className="w-14 shrink-0 text-right">
                  <span className={`inline-flex items-center gap-0.5 type-meta font-semibold px-2 py-0.5 rounded ${
                    item.rainProbability >= 50 ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300' :
                    item.rainProbability >= 20 ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground'
                  }`}>
                    <Droplets size={10} aria-hidden="true" />
                    <span>{item.rainProbability}%</span>
                  </span>
                </div>

                <div className="flex-1 min-w-[120px] max-w-[170px] hidden sm:flex items-center gap-2 pl-2">
                  <span className="type-meta text-muted-foreground w-8 text-right type-num">{formatTemp(item.minTemp)}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full relative overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-primary"
                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="type-small font-semibold w-8 type-num">{formatTemp(item.maxTemp)}</span>
                </div>

                <div className="sm:hidden text-right w-16 shrink-0 pl-1">
                  <span className="type-small font-semibold type-num">{formatTemp(item.maxTemp)}</span>
                  <span className="type-meta ml-1 type-num">/{formatTemp(item.minTemp)}</span>
                </div>

                <div className="text-muted-foreground pl-1">
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-2 mx-1 p-3.5 bg-muted/50 border border-border rounded-lg type-small space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-foreground font-semibold">{t('wth.advisoryLabel')}:</strong>
                        {actionTag && (
                          <span className={`md:hidden type-label px-1.5 py-0.5 rounded border ${actionTag.color}`}>
                            {actionTag.text}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.agriAdvisory}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-border type-meta text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Wind size={11} aria-hidden="true" /> {t('wth.windSpeed')}: <strong className="text-foreground">{item.windSpeed} {t('wth.kmh')}</strong>
                    </span>
                    <span>{t('wth.humidityExpected')}: <strong className="text-foreground">{item.humidity}%</strong></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
