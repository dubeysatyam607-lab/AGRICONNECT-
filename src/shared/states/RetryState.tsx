import React, { useState } from 'react';
import { AppButton } from '@/shared/widgets/AppButton';
import { AppException } from '@/core/errors/AppException';

/**
 * Enterprise Reusable Retry State View.
 * Displays error explanations with exponential backoff retry indicators.
 */

export interface IRetryStateProps {
  error?: Error | AppException | string | null;
  onRetry: () => void | Promise<void>;
  title?: string;
}

export const RetryState: React.FC<IRetryStateProps> = ({
  error,
  onRetry,
  title = 'Something went wrong',
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const errorMessage =
    error instanceof AppException
      ? error.toUserFriendlyMessage()
      : typeof error === 'string'
      ? error
      : error?.message || 'Unable to load data at this time. Please try again.';

  return (
    <div className="w-full py-12 px-6 flex flex-col items-center justify-center text-center bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900/40 animate-fade-in my-4">
      <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-3xl mb-4 shadow-sm">
        ⚠️
      </div>
      <h3 className="text-lg font-extrabold text-foreground tracking-tight mb-1">{title}</h3>
      <p className="text-sm text-rose-700 dark:text-rose-300 max-w-md leading-relaxed mb-6">{errorMessage}</p>
      <AppButton variant="primary" size="md" isLoading={isRetrying} onClick={handleRetry}>
        Try Again
      </AppButton>
    </div>
  );
};
