import React, { useState } from 'react';
import { Droplets, Wind, ChevronDown, ChevronUp, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { IDailyForecast } from '../../domain/models/WeatherModels';

interface SevenDayForecastCardProps {
  daily: IDailyForecast[];
  formatTemp: (celsius: number) => string;
}

/**
 * Premium 7-Day Agricultural Outlook Card.
 * Displays daily weather ranges, rain percentages, expandable crop advisories,
 * and contextual smart badges parsed from the ICAR advisory text.
 */
export const SevenDayForecastCard: React.FC<SevenDayForecastCardProps> = ({ daily, formatTemp }) => {
  const [expandedDay, setExpandedDay] = useState<number | null>(0); // Default expand Today (index 0)

  if (!daily || daily.length === 0) return null;

  // Calculate min and max temperatures to scale the horizontal bar graphs
  const globalMin = Math.min(...daily.map(d => d.minTemp));
  const globalMax = Math.max(...daily.map(d => d.maxTemp));
  const totalRange = Math.max(1, globalMax - globalMin);

  // Parse advisory text and return contextual farming action tags
  const getAdvisoryTag = (advisory: string) => {
    const adv = (advisory || '').toLowerCase();
    if (adv.includes('critical') || adv.includes('lightning') || adv.includes('shelter')) {
      return { text: '⚠️ Warning', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
    if (adv.includes('spray') || adv.includes('pesticide')) {
      return { text: '🚜 Spray Alert', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    if (adv.includes('irrigation') || adv.includes('irrigate') || adv.includes('water')) {
      return { text: '💧 Irrigate', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }
    if (adv.includes('harvest') || adv.includes('drying')) {
      return { text: '🌾 Harvest', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
    if (adv.includes('weed') || adv.includes('weeding') || adv.includes('intercultur')) {
      return { text: '🌱 Weeding', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
    }
    if (adv.includes('fertilizer') || adv.includes('nutrient') || adv.includes('feeding')) {
      return { text: '🧪 Fertilize', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-3xl p-5 text-white shadow-xl space-y-4">
      
      {/* Header Title */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Calendar size={16} className="text-emerald-400" />
          <span>7-Day Mandi & Farm Outlook</span>
        </h3>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <Sparkles size={12} className="text-emerald-400 animate-pulse" />
          Tap day for smart advisory
        </span>
      </div>

      <div className="divide-y divide-white/10">
        {daily.map((item, index) => {
          const isExpanded = expandedDay === index;
          const leftPercent = Math.max(0, Math.min(100, ((item.minTemp - globalMin) / totalRange) * 100));
          const widthPercent = Math.max(15, Math.min(100 - leftPercent, ((item.maxTemp - item.minTemp) / totalRange) * 100));
          const actionTag = getAdvisoryTag(item.agriAdvisory);

          return (
            <div key={item.date || index} className="py-2.5 transition-colors">
              
              {/* Row Summary header */}
              <div
                onClick={() => setExpandedDay(isExpanded ? null : index)}
                className="flex items-center justify-between gap-2.5 cursor-pointer group rounded-2xl p-2 -mx-2 hover:bg-white/5 transition-all"
              >
                {/* 1. Day Name & Date */}
                <div className="w-[84px] shrink-0">
                  <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {item.dayName}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.date}</p>
                </div>

                {/* 2. Weather Condition & Icon */}
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <span className="text-xl">
                    {(item?.condition || '').includes('Rain') || (item?.condition || '').includes('Shower') ? '🌧️' :
                     (item?.condition || '').includes('Cloud') ? '⛅' :
                     (item?.condition || '').includes('Thunder') ? '⛈️' : '☀️'}
                  </span>
                  <span className="text-xs text-slate-300 truncate font-semibold">{item?.condition || ''}</span>
                </div>

                {/* 3. Action / Advisory Badge parsed from ICAR alerts */}
                <div className="flex-1 hidden md:flex items-center justify-start overflow-hidden">
                  {actionTag && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${actionTag.color}`}>
                      {actionTag.text}
                    </span>
                  )}
                </div>

                {/* 4. Rain Probability Badge */}
                <div className="w-14 shrink-0 text-right">
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    item.rainProbability >= 50 ? 'bg-blue-500/25 text-blue-300 border border-blue-400/30' :
                    item.rainProbability >= 20 ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-500'
                  }`}>
                    <Droplets size={10} className="shrink-0" />
                    <span>{item.rainProbability}%</span>
                  </span>
                </div>

                {/* 5. Min-Max Temperature Range Bar */}
                <div className="flex-1 min-w-[120px] max-w-[170px] hidden sm:flex items-center gap-2 pl-2">
                  <span className="text-xs font-semibold text-slate-400 w-8 text-right">{formatTemp(item.minTemp)}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full relative overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400"
                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-white w-8">{formatTemp(item.maxTemp)}</span>
                </div>

                {/* Mobile temp fallback */}
                <div className="sm:hidden text-right w-16 shrink-0 pl-1">
                  <span className="text-xs font-bold text-white">{formatTemp(item.maxTemp)}</span>
                  <span className="text-[10px] text-slate-400 ml-1">/{formatTemp(item.minTemp)}</span>
                </div>

                {/* 6. Expand indicator */}
                <div className="text-slate-400 group-hover:text-white transition-colors pl-1">
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>

              {/* Expandable smart advisory drawer */}
              {isExpanded && (
                <div className="mt-2 mx-1 p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-2.5 text-emerald-300">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-black">ICAR Farming Advisory:</strong>
                        {actionTag && (
                          <span className={`md:hidden text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${actionTag.color}`}>
                            {actionTag.text}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-200 leading-relaxed font-medium">
                        {item.agriAdvisory}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-emerald-500/20 text-[10px] text-slate-400 font-bold">
                    <span className="flex items-center gap-1">
                      <Wind size={11} className="text-teal-400" /> Wind speed: <strong className="text-white">{item.windSpeed} km/h</strong>
                    </span>
                    <span>Expected Humidity: <strong className="text-white">{item.humidity}%</strong></span>
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

