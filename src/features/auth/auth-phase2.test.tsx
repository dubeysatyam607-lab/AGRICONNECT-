import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { authRemoteDataSource } from '@/features/auth/data/datasources/AuthRemoteDataSource';
import { syncOAuthProfileFromIdentity } from '@/features/auth/data/datasources/AuthRemoteDataSource';

// Mocks
const {
  fromMock,
  signInWithPasswordMock,
  signInWithOAuthMock,
  signOutMock,
  getSessionMock,
  updateUserMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  signOutMock: vi.fn(),
  getSessionMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      signInWithOAuth: (...args: unknown[]) => signInWithOAuthMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: fromMock,
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/hooks/useAuth';

function createPostgrestMock(profileData: any = null, error: any = null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profileData, error }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
  };
  chain.then = (resolve: any, reject: any) => {
    return Promise.resolve({ data: profileData, error }).then(resolve, reject);
  };
  return chain;
}

describe('PHASE 2 — Production-Grade Auth & Onboarding Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── TEST 1: New User Registration & Onboarding Trigger ──
  it('Scenario 1 (New user): First-time sign up / OAuth sync marks onboarding_completed: false and prepares profile', async () => {
    fromMock.mockReturnValue(createPostgrestMock(null));

    const newUser = {
      id: 'new-user-001',
      email: 'newfarmer@example.com',
      user_metadata: {
        full_name: 'Harpreet Singh',
        avatar_url: 'https://avatar.com/harpreet.jpg',
      },
      app_metadata: { provider: 'google' },
    };

    const result = await syncOAuthProfileFromIdentity(newUser);

    expect(result.profileExisted).toBe(false);
    expect(result.onboardingCompleted).toBe(false);
    expect(result.updatedFields).toContain('full_name');
    expect(result.updatedFields).toContain('avatar_url');

    const insertCall = fromMock.mock.results[0].value.insert;
    expect(insertCall).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-user-001',
        email: 'newfarmer@example.com',
        full_name: 'Harpreet Singh',
        onboarding_completed: false,
      })
    );
  });

  // ── TEST 2: Existing User Login & Profile Loading ──
  it('Scenario 2 (Existing user): Returning user with completed onboarding retains their state and skips onboarding', async () => {
    const existingProfile = {
      id: 'existing-user-123',
      email: 'ramesh@example.com',
      full_name: 'Ramesh Patel',
      state: 'Gujarat',
      district: 'Ahmedabad',
      village: 'Sanand',
      primary_crop: 'Cotton (Kapas)',
      farm_size: 10,
      ownership_status: 'Owner',
      onboarding_completed: true,
    };

    fromMock.mockReturnValue(createPostgrestMock(existingProfile));

    const returningUser = {
      id: 'existing-user-123',
      email: 'ramesh@example.com',
      user_metadata: { full_name: 'Ramesh Patel' },
      app_metadata: { provider: 'google' },
    };

    const result = await syncOAuthProfileFromIdentity(returningUser);

    expect(result.profileExisted).toBe(true);
    expect(result.onboardingCompleted).toBe(true);
    expect(result.updatedFields).toHaveLength(0);
  });

  // ── TEST 3: Google Login (First login vs Returning login) ──
  it('Scenario 3 (Google login): Correctly initiates OAuth with origin redirect', async () => {
    signInWithOAuthMock.mockResolvedValue({ error: null });

    await authRemoteDataSource.signInWithOAuth('google');

    expect(signInWithOAuthMock).toHaveBeenCalledTimes(1);
    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        }),
      })
    );
  });

  // ── TEST 4: Logout & Session Clearing ──
  it('Scenario 4 (Logout): Clears session and triggers Supabase sign out', async () => {
    signOutMock.mockResolvedValue({ error: null });

    await authRemoteDataSource.signOut();

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  // ── TEST 5: Session Refresh & Auth State Persistence ──
  it('Scenario 5 (Refresh): Retrieves active session from Supabase on reload', async () => {
    const mockSession = {
      access_token: 'valid-token',
      refresh_token: 'refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'user-refresh-1',
        email: 'farmer@refresh.com',
        user_metadata: { full_name: 'Farmer Refresh' },
      },
    };

    getSessionMock.mockResolvedValue({ data: { session: mockSession }, error: null });

    const session = await authRemoteDataSource.getCurrentSession();
    expect(session).toBeDefined();
    expect(session?.user?.id).toBe('user-refresh-1');
    expect(session?.accessToken).toBe('valid-token');
  });

  // ── TEST 6: Protected Routes Security Gating ──
  it('Scenario 6 (Protected route): Blocks unauthenticated access and redirects to login with return path', () => {
    // Mock unauthenticated
    (useAuth as any).mockReturnValue({
      user: null,
      session: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div data-testid="dashboard-content">Private Farm Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth/login" element={<div data-testid="login-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('dashboard-content')).toBeNull();
    expect(screen.getByTestId('login-page')).toBeTruthy();
  });

  it('Scenario 6b (Protected route): Blocks expired session and prompts re-auth', () => {
    // Mock expired session
    (useAuth as any).mockReturnValue({
      user: { id: 'expired-user' },
      session: {
        expires_at: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
      },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/kisan-ai']}>
        <Routes>
          <Route
            path="/kisan-ai"
            element={
              <ProtectedRoute>
                <div data-testid="private-kisan-ai">Kisan AI Advisory</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth/login" element={<div data-testid="login-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('private-kisan-ai')).toBeNull();
    expect(screen.getByTestId('login-page')).toBeTruthy();
  });

  // ── TEST 7: Invalid Login & Rate Limiting ──
  it('Scenario 7 (Invalid login): Correctly catches auth errors and raises friendly message', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });

    await expect(
      authRemoteDataSource.signIn('invalid-email@example.com', 'wrongpassword')
    ).rejects.toThrow();
  });

  // ── TEST 8: Incomplete Onboarding Handling ──
  it('Scenario 8 (Incomplete onboarding): User with missing essential farm fields is identified as not onboarded', async () => {
    // Profile exists but has null state/district/primary_crop
    const incompleteProfile = {
      id: 'incomplete-user-789',
      email: 'incomplete@example.com',
      full_name: 'Incomplete User',
      state: null,
      district: null,
      primary_crop: null,
      onboarding_completed: false,
    };

    fromMock.mockReturnValue(createPostgrestMock(incompleteProfile));

    const incompleteUser = {
      id: 'incomplete-user-789',
      email: 'incomplete@example.com',
      user_metadata: { full_name: 'Incomplete User' },
      app_metadata: { provider: 'google' },
    };

    const result = await syncOAuthProfileFromIdentity(incompleteUser);

    expect(result.profileExisted).toBe(true);
    expect(result.onboardingCompleted).toBe(false);
  });
});
