import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, LANGUAGE_NAMES } from '@/contexts/LanguageContext';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const handleSelect = (code: string) => {
    setLanguage(code as any);
    setOpen(false);
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-white/20"
        aria-label={t('language.selector') ?? 'Select language'}
      >
        <Globe size={16} />
        {LANGUAGE_NAMES[language]}
      </button>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-xl shadow-lg p-6 w-80 max-h-[80vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {t('onb.lang.title') ?? 'Choose language'}
            </h2>
            <ul className="space-y-2">
              {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                <li key={code}>
                  <button
                    onClick={() => handleSelect(code)}
                    className={`w-full text-left rounded px-3 py-2 ${code === language ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-500/10 text-foreground'}`}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded bg-slate-200 dark:bg-slate-700 px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              {t('common.back') ?? 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
