import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { resolveKey } from '../i18n/translate';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalAuth } from '@/hooks/useAuth';

export type Language = 'en' | 'hi' | 'mr' | 'gu' | 'pa' | 'ta' | 'te' | 'kn' | 'ml' | 'bn' | 'or' | 'as';

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English (India)',
  hi: 'Hindi (हिंदी)',
  mr: 'Marathi (मराठी)',
  gu: 'Gujarati (ગુજરાતી)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  bn: 'Bengali (বাংলা)',
  or: 'Odia (ଓଡ଼ିଆ)',
  as: 'Assamese (অসমীয়া)',
};

export const LANGUAGE_CODES: Record<string, Language> = {
  'English (India)': 'en',
  'Hindi (हिंदी)': 'hi',
  'Marathi (मराठी)': 'mr',
  'Gujarati (ગુજરાતી)': 'gu',
  'Punjabi (ਪੰਜਾਬੀ)': 'pa',
  'Tamil (தமிழ்)': 'ta',
  'Telugu (తెలుగు)': 'te',
  'Kannada (ಕನ್ನಡ)': 'kn',
  'Malayalam (മലയാളം)': 'ml',
  'Bengali (বাংলা)': 'bn',
  'Odia (ଓଡ଼ିଆ)': 'or',
  'Assamese (অসমীয়া)': 'as',
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languageName: string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
}

const STORAGE_KEY = 'agriconnect_language';
const LEGACY_STORAGE_KEY = 'app-language';

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved && saved in LANGUAGE_NAMES) return saved as Language;

    // Detect browser language if available
    const navLang = navigator.language?.split('-')[0];
    if (navLang && navLang in LANGUAGE_NAMES) return navLang as Language;
  } catch {
    // LocalStorage or navigator access error fallback
  }
  return 'en';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const user = useOptionalAuth()?.user ?? null;
  const hydrated = useRef(false);

  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // Sync language with Supabase so it survives across devices (best-effort).
  useEffect(() => {
    if (!user) {
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('app_language')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        const serverLang = data?.app_language as Language | undefined;
        if (serverLang && serverLang in LANGUAGE_NAMES) {
          hydrated.current = true;
          setLanguageState(serverLang);
          localStorage.setItem(STORAGE_KEY, serverLang);
          localStorage.setItem(LEGACY_STORAGE_KEY, serverLang);
        } else if (!hydrated.current) {
          const local = (localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || 'en') as Language;
          await supabase.from('profiles').update({ app_language: local }).eq('id', user.id);
        }
      } catch {
        // Network/RLS errors are non-fatal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      localStorage.setItem(LEGACY_STORAGE_KEY, lang);
    } catch {
      // Storage unavailable
    }
    if (user) {
      supabase.from('profiles').update({ app_language: lang }).eq('id', user.id)
        .then(({ error }) => { if (error) console.warn('[LanguageContext] Failed to persist language:', error.message); })
        .catch(() => {});
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => resolveKey(language, key, params);

  const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = typeof date === 'object' ? date : new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(language === 'en' ? 'en-IN' : `${language}-IN`, options || { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return String(date);
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t,
      languageName: LANGUAGE_NAMES[language] || 'English (India)',
      formatDate,
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
