import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Raise the client-side send-otp rate limit so this unit test isolates the
// 60-second OTP-reuse window logic (the 1/min default would otherwise throw
// before the reuse check is reached). We mock import.meta.env which is how
// the production code reads these values (Vite).
vi.hoisted(() => {
  vi.stubEnv('VITE_RATE_LIMIT_SENDOTP_MAX', '10');
  vi.stubEnv('VITE_RATE_LIMIT_SENDOTP_WINDOW', '600000');
});

import { authRemoteDataSource as ds, resetAuthRateLimits } from './AuthRemoteDataSource';

const signInWithOtp = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: unknown[]) => signInWithOtp(...args),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      verifyOtp: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock('@/utils/auditLog', () => ({ auditLog: vi.fn() }));

describe('AuthRemoteDataSource OTP reuse window (security regression)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAuthRateLimits();
    signInWithOtp.mockReset().mockResolvedValue({ error: null });
  });

  it('does not resend an OTP within the 60-second cooldown window', async () => {
    await ds.sendOtp('farmer@example.com');
    expect(signInWithOtp).toHaveBeenCalledTimes(1);

    // Second request within the cooldown window must throw ValidationException.
    await expect(ds.sendOtp('farmer@example.com')).rejects.toThrow('Please wait 60 seconds before requesting a new OTP.');
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
  });

  it('resends after the 60-second cooldown window expires', async () => {
    await ds.sendOtp('farmer@example.com');

    // Simulate the window elapsing by aging the persisted timestamp.
    const stored = JSON.parse(localStorage.getItem('agri_otp_sent_at') || '{}');
    stored['farmer@example.com'] = Date.now() - 70 * 1000;
    localStorage.setItem('agri_otp_sent_at', JSON.stringify(stored));

    await ds.sendOtp('farmer@example.com');
    expect(signInWithOtp).toHaveBeenCalledTimes(2);
  });

  it('survives a page reload (cooldown persists in localStorage)', async () => {
    await ds.sendOtp('farmer@example.com');
    expect(signInWithOtp).toHaveBeenCalledTimes(1);

    // Simulate reload: wipe all in-memory rate-limit state (attemptLog,
    // cooldowns, pending requests). The persisted OTP timestamp must survive
    // and still block a duplicate send within 60s.
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('agri_')) continue;
      localStorage.removeItem(key);
    }
    for (const key of Object.getOwnPropertyNames(ds)) {
      if (key === 'pendingOtpRequests') (ds as Record<string, unknown>)[key] = {};
    }
    await expect(ds.sendOtp('farmer@example.com')).rejects.toThrow('Please wait 60 seconds before requesting a new OTP.');
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
  });
});