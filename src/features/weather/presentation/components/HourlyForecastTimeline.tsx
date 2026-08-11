import React from 'react';
import { Droplets, Wind } from 'lucide-react';
import { IHourlyForecast } from '../../domain/models/WeatherModels';
import { useLanguage } from '@/contexts/LanguageContext';

interface HourlyForecastTimelineProps {
  hourly: IHourlyForecast[];
  formatTemp: (celsius: number) => string;
}

/**
 * Premium Horizontal Scrollable 24-Hour Timeline.
 * Features an absolute-positioned smooth SVG cubic-bezier temperature curve overlay
 * that spans across the scrollable columns, synced with the card spacing.
 */
export const HourlyForecastTimeline: React.FC<HourlyForecastTimelineProps> = ({ hourly, formatTemp }) => {
  const { t } = useLanguage();
  if (!hourly || hourly.length === 0) return null;

  // Layout Math Constants
  const colWidth = 84;
  const colGap = 12; // matching gap-3 (12px)
  const svgWidth = hourly.length * colWidth + (hourly.length - 1) * colGap;
  const svgHeight = 85;

  const temps = hourly.map(h => h?.temp).filter(t => typeof t === 'number' && !isNaN(t));
  const minTemp = temps.length > 0 ? Math.min(...temps) : 25;
  const maxTemp = temps.length > 0 ? Math.max(...temps) : 35;
  const tempRange = Math.max(1, maxTemp - minTemp);

  // Calculate coordinates for each hourly temperature point
  const points = hourly.map((item, i) => {
    const x = i * (colWidth + colGap) + colWidth / 2;
    const tempVal = typeof item?.temp === 'number' ? item.temp : 30;
    // Scale Y coordinate between 25px and 60px to leave space for labels and nodes
    const y = 60 - ((tempVal - minTemp) / tempRange) * 35;
    return { x, y, temp: tempVal };
  });

  // Build cubic bezier curve path
  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (colWidth + colGap) / 3;
      const cpY1 = p0.y;
      const cpX2 = p1.x - (colWidth + colGap) / 3;
      const cpY2 = p1.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  const fillPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`
    : '';

  return (
    <div className="bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-3xl p-5 text-white shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span>{t('wth.hourlyTitle')}</span>
        </h3>
        <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          {t('wth.scrollH')} →
        </span>
      </div>

      {/* Scrollable Container wrapper */}
      <div className="relative overflow-x-auto no-scrollbar pb-3 pt-1">
        <div className="relative" style={{ width: `${svgWidth}px` }}>
          
          {/* 1. Absolute SVG Bezier Curve layer (positioned over the cards middle section) */}
          <div className="absolute top-[80px] left-0 right-0 h-[85px] pointer-events-none z-10">
            <svg width={svgWidth} height={svgHeight} className="overflow-visible">
              <defs>
                <linearGradient id="tempCurveGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Fill Gradient Area under the curve */}
              {fillPath && (
                <path d={fillPath} fill="url(#tempCurveGlow)" />
              )}
              
              {/* Curve Stroke Line */}
              {linePath && (
                <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
              )}
              
              {/* Glowing Nodes & Text Values */}
              {points.map((p, idx) => (
                <g key={idx}>
                  {/* Outer circle glow */}
                  <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" className="drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                  {/* Inner node dot */}
                  <circle cx={p.x} cy={p.y} r="2" fill="#10b981" />
                  
                  {/* Temperature text value */}
                  <text
                    x={p.x}
                    y={p.y - 12}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="900"
                    className="drop-shadow-md select-none"
                  >
                    {formatTemp(p.temp)}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* 2. Flexible Cards Row (aligned with SVG layout coordinates) */}
          <div className="flex gap-3 relative z-0">
            {hourly.map((item, index) => {
              const isNow = index === 0;
              return (
                <div
                  key={item.timestamp || index}
                  className={`snap-start shrink-0 w-[84px] h-[215px] p-3 rounded-2xl flex flex-col items-center justify-between text-center transition-all duration-200 border ${
                    isNow
                      ? 'bg-gradient-to-b from-emerald-600 to-teal-700/80 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:border-white/20'
                  }`}
                >
                  {/* Time */}
                  <span className={`text-xs font-bold mb-1.5 ${isNow ? 'text-white' : 'text-slate-400'}`}>
                    {item.time}
                  </span>

                  {/* Weather Condition Icon */}
                  <div className="my-1 h-8 flex items-center justify-center text-xl">
                    {(item?.condition || '').includes('Rain') || (item?.condition || '').includes('Shower') ? '🌧️' :
                     (item?.condition || '').includes('Cloud') ? '⛅' :
                     (item?.condition || '').includes('Thunder') ? '⛈️' : '☀️'}
                  </div>

                  {/* Rain Probability Badge */}
                  <div className={`flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full mb-1 ${
                    item.rainProbability >= 50 ? 'bg-blue-500/30 text-blue-300 border border-blue-400/30' :
                    item.rainProbability >= 25 ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 opacity-75'
                  }`}>
                    <Droplets size={10} className="shrink-0" />
                    <span>{item.rainProbability}%</span>
                  </div>

                  {/* Spacer for SVG curve chart line overlap */}
                  <div className="h-[70px] w-full pointer-events-none" />

                  {/* Wind Speed info at the bottom */}
                  <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-400 font-medium justify-center border-t border-white/5 pt-1.5 w-full">
                    <Wind size={9} className="text-teal-400" />
                    <span>{item.windSpeed} km/h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

