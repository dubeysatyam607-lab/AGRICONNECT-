import React from 'react';
import { calculatePasswordStrength } from '../../domain/models/AuthValidations';

/**
 * Enterprise Password Strength Meter Component.
 * Displays real-time score bar (0 to 4), label, and visual checklist of criteria.
 */
export const PasswordStrength: React.FC<{ password?: string }> = ({ password = '' }) => {
  const { score, label, color, feedback, requirements } = calculatePasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-2.5 pt-1 animate-fade-in">
      {/* 4-segment strength bar */}
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map(idx => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              score >= idx ? color : 'bg-slate-200 dark:bg-slate-800'
            }`}
          />
        ))}
      </div>

      {/* Label and guidance */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold tracking-wide uppercase text-muted-foreground">
          Strength: <span className="text-foreground">{label}</span>
        </span>
        <span className="text-[11px] text-muted-foreground font-medium">{feedback}</span>
      </div>

      {/* Criteria checklist pill badges */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors ${
          requirements.length ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
        }`}>
          {requirements.length ? '✓' : '•'} 8+ Chars
        </div>
        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors ${
          requirements.hasUpper ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
        }`}>
          {requirements.hasUpper ? '✓' : '•'} Uppercase
        </div>
        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors ${
          requirements.hasNumber ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
        }`}>
          {requirements.hasNumber ? '✓' : '•'} Number
        </div>
        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors ${
          requirements.hasSpecial ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
        }`}>
          {requirements.hasSpecial ? '✓' : '•'} Symbol
        </div>
      </div>
    </div>
  );
};
