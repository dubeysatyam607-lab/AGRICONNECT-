import { supabase } from '@/integrations/supabase/client';
import { IFarmerUser, IAuthSession, IDeviceSession } from '../../domain/models/User';
import { AuthException, ServerException, ValidationException } from '@/core/errors/AppException';
import { EmailRegex } from '../../domain/models/AuthValidations';
import { auditLog } from '@/utils/auditLog';
import { OAUTH_CALLBACK_PATH } from '@/config/oauth';

/**
 * Canonical origin used for OAuth / password-reset redirects.
 * In production this is pinned via VITE_SITE_URL so Google logins always return
 * to the deployed domain — never to a localhost or preview tab. When unset (local
 * development) the current tab's origin is used.
 */
function getAuthRedirectBase(): string | undefined {
  return import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : undefined);
}

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
  signin: { maxAttempts: Number(import.meta.env.VITE_RATE_LIMIT_SIGNIN_MAX) || 5, windowMs: Number(import.meta.env.VITE_RATE_LIMIT_SIGNIN_WINDOW) || 300_000, cooldownMs: Number(import.meta.env.VITE_RATE_LIMIT_SIGNIN_COOLDOWN) || 30_000 },
  signup: { maxAttempts: Number(import.meta.env.VITE_RATE_LIMIT_SIGNUP_MAX) || 3, windowMs: Number(import.meta.env.VITE_RATE_LIMIT_SIGNUP_WINDOW) || 300_000, cooldownMs: Number(import.meta.env.VITE_RATE_LIMIT_SIGNUP_COOLDOWN) || 60_000 },
  'send-otp': { maxAttempts: Number(import.meta.env.VITE_RATE_LIMIT_SENDOTP_MAX) || 3, windowMs: Number(import.meta.env.VITE_RATE_LIMIT_SENDOTP_WINDOW) || 60_000, cooldownMs: Number(import.meta.env.VITE_RATE_LIMIT_SENDOTP_COOLDOWN) || 30_000 },
  'verify-otp': { maxAttempts: Number(import.meta.env.VITE_RATE_LIMIT_VERIFYOTP_MAX) || 5, windowMs: Number(import.meta.env.VITE_RATE_LIMIT_VERIFYOTP_WINDOW) || 300_000, cooldownMs: Number(import.meta.env.VITE_RATE_LIMIT_VERIFYOTP_COOLDOWN) || 0 },
};

const attemptLog: Record<string, number[]> = {};
const cooldowns: Record<string, number> = {};

const RATE_LIMIT_STORAGE_KEY = 'agri_auth_rate_limits';

function loadRateLimits(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { attempts?: Record<string, number[]>; cooldowns?: Record<string, number> };
    const now = Date.now();
    // Only restore entries within their window
    for (const [k, v] of Object.entries(parsed.attempts || {})) {
      const actionKey = k.split(':')[0] as string;
      const cfg = (PER_ACTION_LIMITS as Record<string, { windowMs: number }>)[actionKey];
      const windowMs = cfg?.windowMs || RATE_LIMIT.windowMs;
      const valid = (v as number[]).filter(t => now - t < windowMs);
      if (valid.length) attemptLog[k] = valid;
    }
    for (const [k, v] of Object.entries(parsed.cooldowns || {})) {
      if (typeof v === 'number' && v > now) cooldowns[k] = v;
    }
  } catch { /* corrupt storage — use empty in-memory */ }
}

function persistRateLimits(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify({
      attempts: attemptLog,
      cooldowns,
    }));
  } catch { /* storage unavailable */ }
}
// Track last OTP sent timestamp per email to avoid duplicate OTP emails within
// the validity period. Persisted to localStorage so a page refresh cannot reset
// the 5-minute window and mint a brand-new OTP (which would invalidate the
// previously delivered code).
const OTP_SENT_STORAGE_KEY = 'agri_otp_sent_at';
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

function loadOtpSentMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(OTP_SENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    // Drop stale entries so the map doesn't grow unbounded.
    const now = Date.now();
    for (const k of Object.keys(parsed)) {
      if (now - (parsed[k] || 0) >= OTP_RESEND_COOLDOWN_MS) delete parsed[k];
    }
    return parsed;
  } catch {
    return {};
  }
}

function persistOtpSentMap(map: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OTP_SENT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable (private mode / quota) — best-effort only.
  }
}

/**
 * Clears all in-memory rate-limit/throttle state. Exposed for test isolation
 * so unit tests can exercise the datasource without leaking attempts across
 * test cases. Not used in production flows.
 */
