import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

const navigate = vi.fn();
const exchangeCodeForSession = vi.fn();
const getSession = vi.fn();
const syncProfile = vi.fn().mockResolvedValue({ profileExisted: false, onboardingCompleted: false, updatedFields: [] });

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => exchangeCodeForSession(...args),
      getSession: (...args: unknown[]) => getSession(...args),
    },
  },
}));

vi.mock('@/features/auth/data/datasources/AuthRemoteDataSource', () => ({
  syncOAuthProfileFromIdentity: (...args: unknown[]) => syncProfile(...args),
}));

import { AuthCallback } from './AuthCallback';

const googleUser = {
  id: 'u-1',
  email: 'ramesh@gmail.com',
  user_metadata: { full_name: 'Ramesh Kumar', avatar_url: 'https://pic' },
  app_metadata: { provider: 'google' },
};

describe('AuthCallback (Google OAuth redirect landing page)', () => {
  beforeEach(() => {
    localStorage.clear();
    navigate.mockReset();
    exchangeCodeForSession.mockReset();
    getSession.mockReset();
    syncProfile.mockReset().mockResolvedValue({ profileExisted: false, onboardingCompleted: false, updatedFields: [] });
    window.history.replaceState(null, '', '/auth/callback');
  });

  afterEach(() => {
    cleanup();
  });

  it('exchanges authorization code and routes new Google user to /complete-profile', async () => {
    window.history.replaceState(null, '', '/auth/callback?code=valid-code&state=xyz');
    exchangeCodeForSession.mockResolvedValue({
      data: { user: googleUser, session: { user: googleUser } },
      error: null,
    });
    syncProfile.mockResolvedValue({ profileExisted: false, onboardingCompleted: false, updatedFields: [] });

    render(<AuthCallback />);

    await waitFor(() => expect(exchangeCodeForSession).toHaveBeenCalledWith('valid-code'));
    expect(syncProfile).toHaveBeenCalledWith(googleUser);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/complete-profile', { replace: true }));
    expect(screen.queryByText(/Sign-in could not be completed/i)).toBeNull();
  });

  it('routes returning Google user with completed profile directly to /dashboard', async () => {
    window.history.replaceState(null, '', '/auth/callback?code=valid-code&state=xyz');
    exchangeCodeForSession.mockResolvedValue({
      data: { user: googleUser, session: { user: googleUser } },
      error: null,
    });
    syncProfile.mockResolvedValue({ profileExisted: true, onboardingCompleted: true, updatedFields: [] });

    render(<AuthCallback />);

    await waitFor(() => expect(exchangeCodeForSession).toHaveBeenCalledWith('valid-code'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
  });

  it('restores an already-active session when the callback is reopened (refresh / back button)', async () => {
    getSession.mockResolvedValue({ data: { session: { user: googleUser } }, error: null });
    syncProfile.mockResolvedValue({ profileExisted: true, onboardingCompleted: true, updatedFields: [] });

    render(<AuthCallback />);

    await waitFor(() => expect(syncProfile).toHaveBeenCalledWith(googleUser));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('shows a friendly error and a recovery action when OAuth reports an error (e.g. user cancelled)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState(null, '', '/auth/callback?error=access_denied&error_description=User%20denied%20access');

    render(<AuthCallback />);

    await waitFor(() => expect(screen.getByText(/Sign-in could not be completed/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /Back to Sign In/i })).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('never leaks raw internals — a failed exchange shows only the safe message', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState(null, '', '/auth/callback?code=stale-code');
    exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'code has expired (internal: PKCE_verifier_not_found, token=jwt.ey...)', status: 400 },
    });
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<AuthCallback />);

    await waitFor(() => expect(screen.getByText(/Sign-in could not be completed/i)).toBeTruthy());
    expect(screen.queryByText(/jwt\.ey/i)).toBeNull();
    expect(screen.queryByText(/PKCE_verifier/i)).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('shows the safe message (no crash) when the callback is opened directly with no code/session', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(<AuthCallback />);

    await waitFor(() => expect(screen.getByText(/Sign-in could not be completed/i)).toBeTruthy());
    errSpy.mockRestore();
  });
});
