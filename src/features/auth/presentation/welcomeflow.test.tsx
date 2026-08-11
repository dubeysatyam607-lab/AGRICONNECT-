import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeDIContainer } from '@/core/di/init';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { defaultOnboardingData } from './onboarding/onboardingData';
import { WelcomeFlow } from './WelcomeFlow';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
}));

initializeDIContainer();

describe('WelcomeFlow end-to-end journey', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('walks a new farmer through all 8 onboarding steps into login', async () => {
    render(
      <LanguageProvider>
        <MemoryRouter>
          <WelcomeFlow />
        </MemoryRouter>
      </LanguageProvider>,
    );

    // Splash auto-advances to onboarding
    const begin = await screen.findByText(/Let's begin/i, {}, { timeout: 6000 });
    expect(screen.getByText(/digital farm/i)).toBeTruthy();

    // Step 1 — Welcome
    fireEvent.click(begin);

    // Step 2 — Language (stay in English so later labels match)
    fireEvent.click(screen.getByText(/Continue/i));

    // Step 3 — Basic Info
    fireEvent.change(screen.getByPlaceholderText(/Ramesh/i), { target: { value: 'Ramesh Patel' } });
    fireEvent.click(screen.getByText('Punjab'));
    fireEvent.change(screen.getByPlaceholderText(/Nagpur/i), { target: { value: 'Ludhiana' } });
    fireEvent.change(screen.getByPlaceholderText(/Sawangi/i), { target: { value: 'Doraha' } });
    fireEvent.click(screen.getByText('Continue'));

    // Step 4 — Farm Details
    fireEvent.click(screen.getByText(/Small/));
    fireEvent.click(screen.getByText('Wheat (Gehun)'));
    fireEvent.click(screen.getByText('Owned'));
    fireEvent.click(screen.getByText('Sowing'));
    fireEvent.click(screen.getByText('Continue'));

    // Step 5 — Resources
    fireEvent.click(screen.getByText('Canal'));
    fireEvent.click(screen.getByText('Continue'));

    // Step 6 — Interests
    fireEvent.click(screen.getByText(/Weather/i));
    fireEvent.click(screen.getByText('Continue'));

    // Step 7 — Permissions
    fireEvent.click(screen.getByText(/Continue without permissions/i));

    // Step 8 — AI Setup: train, then reveal the dashboard
    expect(screen.getByText(/Preparing your AI Farming Assistant/)).toBeTruthy();
    fireEvent.click(await screen.findByText(/Ramesh, your farm is ready/, {}, { timeout: 6000 }));
    expect(screen.getByText(/Ludhiana APMC/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Open my personalized dashboard/i));

    // Data persisted + journey ends at Login for anonymous farmers
    expect(localStorage.getItem('agri_farm_onboarding_v1')).toContain('Ramesh Patel');
    expect(localStorage.getItem('agri_onboarding_seen')).toBe('true');
    expect(await screen.findByText('Welcome to AgriConnect', {}, { timeout: 6000 })).toBeTruthy();
  }, 20000);

  it('sends returning farmers who already onboarded straight to login', async () => {
    localStorage.setItem('agri_onboarding_seen', 'true');
    localStorage.setItem(
      'agri_farm_onboarding_v1',
      JSON.stringify({ fullName: 'Existing Farmer', language: 'en' }),
    );
    render(
      <LanguageProvider>
        <MemoryRouter>
          <WelcomeFlow />
        </MemoryRouter>
      </LanguageProvider>,
    );
    expect(await screen.findByText('Welcome to AgriConnect', {}, { timeout: 6000 })).toBeTruthy();
    expect(screen.queryByText(/digital farm/i)).toBeNull();
  }, 20000);

  it('resumes a mid-way farmer at their last step and auto-saves progress', async () => {
    localStorage.setItem(
      'agri_farm_onboarding_v1',
      JSON.stringify({
        ...defaultOnboardingData('en'),
        fullName: 'Ramesh Patel',
        state: 'Punjab',
        district: 'Ludhiana',
        village: 'Doraha',
        farmSize: '3',
        ownership: 'Owned',
        primaryCrops: ['Wheat (Gehun)'],
        cropStage: 'Sowing',
        lastStep: 3,
      }),
    );
    render(
      <LanguageProvider>
        <MemoryRouter>
          <WelcomeFlow />
        </MemoryRouter>
      </LanguageProvider>,
    );

    // Skips Welcome/Language/BasicInfo and lands directly on Step 4 (Farm Details)
    expect(await screen.findByText(/Let's map your farm/i, {}, { timeout: 6000 })).toBeTruthy();
    expect(screen.queryByText(/digital farm/i)).toBeNull();

    // Auto-save keeps lastStep in sync
    fireEvent.click(screen.getByText('Continue'));
    expect(JSON.parse(localStorage.getItem('agri_farm_onboarding_v1')!)).toMatchObject({ lastStep: 4 });
  }, 20000);
});
