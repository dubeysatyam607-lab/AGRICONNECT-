import React from 'react';
import { AppButton } from '@/shared/widgets/AppButton';

/**
 * Enterprise Reusable Empty State View.
 * Displays user-friendly illustrations and actionable CTA buttons when data lists are blank.
 */

export interface IEmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<IEmptyStateProps> = ({
  icon = '🌾',
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`w-full py-16 px-6 flex flex-col items-center justify-center text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 animate-fade-in ${className}`}>
      <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-4xl mb-4 shadow-inner">
        {icon}
      </div>
      <h3 className="text-lg font-extrabold text-foreground tracking-tight max-w-sm mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-6">{description}</p>
      {actionText && onAction && (
        <AppButton variant="primary" size="md" onClick={onAction}>
          {actionText}
        </AppButton>
      )}
    </div>
  );
};
