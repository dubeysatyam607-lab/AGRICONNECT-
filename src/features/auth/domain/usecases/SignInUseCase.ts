import { IAuthRepository } from '../repositories/IAuthRepository';
import { IAuthSession } from '../models/User';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { ValidationException } from '@/core/errors/AppException';
import { SignInSchema } from '../models/AuthValidations';
import { sessionManager } from '@/core/auth/SessionManager';

/**
 * Enterprise Use Case: Farmer Sign In.
 * Encapsulates Zod validation, Remember Me persistence, and business logic for authentication.
 */
export class SignInUseCase {
  private get repository(): IAuthRepository {
    return inject<IAuthRepository>(DI_TOKENS.AuthRepository);
  }

  public async execute(identifier: string, password: string, rememberMe: boolean = true): Promise<IAuthSession> {
    // 1. Validate Input Schema
    const validation = SignInSchema.safeParse({ identifier, password, rememberMe });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach(e => {
        if (e.path[0]) errors[e.path[0].toString()] = e.message;
      });
      throw new ValidationException('Invalid login credentials provided.', errors);
    }

    // 2. Persist Remember Me preference
    await sessionManager.setRememberMe(rememberMe);

    // 3. Delegate to Domain Repository
    const session = await this.repository.signIn(identifier, password, rememberMe);
    
    // 4. Start background token monitoring
    await sessionManager.startSessionMonitor(session);

    return session;
  }
}

export const signInUseCase = new SignInUseCase();
