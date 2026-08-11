import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { defaultOnboardingData, saveOnboardingData } from '@/features/auth/presentation/onboarding/onboardingData';
import { FirstDayBoard } from './FirstDayBoard';

const seedCompleted = () => {
  const data = {
    ...defaultOnboardingData('en'),
    fullName: 'Ramesh Patel',
    state: 'Punjab',
    district: 'Ludhiana',
    village: 'Doraha',
    farmSize: '3',
    ownership: 'Owned',
    primaryCrops: ['Wheat (Gehun)'],
    cropStage: 'Sowing',
    interests: ['weather'],
  };
  saveOnboardingData(data);
  localStorage.setItem('agri_onboarding_seen', 'true');
  localStorage.setItem('agri_profile_complete', 'true');
  return data;
};

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('FirstDayBoard', () => {
  it('is hidden until onboarding is complete', () => {
    render(
      <LanguageProvider>
        <FirstDayBoard onGo={() => {}} />
      </LanguageProvider>,
    );
    expect(screen.queryByText(/your farm is ready/i)).toBeNull();
  });

  it('renders the personalized recommendations for a completed farmer', () => {
    seedCompleted();
    render(
      <LanguageProvider>
        <FirstDayBoard onGo={() => {}} />
      </LanguageProvider>,
    );
    expect(screen.getByText(/Namaste Ramesh, your farm is ready/i)).toBeTruthy();
    expect(screen.getByText('Wheat (Gehun)')).toBeTruthy();
    expect(screen.getByText(/Ludhiana APMC/i)).toBeTruthy();
  });

  it('greets the farmer in their chosen language', () => {
    seedCompleted();
    localStorage.setItem('app-language', 'hi');
    render(
      <LanguageProvider>
        <FirstDayBoard onGo={() => {}} />
      </LanguageProvider>,
    );
    expect(screen.getByText(/नमस्ते Ramesh, आपका फार्म तैयार है/)).toBeTruthy();
  });

  it('dismisses permanently', () => {
    seedCompleted();
    render(
      <LanguageProvider>
        <FirstDayBoard onGo={() => {}} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByLabelText(/Dismiss/i));
    expect(screen.queryByText(/your farm is ready/i)).toBeNull();
    expect(localStorage.getItem('agri_firstday_dismissed')).toBe('true');
  });
});
