import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { IFarmerUser, IAuthSession, IDeviceSession } from '../../domain/models/User';
import { authRemoteDataSource, AuthRemoteDataSource } from '../datasources/AuthRemoteDataSource';
import { secureStorage } from '@/core/storage/SecureStorage';
import { analyticsService } from '@/core/services/AnalyticsService';
import { crashLoggingService } from '@/core/services/CrashLoggingService';
import { deviceTrackingService } from '@/core/auth/DeviceTrackingService';

/**
 * Enterprise Concrete Repository Implementation for Authentication.
 * Manages caching, secure storage sync, telemetry identification, device session control, and API coordination.
 */
export class AuthRepositoryImpl implements IAuthRepository {
  private dataSource: AuthRemoteDataSource;

  constructor(dataSource: AuthRemoteDataSource = authRemoteDataSource) {
    this.dataSource = dataSource;
  }

  public async signIn(email: string, password: string, rememberMe?: boolean): Promise<IAuthSession> {
    crashLoggingService.addBreadcrumb('AuthRepositoryImpl.signIn', { email, rememberMe });
    
    const session = await this.dataSource.signIn(email, password);
    await this.persistSession(session);
    
    analyticsService.identify(session.user.id, {
      email: session.user.email,
      role: session.user.role,
      fullName: session.user.fullName,
    });
    analyticsService.track('Farmer_Signed_In', { method: 'password', rememberMe });

    return session;
  }

  public async signUp(email: string, password: string, fullName: string, phone?: string): Promise<IAuthSession> {
    crashLoggingService.addBreadcrumb('AuthRepositoryImpl.signUp', { email, fullName });
    
    const session = await this.dataSource.signUp(email, password, fullName, phone);
    await this.persistSession(session);
    
    analyticsService.identify(session.user.id, {
      email: session.user.email,
      role: session.user.role,
      fullName: session.user.fullName,
    });
    analyticsService.track('Farmer_Registered_Instant', { no_otp: true });

    return session;
  }

  public async sendOtp(target: string, type: 'phone' | 'email'): Promise<void> {
    crashLoggingService.addBreadcrumb('AuthRepositoryImpl.sendOtp', { target, type });
    await this.dataSource.sendOtp(target, type);
    analyticsService.track('OTP_Requested', { target_type: type });
  }

  public async verifyOtp(target: string, token: string, type: 'phone' | 'email'): Promise<IAuthSession> {
    crashLoggingService.addBreadcrumb('AuthRepositoryImpl.verifyOtp', { target, type });
    const session = await this.dataSource.verifyOtp(target, token, type);
    await this.persistSession(session);

    analyticsService.identify(session.user.id, {
      email: session.user.email,
      role: session.user.role,
      fullName: session.user.fullName,
    });
    analyticsService.track('Farmer_Verified_OTP', { target_type: type });

    return session;
  }

  public async signInWithOAuth(provider: 'google' | 'apple'): Promise<void> {
    crashLoggingService.addBreadcrumb('AuthRepositoryImpl.signInWithOAuth', { provider });
    await this.dataSource.signInWithOAuth(provider);
    analyticsService.track('Social_OAuth_Triggered', { provider });
  }

  public async forgotPassword(identifier: string): Promise<void> {
    crashLoggingService.addBreadcrumb('AuthRepositoryImpl.forgotPassword', { identifier });
    await this.dataSource.forgotPassword(identifier);
    analyticsService.track('Forgot_Password_Requested', { identifier });
  }

  public async changePassword(oldPass: string, newPass: string): Promise<void> {
    crashLoggingService.addBreadcrumb('AuthRepositoryImpl.changePassword');
    await this.dataSource.changePassword(oldPass, newPass);
    analyticsService.track('Farmer_Changed_Password');
  }

  public async getActiveSessions(): Promise<IDeviceSession[]> {
    return await deviceTrackingService.getActiveSessions();
  }

  public async signOut(): Promise<void> {
    crashLoggingService.addBreadcrumb('AuthRepositoryImpl.signOut');
    await this.dataSource.signOut();
    await secureStorage.clear();
  }

  public async signOutFromAllDevices(): Promise<void> {
    crashLoggingService.addBreadcrumb('AuthRepositoryImpl.signOutFromAllDevices');
    await this.dataSource.signOutFromAllDevices();
    await deviceTrackingService.clearAllSessions();
    await secureStorage.clear();
  }

  public async getCurrentSession(): Promise<IAuthSession | null> {
    try {
      const session = await this.dataSource.getCurrentSession();
      if (session) {
        await this.persistSession(session);
      }
      return session;
    } catch (e) {
      console.warn('[AuthRepositoryImpl] Failed to retrieve current session', e);
      return null;
    }
  }

  public async getCurrentUser(): Promise<IFarmerUser | null> {
    const session = await this.getCurrentSession();
    return session?.user || null;
  }

  private async persistSession(session: IAuthSession): Promise<void> {
    if (session.accessToken) {
      await secureStorage.setItem('access_token', session.accessToken);
    }
    if (session.refreshToken) {
      await secureStorage.setItem('refresh_token', session.refreshToken);
    }
    await secureStorage.setItem('cached_user', JSON.stringify(session.user));
    if (session.authMethod) {
      await secureStorage.setItem('auth_method', session.authMethod);
    }
  }
}

export const authRepositoryImpl = new AuthRepositoryImpl();
