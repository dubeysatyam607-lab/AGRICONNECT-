import React, { useEffect } from 'react';

/**
 * Enterprise Material 3 Bottom Sheet / Drawer Widget.
 * Essential mobile-first UI container for farmer filters, tractor specs, and Mandi price details.
 */

export interface IAppBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const AppBottomSheet: React.FC<IAppBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-slide-up overflow-hidden">
        {/* Grabber handle */}
        <div className="w-full pt-3 pb-2 flex items-center justify-center cursor-grab" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-foreground tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">{children}</div>
      </div>
    </div>
  );
};
