import React from 'react';

/**
 * Enterprise Reusable Loading State Views.
 * Provides accessible shimmer skeletons for cards, lists, and dashboards.
 */

export const CardSkeleton: React.FC = () => (
  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-sm animate-pulse space-y-4">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2" />
      </div>
    </div>
    <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-full" />
    <div className="flex justify-between items-center pt-2">
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-24" />
    </div>
  </div>
);

export const LoadingState: React.FC<{ count?: number; title?: string }> = ({ count = 3, title }) => {
  return (
    <div className="w-full space-y-4 py-4 animate-fade-in">
      {title && <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-48 mb-6 animate-pulse" />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};
