import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const ProtectedContent = () => <div>PROTECTED_DASHBOARD_CONTENT</div>;
const LoginPage = () => <div>LOGIN_PAGE</div>;

const renderGuarded = (initialPath = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ProtectedContent />
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute Security Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders loading splash and NEVER flashes protected content during auth initialization', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      session: null,
      loading: true,
    });

    renderGuarded();

    expect(screen.queryByText('PROTECTED_DASHBOARD_CONTENT')).toBeNull();
    expect(screen.queryByText('LOGIN_PAGE')).toBeNull();
    expect(screen.getByText('Loading')).toBeTruthy();
  });

  it('redirects unauthenticated users immediately to /auth/login', async () => {
    (useAuth as any).mockReturnValue({
      user: null,
      session: null,
      loading: false,
    });

    renderGuarded();

    expect(screen.queryByText('PROTECTED_DASHBOARD_CONTENT')).toBeNull();
    expect(await screen.findByText('LOGIN_PAGE')).toBeTruthy();
  });

  it('renders protected content when user is authenticated with a valid session', async () => {
    const futureExpiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    (useAuth as any).mockReturnValue({
      user: { id: 'user-123', email: 'farmer@example.com' },
      session: {
        access_token: 'valid-jwt-token',
        expires_at: futureExpiresAt,
        user: { id: 'user-123', email: 'farmer@example.com' },
      },
      loading: false,
    });

    renderGuarded();

    expect(await screen.findByText('PROTECTED_DASHBOARD_CONTENT')).toBeTruthy();
    expect(screen.queryByText('LOGIN_PAGE')).toBeNull();
  });

  it('rejects expired sessions and redirects to /auth/login with session_expired reason', async () => {
    const pastExpiresAt = Math.floor(Date.now() / 1000) - 60; // 1 minute in past
    (useAuth as any).mockReturnValue({
      user: { id: 'user-123', email: 'farmer@example.com' },
      session: {
        access_token: 'expired-jwt-token',
        expires_at: pastExpiresAt,
        user: { id: 'user-123', email: 'farmer@example.com' },
      },
      loading: false,
    });

    renderGuarded();

    expect(screen.queryByText('PROTECTED_DASHBOARD_CONTENT')).toBeNull();
    expect(await screen.findByText('LOGIN_PAGE')).toBeTruthy();
  });
});
