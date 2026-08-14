import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeDIContainer } from '@/core/di/init';
import { AuthProvider } from '@/hooks/useAuth';
import { RequireAdmin } from '@/core/auth/RequireAdmin';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: 'farmer' }, error: null }),
    }),
  },
}));

initializeDIContainer();

const AdminContent = () => <div>ADMIN_CONTENT</div>;
const LoginPage = () => <div>LOGIN_PAGE</div>;
const HomePage = () => <div>HOME_PAGE</div>;

const renderAdmin = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthProvider>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RequireAdmin>
                  <AdminContent />
                </RequireAdmin>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe('admin route guard (Phase 14)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('unauthenticated users are redirected to /login (never admin content)', async () => {
    renderAdmin();
    // ProtectedRoute redirects to /login when there is no session.
    expect(await screen.findByText('LOGIN_PAGE')).toBeTruthy();
    expect(screen.queryByText('ADMIN_CONTENT')).toBeNull();
  });

  it('a non-admin user is never rendered admin content even when the guard is bypassed by navigation', async () => {
    // Simulate an authenticated farmer by seeding the mocked session.
    const supabase = (await import('@/integrations/supabase/client')).supabase;
    supabase.auth.getSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'farmer-token',
          user: { id: 'farmer-1', email: 'farmer@example.com' },
        },
      },
      error: null,
    });

    renderAdmin();
    // profiles.role resolves to 'farmer' → RequireAdmin must redirect away.
    await waitFor(() => expect(screen.queryByText('ADMIN_CONTENT')).toBeNull());
    expect(await screen.findByText('HOME_PAGE')).toBeTruthy();
  });
});