import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CompleteProfile } from '@/pages/CompleteProfile';
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner';
import {
  getSavedCookiePreferences,
  saveCookiePreferences,
  DEFAULT_COOKIE_PREFERENCES,
} from '@/components/legal/CookieSettingsModal';

const navigate = vi.fn();
const mockUser = {
  id: 'user-google-123',
  email: 'satyam.dubey@gmail.com',
  user_metadata: {
    name: 'Satyam Dubey',
    email: 'satyam.dubey@gmail.com',
    avatar_url: 'https://lh3.googleusercontent.com/a/sample',
  },
};

const mockUpdate = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        id: 'user-google-123',
        full_name: 'Satyam Dubey',
        email: 'satyam.dubey@gmail.com',
        onboarding_completed: false,
      },
      error: null,
    }),
  }),
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    session: { access_token: 'valid-jwt' },
    loading: false,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
  LANGUAGE_NAMES: {
    en: 'English (India)',
    hi: 'Hindi (हिंदी)',
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: (...args: unknown[]) => mockSelect(...args),
          update: (...args: unknown[]) => ({
            eq: (...eqArgs: unknown[]) => mockUpdate(...args, ...eqArgs),
          }),
          upsert: (...args: unknown[]) => mockUpdate(...args),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
    },
    auth: {
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

describe('CompleteProfile — Google First-Time Onboarding Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    navigate.mockReset();
    mockUpdate.mockReset().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('pre-fills Google full name and displays read-only Google email', async () => {
    render(
      <MemoryRouter>
        <CompleteProfile />
      </MemoryRouter>
    );

    const nameInput = screen.getByPlaceholderText(/Satyam Dubey/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Satyam Dubey');

    const emailInput = screen.getByDisplayValue('satyam.dubey@gmail.com') as HTMLInputElement;
    expect(emailInput).toBeTruthy();
    expect(emailInput.readOnly).toBe(true);
  });

  it('validates 10-digit mobile number before advancing to step 2', async () => {
    render(
      <MemoryRouter>
        <CompleteProfile />
      </MemoryRouter>
    );

    const continueBtn = screen.getByRole('button', { name: /Continue to Farm Details/i });
    fireEvent.click(continueBtn);

    // Shows mobile validation error
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid 10-digit mobile number/i)).toBeTruthy();
    });

    // Enter valid 10-digit phone
    const phoneInput = screen.getByPlaceholderText(/9876543210/i);
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });

    fireEvent.click(continueBtn);

    // Advanced to Step 2
    await waitFor(() => {
      expect(screen.getByText(/Farm Size \(in Acres\)/i)).toBeTruthy();
    });
  });

  it('requires mandatory Terms and Privacy Policy checkbox before completing onboarding', async () => {
    render(
      <MemoryRouter>
        <CompleteProfile />
      </MemoryRouter>
    );

    // Step 1
    const phoneInput = screen.getByPlaceholderText(/9876543210/i);
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Farm Details/i }));

    // Step 2
    await waitFor(() => expect(screen.getByText(/Farm Size \(in Acres\)/i)).toBeTruthy());
    
    // Fill Farm details
    const stateSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(stateSelect, { target: { value: 'Maharashtra' } });

    const districtSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(districtSelect, { target: { value: 'Pune' } });

    const villageInput = screen.getByPlaceholderText(/e\.g\. Rampur/i);
    fireEvent.change(villageInput, { target: { value: 'Baramati' } });

    const acresInput = screen.getByPlaceholderText(/e\.g\. 4\.5/i);
    fireEvent.change(acresInput, { target: { value: '5.0' } });

    // Select crop
    const cropSelect = screen.getAllByRole('combobox')[2];
    fireEvent.change(cropSelect, { target: { value: 'Sugarcane (Ganna)' } });

    fireEvent.click(screen.getByRole('button', { name: /Continue to Consent/i }));

    // Step 3 (Consent)
    await waitFor(() => {
      expect(screen.getByText(/Complete & Go to Dashboard/i)).toBeTruthy();
    });

    const finishBtn = screen.getByRole('button', { name: /Complete & Go to Dashboard/i });
    expect(finishBtn.hasAttribute('disabled')).toBe(true);

    // Check Terms checkbox
    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);

    expect(finishBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(finishBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});

describe('Cookie Consent Banner & Privacy Preference Controls', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders cookie consent banner on first visit and accepts all', async () => {
    render(
      <MemoryRouter>
        <CookieConsentBanner />
      </MemoryRouter>
    );

    // Wait for the banner delay
    await waitFor(() => {
      expect(screen.getByText(/We respect your privacy & agricultural data/i)).toBeTruthy();
    }, { timeout: 1500 });

    const acceptAllBtn = screen.getByRole('button', { name: /Accept All/i });
    fireEvent.click(acceptAllBtn);

    const saved = getSavedCookiePreferences();
    expect(saved?.essential).toBe(true);
    expect(saved?.analytics).toBe(true);
    expect(saved?.marketing).toBe(true);
  });

  it('allows user to reject non-essential cookies', async () => {
    render(
      <MemoryRouter>
        <CookieConsentBanner />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Essential Only/i)).toBeTruthy();
    }, { timeout: 1500 });

    const essentialOnlyBtn = screen.getByRole('button', { name: /Essential Only/i });
    fireEvent.click(essentialOnlyBtn);

    const saved = getSavedCookiePreferences();
    expect(saved?.essential).toBe(true);
    expect(saved?.analytics).toBe(false);
    expect(saved?.marketing).toBe(false);
  });
});
