import React, { useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';

/**
 * Splash screen shown while the DI container and session initialize.
 */
export const SplashView: React.FC<{ onFinish: (isAuthenticated: boolean) => void }> = ({ onFinish }) => {
  const [state] = useAuthViewModel();
  const { t } = useLanguage();

  useEffect(() => {
    if (state.isInitializing) return;
    const timer = setTimeout(() => onFinish(state.isAuthenticated), 2200);
    return () => clearTimeout(timer);
  }, [state.isInitializing, state.isAuthenticated, onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center">
        <Logo size={96} />

        <div className="mt-6 text-center">
          <h1 className="type-h1">AgriConnect</h1>
          <p className="type-small text-muted-foreground mt-1">
            {t('splash.tagline')}
          </p>
        </div>

        <div className="mt-6 flex items-center gap-2 type-meta text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
          {t('splash.securing')}
        </div>
      </div>

      <div className="absolute bottom-8 text-center">
        <span className="type-label text-muted-foreground">
          {t('splash.madeIn')}
        </span>
      </div>
    </div>
  );
};
