import { translations } from './translations';
import { journey, interpolate } from './journey';
import { LANGUAGE_NAMES } from '../contexts/LanguageContext';
import type { Language } from '../contexts/LanguageContext';

/**
 * Pure i18n resolver usable outside React (stores, push notifications, etc.).
 * Falls back through the requested language → English → the raw key.
 */
export function resolveKey(
  language: Language,
  key: string,
  params?: Record<string, string | number>,
): string {
  const out =
    translations[language]?.[key] ||
    translations.en[key] ||
    journey[language]?.[key] ||
    journey.en[key] ||
    key;
  return params ? interpolate(out, params) : out;
}

/** Current saved app language without subscribing to React state. */
export function currentLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('app-language');
  return saved && saved in LANGUAGE_NAMES ? (saved as Language) : 'en';
}
