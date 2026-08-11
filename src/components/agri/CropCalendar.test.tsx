// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { defaultOnboardingData, saveOnboardingData } from '@/features/auth/presentation/onboarding/onboardingData';
import CropCalendar from './CropCalendar';

const renderCalendar = () =>
  render(
    <LanguageProvider>
      <CropCalendar onToast={() => {}} />
    </LanguageProvider>,
  );

const openTimeline = () => {
  const trigger = screen.getByRole('tab', { name: /Timeline/ });
  fireEvent.mouseDown(trigger);
  fireEvent.click(trigger);
};

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('CropCalendar personalization', () => {
  it('defaults the timeline to wheat for guests', { timeout: 15000 }, () => {
    renderCalendar();
    openTimeline();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('wheat');
  });

  it('preselects the farmer primary crop in the timeline', () => {
    saveOnboardingData({ ...defaultOnboardingData('en'), primaryCrops: ['Maize (Makka)'], cropStage: 'Sowing' });
    renderCalendar();
    openTimeline();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('maize');
  });

  it('tags the farmer crops in the season guide', () => {
    saveOnboardingData({ ...defaultOnboardingData('en'), primaryCrops: ['Wheat (Gehun)'], cropStage: 'Sowing' });
    renderCalendar();
    expect(screen.getAllByText(/Your crop/).length).toBeGreaterThan(0);
  });
});
