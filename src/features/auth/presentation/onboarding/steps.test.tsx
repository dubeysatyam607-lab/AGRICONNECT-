import React, { useState } from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { defaultOnboardingData, type IOnboardingData } from './onboardingData';
import { WelcomeStep } from './steps/WelcomeStep';
import { LanguageStep } from './steps/LanguageStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { FarmDetailsStep } from './steps/FarmDetailsStep';
import { ResourcesStep } from './steps/ResourcesStep';
import { InterestsStep } from './steps/InterestsStep';
import { PermissionsStep } from './steps/PermissionsStep';
import { AiSetupStep } from './steps/AiSetupStep';

/** Wraps a step in the language provider, matching the real app. */
const renderStep = (ui: React.ReactElement) =>
  render(<LanguageProvider>{ui}</LanguageProvider>);

/** Stateful harness that re-renders on `set`, exactly like the real flow. */
const Harness: React.FC<{
  children: (data: IOnboardingData, set: (patch: Partial<IOnboardingData>) => void) => React.ReactNode;
}> = ({ children }) => {
  const [data, setData] = useState<IOnboardingData>(defaultOnboardingData('en'));
  const set = (patch: Partial<IOnboardingData>) => setData((d) => ({ ...d, ...patch }));
  return <>{children(data, set)}</>;
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Onboarding steps', () => {
  it('WelcomeStep renders the brand message and advances', () => {
    const onNext = vi.fn();
    renderStep(<WelcomeStep onNext={onNext} />);
    expect(screen.getByText(/digital farm/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Let's begin/i));
    expect(onNext).toHaveBeenCalled();
  });

  it('LanguageStep selects a language through the shared context', () => {
    const onNext = vi.fn();
    renderStep(
      <LanguageProvider>
        <LanguageStep selected="en" onSelect={() => {}} onNext={onNext} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByText('हिंदी'));
    fireEvent.click(screen.getByText(/Continue|जारी रखें/i));
    expect(onNext).toHaveBeenCalled();
  });

  it('BasicInfoStep enables Continue only once all fields are filled', () => {
    const onNext = vi.fn();
    renderStep(
      <Harness>
        {(data, set) => <BasicInfoStep data={data} set={set} onNext={onNext} />}
      </Harness>,
    );
    const continueBtn = screen.getByText('Continue') as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Ramesh/i), { target: { value: 'Ramesh Patel' } });
    fireEvent.click(screen.getByText('Punjab'));
    fireEvent.change(screen.getByPlaceholderText(/Nagpur/i), { target: { value: 'Ludhiana' } });
    fireEvent.change(screen.getByPlaceholderText(/Sawangi/i), { target: { value: 'Doraha' } });
    expect((screen.getByText('Continue') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText('Continue'));
    expect(onNext).toHaveBeenCalled();
  });

  it('FarmDetailsStep collects size, crops and stage chips', () => {
    const onNext = vi.fn();
    renderStep(
      <Harness>
        {(data, set) => <FarmDetailsStep data={data} set={set} onNext={onNext} />}
      </Harness>,
    );
    fireEvent.click(screen.getByText(/Small/));
    fireEvent.click(screen.getByText('Wheat (Gehun)'));
    fireEvent.click(screen.getByText('Owned'));
    fireEvent.click(screen.getByText('Sowing'));
    fireEvent.click(screen.getByText('Continue'));
    expect(onNext).toHaveBeenCalled();
  });

  it('ResourcesStep collects water, machinery and livestock', () => {
    const onNext = vi.fn();
    renderStep(
      <Harness>
        {(data, set) => <ResourcesStep data={data} set={set} onNext={onNext} />}
      </Harness>,
    );
    fireEvent.click(screen.getByText('Canal'));
    fireEvent.click(screen.getByText(/Tractor/));
    fireEvent.click(screen.getAllByText('+')[0]);
    fireEvent.click(screen.getByText('Continue'));
    expect(onNext).toHaveBeenCalled();
  });

  it('InterestsStep requires at least one interest', () => {
    const onNext = vi.fn();
    renderStep(
      <Harness>
        {(data, set) => <InterestsStep data={data} set={set} onNext={onNext} />}
      </Harness>,
    );
    const continueBtn = screen.getByText('Continue') as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);
    fireEvent.click(continueBtn);
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(/Weather/i));
    expect((screen.getByText('Continue') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText('Continue'));
    expect(onNext).toHaveBeenCalled();
  });

  it('PermissionsStep lets the farmer continue without permissions', () => {
    const onNext = vi.fn();
    renderStep(
      <Harness>
        {(data, set) => <PermissionsStep data={data} set={set} onNext={onNext} />}
      </Harness>,
    );
    fireEvent.click(screen.getByText(/Continue without permissions/i));
    expect(onNext).toHaveBeenCalled();
  });

  it('AiSetupStep trains the assistant then reveals a personalized dashboard', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const data: IOnboardingData = {
      ...defaultOnboardingData('en'),
      fullName: 'Ramesh',
      state: 'Punjab',
      district: 'Ludhiana',
      farmSize: '3',
      ownership: 'Owned',
      primaryCrops: ['Wheat (Gehun)'],
      cropStage: 'Sowing',
      interests: ['weather'],
    };
    renderStep(<AiSetupStep data={data} onComplete={onComplete} />);
    expect(screen.getByText(/Preparing your AI Farming Assistant/)).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText(/Ramesh, your farm is ready/)).toBeTruthy();
    expect(screen.getByText(/Ludhiana APMC/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Open my personalized dashboard/i));
    expect(onComplete).toHaveBeenCalled();
  });
});
