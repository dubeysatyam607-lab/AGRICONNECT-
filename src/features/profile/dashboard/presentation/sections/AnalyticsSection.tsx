import React, { useMemo } from 'react';
import { Droplets, TrendingUp, Wallet, Sprout, Gauge } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UseDigitalProfileReturn } from '../types';

interface AnalyticsSectionProps {
  data: UseDigitalProfileReturn;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid var(--border)',
  fontSize: 12,
  fontWeight: 700,
  background: 'var(--card)',
  color: 'var(--foreground)',
};

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ data }) => {
  const { t } = useLanguage();

  const waterData = useMemo(() => {
    const base = data.onboarding.waterSources.includes('Rain-fed') ? 18 : 34;
    return MONTHS.slice(0, 6).map((m, i) => ({ month: m, usage: Math.round(base + Math.sin(i * 1.3) * 10 + i * 2) }));
  }, [data.onboarding.waterSources]);

  const incomeData = useMemo(() => {
    const seg = Math.max(1, Math.round(data.totalIncome / 4));
    const exp = Math.max(1, Math.round(data.totalExpense / 4));
    return MONTHS.slice(-4).map((m, i) => ({
      month: m,
      income: Math.round(seg * (0.7 + (i % 2) * 0.5)),
      expense: Math.round(exp * (0.8 + ((i + 1) % 2) * 0.4)),
    }));
  }, [data.totalIncome, data.totalExpense]);

  const marketData = useMemo(() => {
    const base = 2000;
    return MONTHS.slice(-6).map((m, i) => ({ month: m, price: base + i * 60 + (i % 2) * 80 }));
  }, []);

  const area = Math.max(Number(data.farm.farmArea || data.onboarding.farmSize || data.profile?.farmSpecs.totalArea || 1), 0.5);
  const yieldQtl = Math.round(area * 18 + (data.stageProgress / 100) * 6);

  const stageDots = ['Pre-sowing', 'Sowing', 'Vegetative growth', 'Flowering', 'Harvesting', 'Harvested'];
  const currentStageIdx = Math.max(0, stageDots.indexOf(data.cropStage));

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{t('prof.analytics')}</h2>
      </div>

      {/* Income vs expense */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-sm font-extrabold text-foreground flex items-center gap-2 mb-1">
          <Wallet size={16} className="text-emerald-600" /> {t('prof.incomeExpense')}
        </p>
        <div className="flex gap-4 mb-3 text-xs">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{t('prof.statIncome')}: ₹{data.totalIncome.toLocaleString('en-IN')}</span>
          <span className="font-bold text-red-500">{t('prof.statExpenses')}: ₹{data.totalExpense.toLocaleString('en-IN')}</span>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeData} margin={{ top: 4, right: 0, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
              <Bar dataKey="income" name={t('prof.statIncome')} fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name={t('prof.statExpenses')} fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Water usage */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-sm font-extrabold text-foreground flex items-center gap-2 mb-3">
          <Droplets size={16} className="text-sky-600" /> {t('prof.waterUsage')}
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={waterData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="usage" name={t('prof.waterUnit')} stroke="#0ea5e9" strokeWidth={2.5} fill="url(#waterGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Growth timeline */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-sm font-extrabold text-foreground flex items-center gap-2 mb-4">
          <Sprout size={16} className="text-lime-600" /> {t('prof.growthTimeline')}
        </p>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-3 left-3 right-3 h-0.5 bg-muted" />
          <div
            className="absolute top-3 left-3 h-0.5 bg-gradient-to-r from-lime-500 to-emerald-600 transition-[width] duration-1000 ease-out"
            style={{ width: `${(currentStageIdx / (stageDots.length - 1)) * 100}%` }}
          />
          {stageDots.map((s, i) => (
            <div key={s} className="relative z-10 flex flex-col items-center gap-1.5 flex-1">
              <span className={`h-3 w-3 rounded-full border-2 ${i <= currentStageIdx ? 'border-emerald-600 bg-emerald-600' : 'border-muted bg-card'}`} />
              <span className={`text-[9px] font-bold text-center leading-tight ${i === currentStageIdx ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t(`opt:${s}`) || s}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Yield estimate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-xs font-extrabold text-muted-foreground flex items-center gap-1.5">
            <Gauge size={14} className="text-amber-600" /> {t('prof.estimatedYield')}
          </p>
          <p className="mt-2 text-3xl font-extrabold text-foreground tabular-nums">
            {yieldQtl} <span className="text-sm font-bold text-muted-foreground">{t('prof.qtl')}</span>
          </p>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-marigold transition-[width] duration-1000 ease-out" style={{ width: `${data.stageProgress}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t('prof.yieldProgress')} {data.stageProgress}%</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-extrabold text-foreground flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-feature-mandi" /> {t('prof.marketTrend')}
          </p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="price" name="₹/qtl" stroke="#d97706" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
