import { describe, it, expect, beforeEach } from 'vitest';
import { defaultOnboardingData } from '@/features/auth/presentation/onboarding/onboardingData';
import { journey } from '@/i18n/journey';
import {
  buildFarmerTasks,
  getFarmerSeasonCropNames,
  getFarmerTimelineCropIds,
} from './cropTimelineData';

const enT = (key: string): string => journey.en[key] ?? key;

const wheatData = () => ({
  ...defaultOnboardingData('en'),
  fullName: 'Ramesh',
  primaryCrops: ['Wheat (Gehun)', 'Paddy / Rice (Dhan)'],
  secondaryCrops: ['Paddy / Rice (Dhan)'],
  cropStage: 'Sowing',
});

describe('cropTimelineData', () => {
  beforeEach(() => localStorage.clear());

  it('maps onboarding crop labels to timeline ids, deduped', () => {
    expect(getFarmerTimelineCropIds(wheatData())).toEqual(['wheat', 'rice']);
  });

  it('returns no ids when no onboarding crop maps to a timeline schedule', () => {
    const data = { ...defaultOnboardingData('en'), primaryCrops: ['Tomato (Tamatar)'] };
    expect(getFarmerTimelineCropIds(data)).toEqual([]);
  });

  it('exposes season-guide names for the farmer crops', () => {
    expect(getFarmerSeasonCropNames(wheatData())).toEqual(['Wheat', 'Rice']);
  });

  it('builds crop- and stage-aware tasks capped at five with unique ids', () => {
    const tasks = buildFarmerTasks(wheatData(), enT);
    expect(tasks.length).toBeGreaterThanOrEqual(1);
    expect(tasks.length).toBeLessThanOrEqual(5);
    expect(tasks[0].label).toMatch(/Irrigate Wheat — Day \d+/);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
  });

  it('returns no tasks for farmers with no mapped crop', () => {
    const data = { ...defaultOnboardingData('en'), primaryCrops: ['Tomato (Tamatar)'] };
    expect(buildFarmerTasks(data, enT)).toEqual([]);
  });
});
