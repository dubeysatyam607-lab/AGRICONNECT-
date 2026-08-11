import { supabase } from '@/integrations/supabase/client';
import { IFarmerUser, IAuthSession, IDeviceSession } from '../../domain/models/User';
import { AuthException, ServerException, ValidationException } from '@/core/errors/AppException';

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

const attemptLog: Record<string, number[]> = {};
const cooldowns: Record<string, number> = {};

function rateLimitKey(action: string, identifier: string): string {
  return `${action}:${identifier.trim().toLowerCase()}`;
}

function assertWithinRateLimit(action: string, identifier: string): void {
  const now = Date.now();
  const key = rateLimitKey(action, identifier);

  const cooldownUntil = cooldowns[key];
  if (cooldownUntil && now < cooldownUntil) {
    const seconds = Math.max(1, Math.ceil((cooldownUntil - now) / 1000));
    throw new AuthException(
      `Too many attempts. Please wait ${seconds}s and try again.`,
      429,
    );
  }

  const recent = (attemptLog[key] || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.maxAttempts) {
    cooldowns[key] = now + RATE_LIMIT.cooldownMs;
    delete attemptLog[key];
    throw new AuthException(
      'Too many attempts. Please wait 30 seconds before trying again.',
      429,
    );
  }

  recent.push(now);
  attemptLog[key] = recent;
}

function recordAuthSuccess(action: string, identifier: string): void {
  const key = rateLimitKey(action, identifier);
  delete attemptLog[key];
  delete cooldowns[key];
}

export class AuthRemoteDataSource {
  public async signIn(email: string, password: string): Promise<IAuthSession> {
    assertWithinRateLimit('signin', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.status === 400 || error.message.includes('Invalid login credentials')) {
        throw new AuthException('Incorrect email or password. Please try again.', 401, error);
      }
      throw new ServerException(error.message, error.status || 500, error);
    }
    if (!data.session || !data.user) {
      throw new AuthException('Session creation failed. Please try again.', 401);
    }
    recordAuthSuccess('signin', email);
    return this.mapSession(data.session, data.user, 'password');
  }

  public async signUp(email: string, password: string, fullName: string, phone?: string): Promise<IAuthSession> {
    assertWithinRateLimit('signup', email);
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
      if (error.message.includes('already registered') || error.status === 422 || error.status === 400) {
        throw new ValidationException('An account with this email already exists.', { email: 'Already registered' }, error);
      }
      throw new ServerException(error.message, error.status || 500, error);
    }

    if (!data.session || !data.user) {
      throw new ServerException('Please confirm your email address to finish registering, then sign in.', 401);
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

    return session;
  }

  public async sendOtp(target: string, type: 'phone' | 'email'): Promise<void> {
    assertWithinRateLimit('send-otp', target);
    if (type === 'phone') {
      const { error } = await supabase.auth.signInWithOtp({ phone: target });
      if (error) {
        throw new ServerException(error.message, error.status || 500, error);
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email: target });
      if (error) {
        throw new ServerException(error.message, error.status || 500, error);
      }
    }
  }

  public async verifyOtp(target: string, token: string, type: 'phone' | 'email'): Promise<IAuthSession> {
    assertWithinRateLimit('verify-otp', target);
    const { data, error } = await supabase.auth.verifyOtp({
      [type === 'phone' ? 'phone' : 'email']: target,
      token,
      type: type === 'phone' ? 'sms' : 'magiclink',
    } as any);

    if (error) {
      throw new AuthException(
        'Invalid or expired OTP code. Please request a new code.',
        401,
        error,
      );
    }

    if (!data.session || !data.user) {
      throw new AuthException('OTP verified but session creation failed.', 401);
    }

    recordAuthSuccess('verify-otp', target);
    return this.mapSession(data.session, data.user, type === 'phone' ? 'otp_phone' : 'otp_email');
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
