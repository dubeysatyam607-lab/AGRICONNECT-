import { describe, it, expect } from 'vitest';
import { journey, type JourneyLocale } from './index';

const LOCALES: JourneyLocale[] = ['en', 'hi', 'mr', 'gu', 'pa', 'ta', 'te', 'kn', 'ml', 'bn', 'or', 'as'];

describe('journey dictionaries', () => {
  const enKeys = Object.keys(journey.en).sort();
  const keySet = new Set(enKeys);

  it.each(LOCALES)('%s has exactly the same keys as en', (locale) => {
    const keys = Object.keys(journey[locale]).sort();
    expect(keys).toEqual(enKeys);
  });

  it('has no duplicate keys in any locale', () => {
    for (const locale of LOCALES) {
      const keys = Object.keys(journey[locale]);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('has consistent {placeholder} tokens across locales', { timeout: 20000 }, () => {
    for (const locale of LOCALES) {
      for (const key of enKeys) {
        const enTokens = new Set(journey.en[key].match(/\{(\w+)\}/g) ?? []);
        const localeTokens = new Set(journey[locale][key].match(/\{(\w+)\}/g) ?? []);
        expect(localeTokens, `${locale} ${key}`).toEqual(enTokens);
      }
    }
  });

  it('has no key that equals a raw key fallback (untranslated), except en', () => {
    for (const locale of LOCALES) {
      if (locale === 'en') continue;
      for (const key of enKeys) {
        if (journey[locale][key] === key) {
          throw new Error(`${locale} ${key} is untranslated (value equals its key)`);
        }
      }
    }
  });

  it('has a sensible number of keys', () => {
    expect(enKeys.length).toBeGreaterThan(300);
  });
});
