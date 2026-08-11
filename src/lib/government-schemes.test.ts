import { describe, it, expect } from 'vitest';
import { VERIFIED_GOVERNMENT_SCHEMES, getVerifiedCategories } from './government-schemes-data';
import { evaluateFarmerEligibility, FarmerProfileInput } from './government-scheme-matcher';

describe('Government Schemes Module — Verified MoA&FW Dataset & AI Matcher', () => {
  it('contains verified official government schemes with required attributes', () => {
    expect(VERIFIED_GOVERNMENT_SCHEMES.length).toBeGreaterThan(5);

    VERIFIED_GOVERNMENT_SCHEMES.forEach((scheme) => {
      expect(scheme.id).toBeTruthy();
      expect(scheme.title).toBeTruthy();
      expect(scheme.titleHi).toBeTruthy();
      expect(scheme.applyUrl).toMatch(/^https:\/\//);
      expect(scheme.contactHelpline).toBeTruthy();
      expect(scheme.docsRequired.length).toBeGreaterThan(0);
      expect(scheme.applicationSteps.length).toBeGreaterThan(0);
      expect(scheme.commonRejectionReasons.length).toBeGreaterThan(0);
    });
  });

  it('evaluates small farmer eligibility for PM-KISAN with 100% score', () => {
    const profile: FarmerProfileInput = {
      age: 40,
      landAcres: 3,
      category: 'general',
      annualIncome: 120000,
      hasBank: true,
      hasLandDocs: true,
      isFarmer: true,
      gender: 'male',
      hasIrrigation: true
    };

    const report = evaluateFarmerEligibility(profile);
    expect(report.totalAnalyzed).toBe(VERIFIED_GOVERNMENT_SCHEMES.length);
    expect(report.eligibleCount).toBeGreaterThan(0);

    const pmKisanMatch = report.matches.find((m) => m.schemeId === 'pm-kisan');
    expect(pmKisanMatch).toBeDefined();
    expect(pmKisanMatch?.status).toBe('ELIGIBLE');
    expect(pmKisanMatch?.score).toBeGreaterThanOrEqual(90);
    expect(pmKisanMatch?.explanation).toContain('PM-KISAN');
  });

  it('flags missing land documents as POSSIBLY_ELIGIBLE or NOT_ELIGIBLE', () => {
    const profileWithoutDocs: FarmerProfileInput = {
      age: 28,
      landAcres: 0,
      category: 'obc',
      annualIncome: 300000,
      hasBank: true,
      hasLandDocs: false,
      isFarmer: false,
      gender: 'female',
      hasIrrigation: false
    };

    const report = evaluateFarmerEligibility(profileWithoutDocs);
    const pmKisanMatch = report.matches.find((m) => m.schemeId === 'pm-kisan');
    expect(pmKisanMatch?.status).not.toBe('ELIGIBLE');
    expect(pmKisanMatch?.missingRules.length).toBeGreaterThan(0);
  });

  it('returns valid categories list', () => {
    const categories = getVerifiedCategories();
    expect(categories).toContain('All');
    expect(categories).toContain('Income Support');
    expect(categories).toContain('Insurance');
    expect(categories).toContain('Subsidy');
  });
});
