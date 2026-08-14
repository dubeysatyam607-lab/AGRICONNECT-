import { supabase } from '@/integrations/supabase/client';
import { IFarmerUser, IAuthSession, IDeviceSession } from '../../domain/models/User';
import { AuthException, ServerException, ValidationException } from '@/core/errors/AppException';
import { EmailRegex } from '../../domain/models/AuthValidations';
import { auditLog } from '@/utils/auditLog';

/**
 * Enterprise Remote Data Source for Complete Authentication Suite.
 * Communicates with Supabase Identity Engine & handles OTP, OAuth, and device session control.
 */

// Complete Authentication Suite.
// Communicates with Supabase Identity Engine & handles OTP, OAuth, and device session control.

// Client-side rate limiting for auth attempts — defense-in-depth against
// credential-stuffing / OTP brute-force. Supabase enforces the authoritative
// server-side limits; this layer guards the UI against rapid-fire retries.
const RATE_LIMIT = {
  windowMs: 60_000,
  maxAttempts: 5,
  cooldownMs: 30_000,
};

// Per‑action limits (can be overridden via environment variables)
const PER_ACTION_LIMITS: Record<string, { maxAttempts: number; windowMs: number; cooldownMs: number }> = {
  signin: { maxAttempts: Number(process.env.RATE_LIMIT_SIGNIN_MAX) || 5, windowMs: Number(process.env.RATE_LIMIT_SIGNIN_WINDOW) || 300_000, cooldownMs: Number(process.env.RATE_LIMIT_SIGNIN_COOLDOWN) || 30_000 },
  signup: { maxAttempts: Number(process.env.RATE_LIMIT_SIGNUP_MAX) || 3, windowMs: Number(process.env.RATE_LIMIT_SIGNUP_WINDOW) || 300_000, cooldownMs: Number(process.env.RATE_LIMIT_SIGNUP_COOLDOWN) || 60_000 },
  'send-otp': { maxAttempts: Number(process.env.RATE_LIMIT_SENDOTP_MAX) || 1, windowMs: Number(process.env.RATE_LIMIT_SENDOTP_WINDOW) || 60_000, cooldownMs: Number(process.env.RATE_LIMIT_SENDOTP_COOLDOWN) || 0 },
  'verify-otp': { maxAttempts: Number(process.env.RATE_LIMIT_VERIFYOTP_MAX) || 5, windowMs: Number(process.env.RATE_LIMIT_VERIFYOTP_WINDOW) || 300_000, cooldownMs: Number(process.env.RATE_LIMIT_VERIFYOTP_COOLDOWN) || 0 },
};

const attemptLog: Record<string, number[]> = {};
const cooldowns: Record<string, number> = {};
// Track last OTP sent timestamp per email to avoid duplicate OTP emails within validity period
const lastOtpSent: Record<string, number> = {};

/**
 * Clears all in-memory rate-limit/throttle state. Exposed for test isolation
 * so unit tests can exercise the datasource without leaking attempts across
 * test cases. Not used in production flows.
 */
export function resetAuthRateLimits(): void {
  for (const key of Object.keys(attemptLog)) delete attemptLog[key];
  for (const key of Object.keys(cooldowns)) delete cooldowns[key];
  for (const key of Object.keys(lastOtpSent)) delete lastOtpSent[key];
  AuthRemoteDataSource.pendingOtpRequests = {};
}

function rateLimitKey(action: string, identifier: string, ip?: string): string {
  const base = `${action}:${identifier.trim().toLowerCase()}`;
  return ip ? `${base}:ip:${ip}` : base;
}

