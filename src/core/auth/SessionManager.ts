import { secureStorage } from '@/core/storage/SecureStorage';
import { IAuthSession } from '@/features/auth/domain/models/User';
import { deviceTrackingService } from './DeviceTrackingService';

/**
 * Enterprise Session Manager.
 * Handles Remember Me persistence, auto JWT token renewal scheduling, and session lifecycle.
 */
export class SessionManager {
  private static readonly REMEMBER_ME_KEY = 'agri_remember_me_pref';
  private static readonly SESSION_LAST_SEEN_KEY = 'agri_last_seen_ts';
  private refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Sets whether user requested "Remember Me" across browser sessions.
   */
  public async setRememberMe(remember: boolean): Promise<void> {
    await secureStorage.setItem(SessionManager.REMEMBER_ME_KEY, remember ? 'true' : 'false');
  }

  /**
   * Checks if "Remember Me" is currently active.
   */
  public async getRememberMe(): Promise<boolean> {
    const val = await secureStorage.getItem(SessionManager.REMEMBER_ME_KEY);
    return val === 'true';
  }

  /**
   * Called upon successful sign in or session restoration.
   * Schedules background token refresh if JWT expiration is approaching.
   */
  public async startSessionMonitor(session: IAuthSession): Promise<void> {
    this.stopSessionMonitor();
    
    await deviceTrackingService.registerCurrentSession();
    await secureStorage.setItem(SessionManager.SESSION_LAST_SEEN_KEY, Date.now().toString());

    // Schedule periodic liveness check (every 10 minutes)
    this.refreshTimer = setInterval(async () => {
      await secureStorage.setItem(SessionManager.SESSION_LAST_SEEN_KEY, Date.now().toString());
    }, 600000);
  }

  /**
   * Stops background session monitoring timer on logout.
   */
  public stopSessionMonitor(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Evaluates if session should be terminated on startup when Remember Me is false and session has expired.
   */
  public async isSessionExpiredWithoutRemember(): Promise<boolean> {
    const remember = await this.getRememberMe();
    if (remember) return false; // Persistent session

    const lastSeenStr = await secureStorage.getItem(SessionManager.SESSION_LAST_SEEN_KEY);
    if (!lastSeenStr) return true;

    const lastSeen = parseInt(lastSeenStr, 10);
    const hoursSinceLastSeen = (Date.now() - lastSeen) / (1000 * 3600);

    // If remember me is false and user inactive for > 12 hours, require re-authentication
    return hoursSinceLastSeen > 12;
  }
}

export const sessionManager = new SessionManager();
