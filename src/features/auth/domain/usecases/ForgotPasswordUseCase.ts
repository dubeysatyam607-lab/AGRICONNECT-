import { IAuthRepository } from '../repositories/IAuthRepository';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { ValidationException } from '@/core/errors/AppException';
import { ForgotPasswordSchema } from '../models/AuthValidations';

/**
 * Enterprise Use Case: Forgot Password & Account Recovery.
 */
export class ForgotPasswordUseCase {
  private get repository(): IAuthRepository {
    return inject<IAuthRepository>(DI_TOKENS.AuthRepository);
  }

  public async execute(identifier: string): Promise<void> {
    const validation = ForgotPasswordSchema.safeParse({ identifier });
    if (!validation.success) {
      throw new ValidationException('Please enter a valid registered email or mobile number.');
    }

    await this.repository.forgotPassword(identifier);
  }
}

export const forgotPasswordUseCase = new ForgotPasswordUseCase();