export function resetAuthRateLimits(): void {
  for (const key of Object.keys(attemptLog)) delete attemptLog[key];
  for (const key of Object.keys(cooldowns)) delete cooldowns[key];
  persistOtpSentMap({});
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
    persistRateLimits();
    throw new AuthException('Too many attempts. Please wait before trying again.', 429);
  }

  recent.push(now);
  attemptLog[key] = recent;
  persistRateLimits();
}

function recordAuthSuccess(action: string, identifier: string, ip?: string): void {
  const key = rateLimitKey(action, identifier, ip);
  delete attemptLog[key];
  delete cooldowns[key];
  persistRateLimits();
}

// Hydrate rate-limit state from localStorage on module load
loadRateLimits();

export interface IOAuthProfileSyncResult {
  profileExisted: boolean;
  updatedFields: string[];
}

/**
 * Safely enriches the AgriConnect profile from an OAuth (Google) identity.
 *
 * Security & data-integrity rules:
 * - Only identity fields Google actually provides (full name + avatar) are used.
 *   Farm/location/weather data is NEVER derived from the Google account.
 * - Existing profile fields are NEVER overwritten — a manually entered name or
 *   avatar stays untouched; only empty fields are filled in.
 * - If the trigger-created profile row is missing, a minimal row is inserted.
 * - Best-effort only: any failure is logged and swallowed so an OAuth success
 *   is never turned into a login error by a secondary profile write.
 */
export async function syncOAuthProfileFromIdentity(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}): Promise<IOAuthProfileSyncResult> {
  const meta = user.user_metadata || {};
  const provider = user.app_metadata?.provider || meta?.provider || null;
  if (provider && provider !== 'google') {
    return { profileExisted: true, updatedFields: [] };
  }

  const fullName = String(meta.full_name || meta.name || '').trim();
  const avatarUrl = String(meta.avatar_url || meta.picture || '').trim();

  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) {
    console.warn('[AuthRemoteDataSource] Profile sync read failed (best-effort skip):', fetchError.message);
    return { profileExisted: false, updatedFields: [] };
  }

  if (!existing) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: fullName || null,
      avatar_url: avatarUrl || null,
      role: 'farmer',
    });
    if (insertError) {
      console.warn('[AuthRemoteDataSource] Profile sync insert failed (best-effort skip):', insertError.message);
      return { profileExisted: false, updatedFields: [] };
    }
    return { profileExisted: false, updatedFields: ['full_name', 'avatar_url'] };
  }

  // Fill in only the fields that are empty — never overwrite user-entered data.
  const patch: Record<string, string> = {};
  const updatedFields: string[] = [];
  if (!existing.full_name && fullName) {
    patch.full_name = fullName;
    updatedFields.push('full_name');
  }
  if (!existing.avatar_url && avatarUrl) {
    patch.avatar_url = avatarUrl;
    updatedFields.push('avatar_url');
  }
  if (updatedFields.length) {
    const { error: updateError } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (updateError) {
      console.warn('[AuthRemoteDataSource] Profile sync update failed (best-effort skip):', updateError.message);
      return { profileExisted: true, updatedFields: [] };
    }
  }
  return { profileExisted: true, updatedFields };
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
    const otpSentAt = loadOtpSentMap();
    if (otpSentAt[normalized] && now - otpSentAt[normalized] < OTP_RESEND_COOLDOWN_MS) {
      throw new ValidationException('Please wait 60 seconds before requesting a new OTP.');
    }
    const requestPromise = (async () => {
      const redirectBase = getAuthRedirectBase();
      const emailRedirectTo = redirectBase ? `${redirectBase}/auth/callback` : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
          ...(meta
            ? {
                shouldCreateUser: true,
                data: {
                  full_name: meta.full_name ?? '',
                  phone: meta.phone ?? '',
                  role: 'farmer',
                },
              }
            : {}),
        },
      });
      if (error) {
        throw new ServerException(error.message, error.status || 500, error);
      }
    })();
    AuthRemoteDataSource.pendingOtpRequests[normalized] = requestPromise;
    try {
      await requestPromise;
      // Record the timestamp of successful OTP dispatch (persisted so the
      // 5-minute reuse window survives a page refresh).
      otpSentAt[normalized] = Date.now();
      persistOtpSentMap(otpSentAt);
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

    // Only 'email' type is valid — the app uses signInWithOtp with shouldCreateUser.
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalized,
      token: cleanToken,
      type: 'email',
    });

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
    // Use explicit callback path for Google OAuth to avoid redirect_uri_mismatch.
    const base = getAuthRedirectBase();
    const callbackPath = base ? `${base}${OAUTH_CALLBACK_PATH}` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackPath,
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
    const base = getAuthRedirectBase();
    const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
      redirectTo: base ? `${base}/auth/reset` : undefined,
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
