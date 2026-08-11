import React from 'react';
import {
  Bug, CloudSun, Combine, Droplets, FlaskConical, Landmark, Layers,
  ListChecks, ScanLine, Sprout, Tractor, TrendingUp, Wallet, Wheat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarType, RecCategory, RecPriority, TimelineType } from '../../domain/farmOsTypes';

export const priorityStyles: Record<RecPriority, string> = {
  high: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  low: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

export const priorityDot: Record<RecPriority, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-sky-500',
};

export const recCategoryIcons: Record<RecCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  irrigation: Droplets,
  fertilizer: FlaskConical,
  pesticide: Bug,
  harvest: Wheat,
  market: TrendingUp,
  scheme: Landmark,
  weather: CloudSun,
  soil: Layers,
  task: ListChecks,
};

export const timelineIcons: Record<TimelineType, React.ComponentType<{ size?: number; className?: string }>> = {
  sowing: Sprout,
  irrigation: Droplets,
  fertilizer: FlaskConical,
  pesticide: Bug,
  disease: ScanLine,
  weather: CloudSun,
  equipment: Tractor,
  expense: Wallet,
  harvest: Wheat,
  sale: TrendingUp,
};

export const calendarIcons: Record<CalendarType, React.ComponentType<{ size?: number; className?: string }>> = {
  irrigation: Droplets,
  fertilizer: FlaskConical,
  spray: Bug,
  harvest: Combine,
  equipment: Tractor,
  scheme: Landmark,
};

export const EmptyState: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-8 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Icon size={17} />
    </span>
    <p className="max-w-[220px] text-xs font-semibold leading-relaxed text-muted-foreground">{text}</p>
  </div>
);

export const HealthRing: React.FC<{ score: number; size?: number }> = ({ score, size = 96 }) => {
  const radius = size / 2 - 7;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const stroke = score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={8} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
          stroke={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ - (circ * pct) / 100}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-black tracking-tight text-foreground">{pct}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
};

export const TrendDots: React.FC<{ trend: number[] }> = ({ trend }) => (
  <div className="flex items-end gap-1">
    {trend.map((v, i) => (
      <span
        key={i}
        className={cn(
          'w-1.5 rounded-full',
          v >= 75 ? 'bg-emerald-500' : v >= 55 ? 'bg-amber-500' : 'bg-rose-500',
        )}
        style={{ height: Math.max(4, (v / 100) * 18) }}
      />
    ))}
  </div>
);

export const inr = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;
