import React from 'react';

/**
 * Enterprise Material 3 Reusable Surface Card Widget.
 * Features Apple/CRED inspired glassmorphism, hover elevation physics, and interactive ripple effects.
 */

export interface IAppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'surface' | 'glass' | 'elevated' | 'outlined';
  isInteractive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const AppCard: React.FC<IAppCardProps> = ({
  children,
  variant = 'surface',
  isInteractive = false,
  padding = 'md',
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles = 'rounded-3xl transition-all duration-300 relative overflow-hidden';

  const variantStyles: Record<string, string> = {
    surface: 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm',
    glass: 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-800/60 shadow-lg shadow-slate-900/5',
    elevated: 'bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 border border-transparent dark:border-slate-800',
    outlined: 'bg-transparent border-2 border-slate-200 dark:border-slate-800 shadow-none',
  };

  const interactiveStyles = isInteractive
    ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] group'
    : '';

  const paddingStyles: Record<string, string> = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${interactiveStyles} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
