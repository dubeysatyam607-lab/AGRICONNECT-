import type { JourneyDict } from './types';
import { en } from './en';
import { hi } from './hi';
import { mr } from './mr';
import { gu } from './gu';
import { pa } from './pa';
import { ta } from './ta';
import { te } from './te';
import { kn } from './kn';
import { ml } from './ml';
import { bn } from './bn';
import { or } from './or';
import { as } from './as';

export type JourneyLocale =
  | 'en' | 'hi' | 'mr' | 'gu' | 'pa'
  | 'ta' | 'te' | 'kn' | 'ml' | 'bn' | 'or' | 'as';

/** Flat key → string dictionary per locale (English is the completeness contract). */
export const journey: Record<JourneyLocale, JourneyDict> = {
  en, hi, mr, gu, pa, ta, te, kn, ml, bn, or, as,
};

/** Replaces {token} placeholders with params. Unknown tokens are left intact. */
export const interpolate = (
  template: string,
  params: Record<string, string | number>,
): string =>
  template.replace(/\{(\w+)\}/g, (m, k) =>
    params[k] != null ? String(params[k]) : m,
  );

/** Maps an app language to its Intl locale for dates/numbers. */
export const localeFor = (lang: JourneyLocale): string =>
  ({
    en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', gu: 'gu-IN', pa: 'pa-IN',
    ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', bn: 'bn-IN',
    or: 'or-IN', as: 'as-IN',
  })[lang] ?? 'en-IN';
