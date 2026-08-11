import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import TodayTasks from './TodayTasks';
import { defaultOnboardingData, saveOnboardingData } from '@/features/auth/presentation/onboarding/onboardingData';

const renderTasks = () =>
  render(<LanguageProvider><TodayTasks triggerHaptic={vi.fn()} /></LanguageProvider>);

const seedFarmer = (patch = {}) => {
  const data = {
    ...defaultOnboardingData('en'),
    fullName: 'Ramesh',
    primaryCrops: ['Wheat (Gehun)'],
    cropStage: 'Sowing',
    ...patch,
  };
  saveOnboardingData(data);
  return data;
};

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('TodayTasks', () => {
  it('shows personalized tasks for an onboarded farmer', () => {
    seedFarmer();
    renderTasks();
    expect(screen.getByText(/Irrigate Wheat/)).toBeTruthy();
  });

  it('falls back to the generic list for guests', () => {
    renderTasks();
    expect(screen.getByText(/Irrigate soybean field/)).toBeTruthy();
  });

  it('keeps completion state across re-renders', () => {
    seedFarmer();
    renderTasks();
    const btn = screen.getByLabelText(/Irrigate Wheat/);
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');

    cleanup();
    renderTasks();
    expect(screen.getByLabelText(/Irrigate Wheat/).getAttribute('aria-pressed')).toBe('true');
  });
});
