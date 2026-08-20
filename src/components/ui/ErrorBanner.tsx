// src/components/ui/ErrorBanner.tsx
import React from 'react';

/**
 * Simple error banner displayed at the top of a page or component.
 * Accepts an optional retry callback that can be attached to a button.
 */
interface ErrorBannerProps {
  /** Human‑readable error message */
  message: string;
  /** Optional handler to retry the failed operation */
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-rose-600 text-white p-4 shadow-lg">
      <span className="font-medium">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 rounded bg-white px-3 py-1 text-rose-600 hover:bg-rose-50"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
