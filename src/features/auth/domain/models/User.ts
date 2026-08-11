/**
 * Enterprise Domain Model for Farmer / User entity and Active Sessions.
 */

export interface IFarmerUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: 'farmer' | 'admin' | 'expert';
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt: string;
}

export interface IDeviceSession {
  id: string;
  deviceId: string;
  deviceName: string; // e.g., "Chrome on macOS" or "Android Mobile"
  ipAddress?: string;
  lastActive: string;
  isCurrentDevice: boolean;
}

export type AuthMethod = 'password' | 'otp_phone' | 'otp_email' | 'google' | 'apple';

export interface IAuthSession {
  user: IFarmerUser;
  accessToken: string;
  refreshToken?: string;
  authMethod?: AuthMethod;
}
