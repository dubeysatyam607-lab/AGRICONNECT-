import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, X, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

const InstallPWAButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const visits = parseInt(localStorage.getItem('agri_visit_count') || '0', 10) + 1;
    localStorage.setItem('agri_visit_count', visits.toString());
    const hasUsedAi = localStorage.getItem('agri_ai_chat_used') === 'true';
    const isEngaged = visits >= 3 || hasUsedAi;
    const wasDismissed = localStorage.getItem('agri_pwa_dismissed') === 'true';

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isEngaged && !wasDismissed) {
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 6000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 6000);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setIsInstallable(false);
    localStorage.setItem('agri_pwa_dismissed', 'true');
  };

  if (installedSuccess) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 animate-fade-in">
        <CheckCircle2 size={18} className="shrink-0" />
        <span>App installed! Open from your home screen.</span>
      </div>
    );
  }

  if (!isInstallable || dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-card/95 backdrop-blur-md px-4 py-3 shadow-card animate-fade-in">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Smartphone size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-tight">Install AgriConnect</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Works offline & loads faster</p>
      </div>
      <button
        onClick={handleInstallClick}
        className={cn(
          "flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground",
          "hover:bg-primary/90 active:scale-95 transition-all shadow-sm shadow-primary/20"
        )}
      >
        <Download size={13} />
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default InstallPWAButton;
