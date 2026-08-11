import { IAuthRepository } from '../repositories/IAuthRepository';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { secureStorage } from '@/core/storage/SecureStorage';
import { analyticsService } from '@/core/services/AnalyticsService';
import { sessionManager } from '@/core/auth/SessionManager';

/**
 * Enterprise Use Case: Farmer Logout & Session Teardown.
 */
export class LogoutUseCase {
  private get repository(): IAuthRepository {
    return inject<IAuthRepository>(DI_TOKENS.AuthRepository);
  }

  public async execute(): Promise<void> {
    try {
      sessionManager.stopSessionMonitor();
      await this.repository.signOut();
    } catch (e) {
      console.warn('[LogoutUseCase] Remote sign out failed, clearing local storage regardless', e);
    } finally {
      await secureStorage.clear();
      analyticsService.reset();
    }
  }
}

export const logoutUseCase = new LogoutUseCase();
