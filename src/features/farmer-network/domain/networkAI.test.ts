import { describe, it, expect } from 'vitest';
import { seedState } from './networkStore';
import {
  recommendTrustedProviders,
  cheapestRental,
  fastestService,
  bestBuyers,
  nearbyFarmers,
  mostActiveCommunity,
  aiSuggestedDiscussions,
} from './networkAI';
import type { NetworkState } from './networkTypes';

const makeState = (overrides: Partial<NetworkState> = {}): NetworkState => ({
  ...seedState(),
  ...overrides,
});

describe('networkAI', () => {
  it('recommendTrustedProviders ranks verified & high-trust providers first', () => {
    const state = makeState();
    const recs = recommendTrustedProviders(undefined, 10, state);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].score).toBeGreaterThanOrEqual(recs[recs.length - 1].score);
    for (const { provider, score, reasons } of recs) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(provider.distanceKm).toBeLessThanOrEqual(10);
      expect(reasons.length).toBeGreaterThan(0);
    }
  });

  it('recommendTrustedProviders filters by category', () => {
    const state = makeState();
    const recs = recommendTrustedProviders('tractor', 10, state);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every(({ provider }) => provider.category === 'tractor')).toBe(true);
  });

  it('cheapestRental returns the lowest-priced provider first', () => {
    const state = makeState();
    const rentals = cheapestRental('tractor', state);
    const amounts = rentals.map((r) => Number(r.provider.pricing.replace(/[^\d]/g, '')));
    expect(amounts.length).toBeGreaterThan(0);
    expect([...amounts].sort((a, b) => a - b)).toEqual(amounts);
  });

  it('fastestService prefers available-today providers and sorts by score', () => {
    const state = makeState();
    const recs = fastestService(undefined, state);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r.provider.availability).not.toBe('busy');
      expect(r.score).toBeGreaterThanOrEqual(0);
    }
    for (let i = 1; i < recs.length; i += 1) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
    }
  });

  it('bestBuyers prefers verified buyers open to enquiry', () => {
    const state = makeState();
    const recs = bestBuyers(undefined, state);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(3);
    for (const { buyer, reasons } of recs) {
      expect(buyer.verified).toBe(true);
      expect(reasons.length).toBeGreaterThan(0);
    }
  });

  it('bestBuyers matches the farmer crop against buyer lookingFor', () => {
    const state = makeState({ myCrop: 'Soybean' });
    const recs = bestBuyers(state.myCrop, state);
    expect(recs[0].buyer.lookingFor.toLowerCase()).toContain('soybean');
  });

  it('nearbyFarmers prefers matching-crop farmers close by', () => {
    const state = makeState({ myCrop: 'Rice' });
    const recs = nearbyFarmers(state);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].farmer.produce.join(' ').toLowerCase()).toContain('rice');
  });

  it('mostActiveCommunity returns every post, ordered by recency-weighted engagement', () => {
    const state = makeState();
    const posts = mostActiveCommunity(state);
    expect(posts.length).toBe(state.community.length);
    expect(new Set(posts.map((p) => p.id)).size).toBe(posts.length);
    const now = Date.now();
    const score = (p: { likes: number; comments: number; createdAt: string }) =>
      (p.likes + p.comments * 3) / Math.sqrt(Math.max(1, (now - new Date(p.createdAt).getTime()) / 3600000));
    const scores = posts.map(score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('aiSuggestedDiscussions are crop & village aware', () => {
    const state = makeState({ myCrop: 'Turmeric', myVillage: 'Nagpur' });
    const suggestions = aiSuggestedDiscussions(state);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.toLowerCase().includes('turmeric'))).toBe(true);
    expect(suggestions.some((s) => s.toLowerCase().includes('nagpur'))).toBe(true);
  });

  it('never recommends a provider beyond the max distance', () => {
    const state = makeState();
    const recs = recommendTrustedProviders(undefined, 4, state);
    expect(recs.every(({ provider }) => provider.distanceKm <= 4)).toBe(true);
  });
});
