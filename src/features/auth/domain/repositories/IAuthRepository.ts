import { IFarmerUser, IAuthSession, IDeviceSession } from '../models/User';

/**
 * Enterprise Abstract Repository Contract for Complete Authentication Suite.
 * Follows Dependency Inversion Principle (DIP): ViewModels and Use Cases depend only on this interface.
 */

export interface IAuthRepository {
  signIn(email: string, password: string, rememberMe?: boolean): Promise<IAuthSession>;
  signUp(email: string, password: string, fullName: string, phone?: string): Promise<IAuthSession>;
  signOut(): Promise<void>;
  getCurrentSession(): Promise<IAuthSession | null>;
  getCurrentUser(): Promise<IFarmerUser | null>;

  // Multi-Modal OTP Verification
  sendOtp(target: string, type: 'phone' | 'email'): Promise<void>;
  verifyOtp(target: string, token: string, type: 'phone' | 'email'): Promise<IAuthSession>;

  // Social OAuth
  signInWithOAuth(provider: 'google' | 'apple'): Promise<void>;

  // Password Recovery & Security
  forgotPassword(identifier: string): Promise<void>;
  changePassword(oldPass: string, newPass: string): Promise<void>;

  // Session & Device Tracking
  getActiveSessions(): Promise<IDeviceSession[]>;
  signOutFromAllDevices(): Promise<void>;
}
