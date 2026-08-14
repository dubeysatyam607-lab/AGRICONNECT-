import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeDIContainer } from '@/core/di/init';
import { resetAuthRateLimits } from '@/features/auth/data/datasources/AuthRemoteDataSource';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ForgotPasswordView } from './views/ForgotPasswordView';

const signInWithOtpMock = vi.fn();
const verifyOtpMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOtp: (...args: any[]) => signInWithOtpMock(...args),
      verifyOtp: (...args: any[]) => verifyOtpMock(...args),
      updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

initializeDIContainer();

const fakeSession = {
  access_token: 'at',
  refresh_token: 'rt',
};
const fakeUser = {
  id: '11111111-2222-3333-4444-555555555555',
  email: 'farmer@example.com',
  created_at: new Date().toISOString(),
  user_metadata: { full_name: 'Test Farmer', phone: '9876543210', role: 'farmer' },
};

describe('ForgotPasswordView — Email OTP sign-in flow', () => {
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onSuccess.mockReset();
    resetAuthRateLimits();
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null });
    verifyOtpMock.mockResolvedValue({ data: { session: fakeSession, user: fakeUser }, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  const renderView = () =>
    render(
      <LanguageProvider>
        <ForgotPasswordView onBackToLogin={() => {}} onSuccess={onSuccess} />
      </LanguageProvider>,
    );

  it('rejects empty email without calling the network', async () => {
    renderView();
    fireEvent.submit(screen.getByRole('button', { name: /send verification code/i }));
    expect(await screen.findByText(/please enter your email address/i)).toBeTruthy();
    expect(signInWithOtpMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid email format', async () => {
    renderView();
    fireEvent.change(screen.getByPlaceholderText(/farmer@example.com/i), { target: { value: 'not-an-email' } });
    fireEvent.submit(screen.getByRole('button', { name: /send verification code/i }));
    expect(await screen.findByText(/valid email address/i)).toBeTruthy();
    expect(signInWithOtpMock).not.toHaveBeenCalled();
  });

  it('normalizes (trims + lowercases) email and advances to the OTP step', async () => {
    renderView();
    fireEvent.change(screen.getByPlaceholderText(/farmer@example.com/i), {
      target: { value: '  Farmer@Example.COM  ' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => {
      expect(signInWithOtpMock).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'farmer@example.com' }),
      );
    });
    expect(screen.getByLabelText(/verification code/i)).toBeTruthy();
    expect(screen.getByText(/farmer@example.com/i)).toBeTruthy();
  });

  it('prevents OTP submission until all 6 digits are entered', async () => {
    renderView();
    fireEvent.change(screen.getByPlaceholderText(/farmer@example.com/i), { target: { value: 'farmer@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: /send verification code/i }));
    const input = await screen.findByLabelText(/verification code/i);
    const verifyBtn = screen.getByRole('button', { name: /verify & sign in/i }) as HTMLButtonElement;
    expect(verifyBtn.disabled).toBe(true);
    fireEvent.change(input, { target: { value: '12345' } });
    expect((screen.getByRole('button', { name: /verify & sign in/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it('surfaces a friendly error when the OTP is wrong and does not call onSuccess', async () => {
    verifyOtpMock.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Token has expired or is invalid', status: 401 },
    });
    renderView();
    fireEvent.change(screen.getByPlaceholderText(/farmer@example.com/i), { target: { value: 'farmer@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: /send verification code/i }));
    fireEvent.change(await screen.findByLabelText(/verification code/i), { target: { value: '000000' } });
    fireEvent.submit(screen.getByRole('button', { name: /verify & sign in/i }));

    expect(await screen.findByText(/invalid or expired otp code/i)).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('verifies a correct OTP and calls onSuccess (session flow)', async () => {
    renderView();
    fireEvent.change(screen.getByPlaceholderText(/farmer@example.com/i), { target: { value: 'farmer@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: /send verification code/i }));
    fireEvent.change(await screen.findByLabelText(/verification code/i), { target: { value: '123456' } });
    fireEvent.submit(screen.getByRole('button', { name: /verify & sign in/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(verifyOtpMock).toHaveBeenCalled();
  });

  it('shows a resend cooldown timer after OTP is sent', async () => {
    renderView();
    fireEvent.change(screen.getByPlaceholderText(/farmer@example.com/i), { target: { value: 'farmer@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: /send verification code/i }));
    expect(await screen.findByText(/resend code in 05:00/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /resend code/i })).toBeNull();
  });
});