function assertWithinRateLimit(action: string, identifier: string, ip?: string): void {
  const now = Date.now();
  const key = rateLimitKey(action, identifier, ip);

  // Use per‑action configuration if available
  const limits = PER_ACTION_LIMITS[action] || RATE_LIMIT;

  const cooldownUntil = cooldowns[key];
  if (cooldownUntil && now < cooldownUntil) {
    const seconds = Math.max(1, Math.ceil((cooldownUntil - now) / 1000));
    throw new AuthException(`Too many attempts. Please wait ${seconds}s and try again.`, 429);
  }

  const recent = (attemptLog[key] || []).filter((t) => now - t < limits.windowMs);
  if (recent.length >= limits.maxAttempts) {
    cooldowns[key] = now + limits.cooldownMs;
    delete attemptLog[key];
    throw new AuthException('Too many attempts. Please wait before trying again.', 429);
  }

  recent.push(now);
  attemptLog[key] = recent;
}

function recordAuthSuccess(action: string, identifier: string, ip?: string): void {
  const key = rateLimitKey(action, identifier, ip);
  delete attemptLog[key];
  delete cooldowns[key];
}

export class AuthRemoteDataSource {
  // In-memory lock to prevent duplicate OTP requests per email
  private static pendingOtpRequests: Record<string, Promise<void>> = {};

