import { IAuthRepository } from '../repositories/IAuthRepository';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';

/**
 * Enterprise Use Case: Social OAuth (Google & Apple).
 */
export class SocialAuthUseCase {
  private get repository(): IAuthRepository {
    return inject<IAuthRepository>(DI_TOKENS.AuthRepository);
  }

  public async execute(provider: 'google' | 'apple'): Promise<void> {
    await this.repository.signInWithOAuth(provider);
  }
}

export const socialAuthUseCase = new SocialAuthUseCase();
