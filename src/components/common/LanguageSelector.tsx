import React, { useState, useEffect } from 'react';
import { Globe, Check, X } from 'lucide-react';
import { useLanguage, LANGUAGE_NAMES, type Language } from '@/contexts/LanguageContext';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const handleSelect = (code: string) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(12); } catch { /* unsupported */ }
    }
    setLanguage(code as Language);
    setOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-2xl glass-dock px-3.5 py-2 text-xs font-bold text-foreground border border-border shadow-sm hover:scale-105 transition-all tap-bounce"
        aria-label={t('onb.lang.title') || 'Choose language'}
      >
        <Globe size={15} className="text-emerald-600 dark:text-emerald-400" />
        <span className="font-semibold">{LANGUAGE_NAMES[language]}</span>
      </button>

      {open && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div 
            className="bg-card border border-border rounded-3xl shadow-2xl p-6 w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-extrabold text-foreground">
                  {t('onb.lang.title') || 'Choose Language / भाषा चुनें'}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <ul className="space-y-1.5 overflow-y-auto py-3 pr-1 my-1">
              {Object.entries(LANGUAGE_NAMES).map(([code, name]) => {
                const isSelected = code === language;
                return (
                  <li key={code}>
                    <button
                      onClick={() => handleSelect(code)}
                      className={`w-full flex items-center justify-between text-left rounded-2xl px-4 py-3 text-sm font-bold transition-all tap-bounce ${
                        isSelected 
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25' 
                          : 'hover:bg-muted/70 text-foreground'
                      }`}
                    >
                      <span>{name}</span>
                      {isSelected && <Check size={16} className="text-white shrink-0 stroke-[3]" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-2xl bg-muted py-2.5 text-xs font-bold text-foreground hover:bg-muted/80 transition-colors"
            >
              {t('common.close') || t('common.back') || 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

