import React from 'react';

/**
 * Shared onboarding UI primitives — large cards, chips, steppers, progress.
 * All motion is transform/opacity only → 60 FPS.
 */

export const StepTitle: React.FC<{ badge: string; title: string; subtitle: string }> = ({ badge, title, subtitle }) => (
  <div className="mb-5">
    <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
      {badge}
    </span>
    <h2 className="mt-2.5 text-[1.55rem] font-extrabold leading-tight tracking-tight text-slate-900">{title}</h2>
    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
  </div>
);

export const Chip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ active, onClick, children, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-3 text-left text-xs font-bold transition-all duration-150 active:scale-[0.96] ${
      active
        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
        : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300'
    } ${className}`}
  >
    {children}
  </button>
);

export const ChipGroup: React.FC<{
  options: { id: string; label: string; emoji?: string }[] | string[];
  selected: string[];
  onToggle: (id: string) => void;
  columns?: 2 | 3;
}> = ({ options, selected, onToggle, columns = 2 }) => (
  <div className={columns === 3 ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}>
    {options.map((opt) => {
      const id = typeof opt === 'string' ? opt : opt.id;
      const label = typeof opt === 'string' ? opt : opt.label;
      const emoji = typeof opt === 'string' ? undefined : opt.emoji;
      const active = selected.includes(id);
      return (
        <Chip key={id} active={active} onClick={() => onToggle(id)}>
          {emoji && <span>{emoji}</span>}
          <span>{label}</span>
        </Chip>
      );
    })}
  </div>
);

export const SingleChipGroup: React.FC<{
  options: string[] | { id: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  columns?: 2 | 3;
}> = ({ options, value, onSelect, columns = 2 }) => (
  <div className={columns === 3 ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}>
    {options.map((opt) => {
      const id = typeof opt === 'string' ? opt : opt.id;
      const label = typeof opt === 'string' ? opt : opt.label;
      return (
        <Chip key={id} active={value === id} onClick={() => onSelect(id)}>
          <span>{label}</span>
        </Chip>
      );
    })}
  </div>
);

export const Stepper: React.FC<{
  emoji: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ emoji, label, value, onChange }) => (
  <div className="flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-4 py-3">
    <div className="flex items-center gap-2.5">
      <span className="text-xl">{emoji}</span>
      <span className="text-xs font-bold text-slate-600">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-extrabold text-slate-600 transition-all active:scale-90 hover:bg-slate-200"
      >
        −
      </button>
      <span className="w-6 text-center text-base font-extrabold text-slate-900">{value}</span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(99, value + 1))}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-lg font-extrabold text-emerald-700 transition-all active:scale-90 hover:bg-emerald-200"
      >
        +
      </button>
    </div>
  </div>
);

export const LargeCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>{children}</div>
);

export const FieldLabel: React.FC<{ emoji?: string; children: React.ReactNode; hint?: string }> = ({ emoji, children, hint }) => (
  <div className="mb-1.5 flex items-baseline justify-between">
    <label className="text-xs font-bold text-slate-500">
      {emoji && <span className="mr-1">{emoji}</span>}
      {children}
    </label>
    {hint && <span className="text-[10px] font-semibold text-slate-300">{hint}</span>}
  </div>
);

export const TextField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: 'text' | 'tel';
  inputMode?: 'text' | 'tel';
}> = ({ value, onChange, placeholder, type = 'text', inputMode = 'text' }) => (
  <input
    type={type}
    inputMode={inputMode}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:font-medium placeholder:text-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
  />
);

export const OnboardingCta: React.FC<{
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}> = ({ label, disabled, loading, onClick }) => (
  <button
    type="button"
    disabled={disabled || loading}
    onClick={onClick}
    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-600/20 transition-all duration-150 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
  >
    {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
    {label}
    {!loading && (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    )}
  </button>
);
