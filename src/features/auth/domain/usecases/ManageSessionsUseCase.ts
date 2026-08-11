import { IAuthRepository } from '../repositories/IAuthRepository';
import { IDeviceSession } from '../models/User';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { secureStorage } from '@/core/storage/SecureStorage';
import { deviceTrackingService } from '@/core/auth/DeviceTrackingService';

/**
 * Enterprise Use Case: Multi-Device Session Management & Logout All.
 */
export class ManageSessionsUseCase {
  private get repository(): IAuthRepository {
    return inject<IAuthRepository>(DI_TOKENS.AuthRepository);
  }

  public async getActiveSessions(): Promise<IDeviceSession[]> {
    return await this.repository.getActiveSessions();
  }

  public async signOutFromAllDevices(): Promise<void> {
    await this.repository.signOutFromAllDevices();
    await deviceTrackingService.clearAllSessions();
    await secureStorage.clear();
  }
}

export const manageSessionsUseCase = new ManageSessionsUseCase();
