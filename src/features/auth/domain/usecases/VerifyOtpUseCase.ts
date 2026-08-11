import { IAuthRepository } from '../repositories/IAuthRepository';
import { IAuthSession } from '../models/User';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { ValidationException } from '@/core/errors/AppException';
import { OtpVerificationSchema } from '../models/AuthValidations';
import { sessionManager } from '@/core/auth/SessionManager';

/**
 * Enterprise Use Case: Multi-Modal OTP Verification (Phone & Email).
 */
export class VerifyOtpUseCase {
  private get repository(): IAuthRepository {
    return inject<IAuthRepository>(DI_TOKENS.AuthRepository);
  }

  public async sendOtp(target: string, type: 'phone' | 'email'): Promise<void> {
    if (!target || target.trim().length < 3) {
      throw new ValidationException('Please provide a valid mobile number or email address.');
    }
    await this.repository.sendOtp(target, type);
  }

  public async execute(target: string, token: string, type: 'phone' | 'email'): Promise<IAuthSession> {
    const validation = OtpVerificationSchema.safeParse({ target, token, type });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach(e => {
        if (e.path[0]) errors[e.path[0].toString()] = e.message;
      });
      throw new ValidationException('Invalid OTP provided. Please enter a 6-digit code.', errors);
    }

    const session = await this.repository.verifyOtp(target, token, type);
    await sessionManager.startSessionMonitor(session);
    return session;
  }
}

export const verifyOtpUseCase = new VerifyOtpUseCase();
