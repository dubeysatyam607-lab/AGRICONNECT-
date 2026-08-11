import React from 'react';

interface ScoreRingProps {
  value: number;
  label: string;
  color?: string;
  icon?: React.ReactNode;
  sub?: string;
}

/**
 * Animated progress ring used for Farm Score, AI Readiness and Profile Completion.
 */
export const ScoreRing: React.FC<ScoreRingProps> = ({ value, label, color = '#15803d', icon, sub }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[92px] w-[92px]">
        <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
          <circle cx="46" cy="46" r={radius} fill="none" strokeWidth="9" className="stroke-muted" />
          <circle
            cx="46"
            cy="46"
            r={radius}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            className="transition-[stroke-dashoffset] duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-extrabold tracking-tight text-foreground tabular-nums">
            {clamped}
          </span>
        </div>
        {icon && <span className="absolute -top-1 -right-1">{icon}</span>}
      </div>
      <div className="text-center leading-tight">
        <p className="text-xs font-extrabold text-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground font-medium">{sub}</p>}
      </div>
    </div>
  );
};
