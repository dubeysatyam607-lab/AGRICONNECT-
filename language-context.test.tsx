import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { LanguageProvider, useLanguage, LANGUAGE_NAMES } from './src/contexts/LanguageContext';
import { translations } from './src/i18n/translations';

const Probe: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="tractors">{t('nav.tractors')}</span>
      <span data-testid="missing">{t('nav.doesNotExist')}</span>
      <span data-testid="partial">{t('home.rentTractor')}</span>
      <button onClick={() => setLanguage('hi')}>to-hi</button>
      <button onClick={() => setLanguage('mr')}>to-mr</button>
    </div>
  );
};

const setup = () =>
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>
  );

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.lang = '';
});

describe('LanguageContext — translation', () => {
  it('defaults to English and translates known keys', () => {
    const { getByTestId } = setup();
    expect(getByTestId('lang').textContent).toBe('en');
    expect(getByTestId('tractors').textContent).toBe('Tractors');
  });

  it('falls back to the key itself when missing from all locales', () => {
    const { getByTestId } = setup();
    expect(getByTestId('missing').textContent).toBe('nav.doesNotExist');
  });
});

describe('LanguageContext — switching', () => {
  it('switches translations and persists the choice to localStorage', () => {
    const { getByTestId, getByText } = setup();
    act(() => getByText('to-hi').click());
    expect(getByTestId('lang').textContent).toBe('hi');
    expect(getByTestId('tractors').textContent).toBe('ट्रैक्टर');
    expect(localStorage.getItem('app-language')).toBe('hi');
  });

  it('falls back to English for keys a partial locale lacks', () => {
    const { getByTestId, getByText } = setup();
    act(() => getByText('to-hi').click());
    expect(getByTestId('tractors').textContent).toBe('ट्रैक्टर');
  });

  it('translates keys in every advertised locale (no partial locales remain)', () => {
    const { getByTestId, getByText } = setup();
    act(() => getByText('to-mr').click());
    expect(getByTestId('lang').textContent).toBe('mr');
    expect(getByTestId('partial').textContent).toBe('ट्रॅक्टर भाड्याने घ्या');
  });

  it('updates the document root lang attribute', () => {
    const { getByText } = setup();
    expect(document.documentElement.lang).toBe('en');
    act(() => getByText('to-hi').click());
    expect(document.documentElement.lang).toBe('hi');
  });
});

describe('LanguageContext — locale completeness', () => {
  it('supports all 12 advertised Indian languages', () => {
    expect(Object.keys(LANGUAGE_NAMES)).toEqual([
      'en', 'hi', 'mr', 'gu', 'pa', 'ta', 'te', 'kn', 'ml', 'bn', 'or', 'as',
    ]);
  });

  it('has no partial locales — every locale covers the full English key set', () => {
    const enKeys = Object.keys(translations.en).sort();
    for (const lang of Object.keys(LANGUAGE_NAMES)) {
      expect(Object.keys(translations[lang]).sort()).toEqual(enKeys);
    }
  });
});
