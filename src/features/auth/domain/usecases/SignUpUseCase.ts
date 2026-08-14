import { IAuthRepository } from '../repositories/IAuthRepository';
import { IAuthSession } from '../models/User';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { ValidationException } from '@/core/errors/AppException';
import { SignUpSchema } from '../models/AuthValidations';
import { isPasswordStrong } from '@/utils/passwordPolicy';
import { sessionManager } from '@/core/auth/SessionManager';

/**
 * Enterprise Use Case: Farmer Registration.
 * Executes registration with live Zod validation and session monitoring.
 */
export class SignUpUseCase {
  private get repository(): IAuthRepository {
    return inject<IAuthRepository>(DI_TOKENS.AuthRepository);
  }

  public async execute(email: string, password: string, fullName: string, phone?: string): Promise<IAuthSession> {
    // 1. Validate Input Schema
    const validation = SignUpSchema.safeParse({ email, password, fullName, phone });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach(e => {
        if (e.path[0]) errors[e.path[0].toString()] = e.message;
      });
      throw new ValidationException('Please check your registration details.', errors);
    }
    if (!isPasswordStrong(password)) {
      throw new ValidationException('Password does not meet strength requirements.', { password: 'Password is too weak.' });
    }

    // 2. Execute Registration
    const session = await this.repository.signUp(email, password, fullName, phone);
    
    // 3. Start background session monitoring
    await sessionManager.startSessionMonitor(session);

    return session;
  }
}

export const signUpUseCase = new SignUpUseCase();
