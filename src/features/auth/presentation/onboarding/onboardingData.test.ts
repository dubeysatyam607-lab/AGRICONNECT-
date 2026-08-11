import { describe, it, expect, beforeEach } from 'vitest';
import { journey } from '@/i18n/journey';
import {
  defaultOnboardingData,
  saveOnboardingData,
  loadOnboardingData,
  hasOnboardingData,
  buildFarmerProfile,
  generateRecommendations,
  type IOnboardingData,
} from './onboardingData';

const enT = (k: string): string => journey.en[k] ?? k;

const seeded = (overrides: Partial<IOnboardingData> = {}): IOnboardingData => ({
  ...defaultOnboardingData('en'),
  fullName: 'Ramesh Patel',
  ageGroup: '26–40',
  state: 'Punjab',
  district: 'Ludhiana',
  village: 'Doraha',
  farmSize: '8',
  ownership: 'Owned',
  primaryCrops: ['Wheat (Gehun)'],
  cropStage: 'Vegetative growth',
  waterSources: ['Drip irrigation'],
  machinery: ['Tractor'],
  interests: ['weather', 'organic'],
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe('defaultOnboardingData', () => {
  it('respects the selected language and resets all answers', () => {
    const d = defaultOnboardingData('hi');
    expect(d.language).toBe('hi');
    expect(d.fullName).toBe('');
    expect(d.primaryCrops).toEqual([]);
    expect(d.landUnit).toBe('Acres');
    expect(d.permissions.location).toBe(false);
  });
});

describe('persistence', () => {
  it('round-trips through localStorage', () => {
    expect(hasOnboardingData()).toBe(false);
    saveOnboardingData(seeded());
    expect(hasOnboardingData()).toBe(true);
    const loaded = loadOnboardingData('en');
    expect(loaded.fullName).toBe('Ramesh Patel');
    expect(loaded.state).toBe('Punjab');
    expect(loaded.primaryCrops).toContain('Wheat (Gehun)');
  });

  it('falls back to defaults in the given language when nothing is stored', () => {
    const d = loadOnboardingData('ta');
    expect(d.language).toBe('ta');
    expect(d.fullName).toBe('');
  });
});

describe('buildFarmerProfile', () => {
  it('maps every answer onto the enterprise farmer profile', () => {
    const profile = buildFarmerProfile(seeded(), 'user-1');
    expect(profile.id).toBe('user-1');
    expect(profile.personal.fullName).toBe('Ramesh Patel');
    expect(profile.location.district).toBe('Ludhiana');
    expect(profile.location.villageOrTehsil).toBe('Doraha');
    expect(profile.farmSpecs.totalArea).toBe(8);
    expect(profile.farmSpecs.landUnit).toBe('Acres');
    expect(profile.farmSpecs.irrigationType).toBe('Drip Irrigation');
    expect(profile.crops).toContain('Wheat (Gehun)');
    expect(profile.machineryOwned).toContain('Tractor');
    expect(profile.preferredLanguage).toBe('en');
  });

  it('defaults to a Guest Farmer when answers are empty', () => {
    const profile = buildFarmerProfile(defaultOnboardingData('en'), 'guest-1');
    expect(profile.personal.fullName).toBe('Guest Farmer');
    expect(profile.farmSpecs.totalArea).toBe(0);
    expect(profile.farmSpecs.irrigationType).toBe('Rainfed / Monsoon');
  });
});

describe('generateRecommendations', () => {
  const month = new Date().getMonth();
  const season = month >= 2 && month <= 4 ? 'summer' : month >= 5 && month <= 8 ? 'monsoon' : 'winter';

  it('uses the primary crop, district mandi and crop-stage tasks', () => {
    const recs = generateRecommendations(seeded(), enT);
    expect(recs.mandi.crop).toBe('Wheat (Gehun)');
    expect(recs.mandi.market).toBe('Ludhiana APMC');
    expect(recs.tasks.length).toBeGreaterThan(0);
    expect(recs.tasks.some((t) => /pest|scout/i.test(t))).toBe(true);
  });

  it('tracks the current season in the weather card', () => {
    const recs = generateRecommendations(seeded(), enT);
    const expectedEmoji = season === 'monsoon' ? '🌧️' : season === 'summer' ? '☀️' : '⛅';
    expect(recs.weather.emoji).toBe(expectedEmoji);
  });

  it('offers PM-KUSUM to drip-irrigated farms', () => {
    expect(generateRecommendations(seeded(), enT).schemes.some((s) => s.title === 'PM-KUSUM')).toBe(true);
    expect(
      generateRecommendations(seeded({ waterSources: ['Canal'] },), enT).schemes.some((s) => s.title === 'PM-KUSUM'),
    ).toBe(false);
  });

  it('offers PM Fasal Bima when weather or protection is an interest', () => {
    expect(generateRecommendations(seeded(), enT).schemes.some((s) => s.title === 'PM Fasal Bima')).toBe(true);
    expect(
      generateRecommendations(seeded({ interests: ['mandi'] },), enT).schemes.some((s) => s.title === 'PM Fasal Bima'),
    ).toBe(false);
  });

  it('offers PKVY only to organic-curious farmers', () => {
    expect(generateRecommendations(seeded(), enT).schemes.some((s) => s.title === 'PKVY')).toBe(true);
    expect(
      generateRecommendations(seeded({ interests: [] },), enT).schemes.some((s) => s.title === 'PKVY'),
    ).toBe(false);
  });

  it('adds the mechanisation subsidy only for large farms', () => {
    const large = seeded({ farmSize: '8', waterSources: [], interests: [] });
    const small = seeded({ farmSize: '1', waterSources: [], interests: [] });
    expect(generateRecommendations(large, enT).schemes.some((s) => /Mechanisation/.test(s.title))).toBe(true);
    expect(generateRecommendations(small, enT).schemes.some((s) => /Mechanisation/.test(s.title))).toBe(false);
  });

  it('shows generic tasks when no crop stage is chosen yet', () => {
    const recs = generateRecommendations(seeded({ cropStage: '' },), enT);
    expect(recs.tasks.some((t) => /Check today.{0,3}s mandi prices/.test(t))).toBe(true);
  });
});