  public async signIn(email: string, password: string, ip?: string): Promise<IAuthSession> {
    // Validate email format early to avoid leaking existence information
    if (!EmailRegex.test(email.trim())) {
      throw new ValidationException('Please provide a valid email address.');
    }
    assertWithinRateLimit('signin', email, ip);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Uniform error message to prevent enumeration
      throw new AuthException('Invalid credentials. Please try again.', 401, error);
    }
    if (!data.session || !data.user) {
      throw new AuthException('Session creation failed. Please try again.', 401);
    }
    recordAuthSuccess('signin', email, ip);
    await auditLog({ action: 'signin_success', identifier: email, ip, outcome: 'success' });
    return this.mapSession(data.session, data.user, 'password');
  }

  public async signUp(email: string, password: string, fullName: string, phone?: string, ip?: string): Promise<IAuthSession> {
    // Validate email early
    if (!EmailRegex.test(email.trim())) {
      throw new ValidationException('Please provide a valid email address.');
    }
    assertWithinRateLimit('signup', email, ip);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || '',
          role: 'farmer',
        },
      },
    });

    if (error) {
      // Generic response to avoid revealing existence
      throw new ValidationException('Unable to register at this time. Please try again later.', {}, error);
    }

    if (!data.session || !data.user) {
        throw new ServerException('Registration succeeded. Please verify your email before signing in.', 401);
      }

    const session: IAuthSession = {
      user: {
        id: data.user.id,
        email: data.user.email || email,
        fullName: data.user.user_metadata?.full_name || fullName,
        phone: data.user.user_metadata?.phone || phone,
        role: (data.user.user_metadata?.role as any) || 'farmer',
        isEmailVerified: !!data.user.email_confirmed_at,
        isPhoneVerified: !!data.user.phone_confirmed_at,
        createdAt: data.user.created_at || new Date().toISOString(),
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      authMethod: 'password',
    };

    await auditLog({ action: 'signup_success', identifier: email, ip, outcome: 'success' });
    return session;
  }

  /**
   * Send an email OTP to the given address.
   * Only email OTP is supported — phone OTP is rejected at the data layer.
   * When signing up (meta supplied) the user is created on successful
   * verification via `shouldCreateUser`.
   */
  public async sendOtp(email: string, type: 'phone' | 'email' = 'email', meta?: { full_name?: string; phone?: string }, ip?: string): Promise<void> {
    if (type !== 'email') {
      throw new AuthException('Mobile OTP is not supported. Please use your email address instead.', 400);
    }
    const normalized = email.trim().toLowerCase();
    if (!EmailRegex.test(normalized)) {
      throw new ValidationException('Please enter a valid email address to receive the OTP.');
    }
    // If a request is already in progress for this email, return the existing promise
    if (AuthRemoteDataSource.pendingOtpRequests[normalized]) {
      return AuthRemoteDataSource.pendingOtpRequests[normalized];
    }
    // Generic rate limit handling – do not disclose whether the email exists
    assertWithinRateLimit('send-otp', normalized, ip);
    const now = Date.now();
    if (lastOtpSent[normalized] && now - lastOtpSent[normalized] < 5 * 60 * 1000) {
      // Generic throttling response
      throw new AuthException('Too many OTP requests. Please try again later.', 429);
    }
    const requestPromise = (async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: meta
          ? {
              shouldCreateUser: true,
              data: {
                full_name: meta.full_name ?? '',
                phone: meta.phone ?? '',
                role: 'farmer',
              },
            }
          : undefined,
      });
      if (error) {
        throw new ServerException(error.message, error.status || 500, error);
      }
    })();
    AuthRemoteDataSource.pendingOtpRequests[normalized] = requestPromise;
    try {
      await requestPromise;
      // Record the timestamp of successful OTP dispatch
      lastOtpSent[normalized] = Date.now();
    } finally {
      delete AuthRemoteDataSource.pendingOtpRequests[normalized];
    }
    await auditLog({ action: 'send_otp_success', identifier: normalized, ip, outcome: 'success' });
  }

  public async verifyOtp(email: string, token: string, type: 'phone' | 'email' = 'email', ip?: string): Promise<IAuthSession> {
    if (type !== 'email') {
      throw new AuthException('Mobile OTP is not supported. Please use your email address instead.', 400);
    }
    const normalized = email.trim().toLowerCase();
    const cleanToken = token.trim();
    if (!/^\d{6}$/.test(cleanToken)) {
      throw new ValidationException('Please enter the 6-digit code sent to your email.');
    }
    assertWithinRateLimit('verify-otp', normalized, ip);
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalized,
      token: cleanToken,
      type: 'email',
    } as any);

    if (error) {
      throw new AuthException('Invalid or expired OTP code. Please request a new code.', 401, error);
    }

    if (!data.session || !data.user) {
      throw new AuthException('OTP verified but session creation failed.', 401);
    }

    recordAuthSuccess('verify-otp', email, ip);
    await auditLog({ action: 'verify_otp_success', identifier: normalized, ip, outcome: 'success' });
    return this.mapSession(data.session, data.user, 'otp_email');
  }

  public async signInWithOAuth(provider: 'google' | 'apple'): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (error) {
      console.warn(`[AuthRemoteDataSource] OAuth ${provider} trigger warning:`, error.message);
      // In sandbox mode without API keys, allow UI testing to proceed gracefully.
      // In production, surface the failure so the user is not left in limbo.
      throw new ServerException(error.message, error.status || 500, error);
    }
  }

  public async forgotPassword(identifier: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    // Keep 'not found' silent for privacy (don't reveal whether an account exists),
    // but surface real failures so users are never told instructions were sent
    // when nothing was actually sent.
    if (error && !error.message.toLowerCase().includes('not found')) {
      throw new ServerException(error.message, error.status || 500, error);
    }
  }

  public async changePassword(oldPass: string, newPass: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      throw new ServerException(error.message || 'Failed to change password.', error.status || 500, error);
    }
  }

  public async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthRemoteDataSource] Sign out warning:', error);
    }
  }

  public async signOutFromAllDevices(): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      console.error('[AuthRemoteDataSource] Global sign out warning:', error);
    }
  }

  public async getCurrentSession(): Promise<IAuthSession | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) {
      return null;
    }
    return this.mapSession(session, session.user);
  }

  private mapSession(session: any, user: any, authMethod: 'password' | 'otp_phone' | 'otp_email' | 'google' | 'apple' = 'password'): IAuthSession {
    const farmerUser: IFarmerUser = {
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Farmer',
      phone: user.user_metadata?.phone || '',
      avatarUrl: user.user_metadata?.avatar_url,
      role: (user.user_metadata?.role as any) || 'farmer',
      isEmailVerified: !!user.email_confirmed_at,
      isPhoneVerified: !!user.phone_confirmed_at,
      createdAt: user.created_at || new Date().toISOString(),
    };

    return {
      user: farmerUser,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      authMethod,
    };
  }
}

export const authRemoteDataSource = new AuthRemoteDataSource();
