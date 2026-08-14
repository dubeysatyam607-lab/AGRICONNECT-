import { IAuthRepository } from '../repositories/IAuthRepository';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { ValidationException } from '@/core/errors/AppException';
import { ChangePasswordSchema } from '../models/AuthValidations';
import { isPasswordStrong } from '@/utils/passwordPolicy';

/**
 * Enterprise Use Case: Secure Password Update.
 */
export class ChangePasswordUseCase {
  private get repository(): IAuthRepository {
    return inject<IAuthRepository>(DI_TOKENS.AuthRepository);
  }

  public async execute(oldPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
    const validation = ChangePasswordSchema.safeParse({ oldPassword, newPassword, confirmPassword });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach(e => {
        if (e.path[0]) errors[e.path[0].toString()] = e.message;
      });
      throw new ValidationException('Please verify your password details.', errors);
    if (!isPasswordStrong(newPassword)) {
      throw new ValidationException('New password does not meet strength requirements.', { newPassword: 'Password is too weak.' });
    }
    }

    if (oldPassword === newPassword) {
      throw new ValidationException('New password must be different from your old password.');
    }

    await this.repository.changePassword(oldPassword, newPassword);
  }
}

export const changePasswordUseCase = new ChangePasswordUseCase();
