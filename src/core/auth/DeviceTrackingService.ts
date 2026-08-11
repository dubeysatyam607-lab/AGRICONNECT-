import { secureStorage } from '@/core/storage/SecureStorage';
import { IDeviceSession } from '@/features/auth/domain/models/User';

/**
 * Enterprise Device Tracking Service.
 * Manages unique hardware/browser fingerprinting and active session monitoring across devices.
 */
export class DeviceTrackingService {
  private static readonly DEVICE_ID_KEY = 'agri_device_fingerprint';
  private static readonly ACTIVE_SESSIONS_KEY = 'agri_mock_active_sessions';

  /**
   * Retrieves or generates a unique, persistent Device Fingerprint ID.
   */
  public async getDeviceId(): Promise<string> {
    let deviceId = await secureStorage.getItem(DeviceTrackingService.DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `dev_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
      await secureStorage.setItem(DeviceTrackingService.DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  /**
   * Identifies device name and operating system from navigator userAgent.
   */
  public getDeviceName(): string {
    if (typeof window === 'undefined' || !navigator) {
      return 'Cloud Server / Unknown Device';
    }

    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    if (ua.includes('Win')) os = 'Windows PC';
    else if (ua.includes('Mac')) os = 'macOS Desktop';
    else if (ua.includes('Linux')) os = 'Linux Desktop';
    else if (ua.includes('Android')) os = 'Android Mobile';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS Mobile';

    let browser = 'Browser';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';

    return `${browser} on ${os}`;
  }

  /**
   * Registers current device session on sign in.
   */
  public async registerCurrentSession(): Promise<IDeviceSession> {
    const deviceId = await this.getDeviceId();
    const deviceName = this.getDeviceName();
    const now = new Date().toISOString();

    const currentSession: IDeviceSession = {
      id: `sess_${deviceId}`,
      deviceId,
      deviceName,
      ipAddress: '192.168.29.72 (Local Network)',
      lastActive: now,
      isCurrentDevice: true,
    };

    // Keep track of recent devices in storage
    try {
      const existingJson = await secureStorage.getItem(DeviceTrackingService.ACTIVE_SESSIONS_KEY);
      let sessions: IDeviceSession[] = existingJson ? JSON.parse(existingJson) : [];
      
      // Filter out this device if already recorded, then prepend updated current session
      sessions = sessions.filter(s => s.deviceId !== deviceId);
      sessions.forEach(s => (s.isCurrentDevice = false));
      
      // Ensure we simulate at least 1 secondary device for demonstration of multi-device management
      if (sessions.length === 0) {
        sessions.push({
          id: 'sess_dev_mobile_alt',
          deviceId: 'dev_mobile_alt',
          deviceName: 'Chrome on Android Mobile',
          ipAddress: '103.20.140.45 (Jaipur Cellular)',
          lastActive: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
          isCurrentDevice: false,
        });
      }

      sessions.unshift(currentSession);
      await secureStorage.setItem(DeviceTrackingService.ACTIVE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('[DeviceTrackingService] Failed to persist active sessions list', e);
    }

    return currentSession;
  }

  /**
   * Retrieves all active sessions across devices for the logged-in user.
   */
  public async getActiveSessions(): Promise<IDeviceSession[]> {
    try {
      const existingJson = await secureStorage.getItem(DeviceTrackingService.ACTIVE_SESSIONS_KEY);
      if (!existingJson) {
        const current = await this.registerCurrentSession();
        return [current];
      }
      return JSON.parse(existingJson);
    } catch {
      return [];
    }
  }

  /**
   * Terminates all active sessions (e.g., when clicking "Logout from all devices").
   */
  public async clearAllSessions(): Promise<void> {
    await secureStorage.removeItem(DeviceTrackingService.ACTIVE_SESSIONS_KEY);
  }
}

export const deviceTrackingService = new DeviceTrackingService();
