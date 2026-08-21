import { describe, it, expect } from 'vitest';
import { getLocalAnswer } from './src/lib/local-advisor';
import { DEFAULT_FARM_PROFILE } from './src/contexts/FarmContext';

const profile = DEFAULT_FARM_PROFILE;

describe('getLocalAnswer — crop advisory', () => {
  it('returns matched crop advice for a known crop query', () => {
    const answer = getLocalAnswer('soybean advice', profile);
    expect(answer.matched).toBe(true);
    expect(answer.kind).toBe('crop');
    expect(answer.text).toContain('Soybean');
  });

  it('returns a mandi answer for price queries', () => {
    const answer = getLocalAnswer('soybean mandi price today', profile);
    expect(answer.kind).toBe('mandi');
    expect(answer.matched).toBe(true);
  });

  it('falls back to the profile crop when the query names no crop', () => {
    const answer = getLocalAnswer('what is the market price', profile);
    expect(answer.kind).toBe('mandi');
  });
});

describe('getLocalAnswer — languages', () => {
  it('returns Hindi text when lang is hi', () => {
    const answer = getLocalAnswer('soybean advice', profile, 'hi');
    expect(answer.text).toMatch(/[\u0900-\u097F]/);
  });

  it('auto-detects Devanagari queries without an explicit lang', () => {
    const answer = getLocalAnswer('सोयाबीन की सलाह', profile);
    expect(answer.text).toMatch(/[\u0900-\u097F]/);
  });

  it('returns English text by default', () => {
    const answer = getLocalAnswer('soybean advice', profile);
    expect(answer.text).not.toMatch(/[\u0900-\u097F]/);
  });
});

describe('getLocalAnswer — fallback', () => {
  it('returns an unmatched general answer for unrelated queries', () => {
    const answer = getLocalAnswer('what is the capital of france', profile);
    expect(answer.matched).toBe(false);
    expect(answer.kind).toBe('general');
    expect(answer.text.length).toBeGreaterThan(0);
  });

  it('matches scheme intent', () => {
    const answer = getLocalAnswer('pm kisan scheme details', profile);
    expect(answer.kind).toBe('scheme');
    expect(answer.matched).toBe(true);
  });

  it('answers greetings with a natural welcome and NO crop dumps', () => {
    const hiAnswer = getLocalAnswer('namaste', profile);
    expect(hiAnswer.matched).toBe(true);
    expect(hiAnswer.kind).toBe('general');
    expect(hiAnswer.text).toContain('Kisan AI');
    expect(hiAnswer.text).not.toContain('Soybean');

    const enAnswer = getLocalAnswer('hello', profile);
    expect(enAnswer.matched).toBe(true);
    expect(enAnswer.text).toContain('Kisan AI');
  });

  it('asks for clarification when vague spray query is provided without a crop', () => {
    const answer = getLocalAnswer('spray batao', profile);
    expect(answer.matched).toBe(true);
    expect(answer.text).toContain('Kaunsi fasal');
  });

  it('strictly isolates requested crop (e.g. tomato) without profile crop bleed', () => {
    const answer = getLocalAnswer('tamatar ka bhav', profile);
    expect(answer.kind).toBe('mandi');
    expect(answer.text).toContain('Tomato');
    expect(answer.text).not.toContain('Soybean');
  });
});
