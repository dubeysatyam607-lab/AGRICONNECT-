import { translations } from './translations';
import { journey, interpolate, localeFor } from './journey';
import { LANGUAGE_NAMES } from '../contexts/LanguageContext';
import type { Language } from '../contexts/LanguageContext';

/** Formats camelCase or dot-separated keys into human readable fallback if dictionary has no match */
function cleanKeyFallback(key: string): string {
  if (!key) return '';
  const lastPart = key.split('.').pop() || key;
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Pure i18n resolver usable outside React (stores, push notifications, etc.).
 * Falls back through the requested language → English → the raw key.
 */
export function resolveKey(
  language: Language,
  key: string,
  params?: Record<string, string | number>,
): string {
  if (!key) return '';
  const out =
    journey[language]?.[key] ||
    translations[language]?.[key] ||
    journey.en?.[key] ||
    translations.en?.[key] ||
    key;
  return params ? interpolate(out, params) : out;
}

/** Current saved app language without subscribing to React state. */
export function currentLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('agriconnect_language') || localStorage.getItem('app-language');
  return saved && saved in LANGUAGE_NAMES ? (saved as Language) : 'en';
}

/** Format currency consistently in Indian Rupees (INR) */
export function formatINR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Format date according to the selected Indian language locale */
export function formatLocalizedDate(
  date: Date | string | number,
  language: Language = 'en',
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    const d = typeof date === 'object' ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const loc = localeFor(language as any) || 'en-IN';
    return d.toLocaleDateString(loc, options || { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(date);
  }
}
