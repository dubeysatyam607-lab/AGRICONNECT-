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
  t: (key: string) => string;
  languageName: string;
}


const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const user = useOptionalAuth()?.user ?? null;
  const hydrated = useRef(false);

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved && saved in LANGUAGE_NAMES) ? saved as Language : 'en';
  });

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
          // Server preference wins on a fresh device; keep it in localStorage too.
          hydrated.current = true;
          setLanguageState(serverLang);
          localStorage.setItem('app-language', serverLang);
        } else if (!hydrated.current) {
          // No server preference yet — push the local choice so the next device syncs.
          const local = (localStorage.getItem('app-language') ?? 'en') as Language;
          await supabase.from('profiles').update({ app_language: local }).eq('id', user.id);
        }
      } catch {
        // Network/RLS errors are non-fatal; the app still works with localStorage.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
    if (user) {
      supabase.from('profiles').update({ app_language: lang }).eq('id', user.id)
        .then(({ error }) => { if (error) console.warn('[LanguageContext] Failed to persist language:', error.message); })
        .catch(() => {});
    }
  };

  const t = (key: string): string => resolveKey(language, key);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t,
      languageName: LANGUAGE_NAMES[language]
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
