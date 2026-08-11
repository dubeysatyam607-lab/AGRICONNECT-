import { container, DI_TOKENS } from './Container';
import { secureStorage } from '@/core/storage/SecureStorage';
import { dioClient } from '@/core/network/DioClient';
import { connectivityMonitor } from '@/core/services/ConnectivityMonitor';
import { analyticsService } from '@/core/services/AnalyticsService';
import { crashLoggingService } from '@/core/services/CrashLoggingService';
import { appLifecycleManager } from '@/core/services/AppLifecycleManager';
import { authRepositoryImpl } from '@/features/auth/data/repositories/AuthRepositoryImpl';
import { signInUseCase } from '@/features/auth/domain/usecases/SignInUseCase';
import { signUpUseCase } from '@/features/auth/domain/usecases/SignUpUseCase';
import { logoutUseCase } from '@/features/auth/domain/usecases/LogoutUseCase';
import { verifyOtpUseCase } from '@/features/auth/domain/usecases/VerifyOtpUseCase';
import { forgotPasswordUseCase } from '@/features/auth/domain/usecases/ForgotPasswordUseCase';
import { changePasswordUseCase } from '@/features/auth/domain/usecases/ChangePasswordUseCase';
import { socialAuthUseCase } from '@/features/auth/domain/usecases/SocialAuthUseCase';
import { manageSessionsUseCase } from '@/features/auth/domain/usecases/ManageSessionsUseCase';

import { profileRepositoryImpl } from '@/features/profile/data/repositories/ProfileRepositoryImpl';
import { getFarmerProfileUseCase } from '@/features/profile/domain/usecases/GetFarmerProfileUseCase';
import { updateFarmerProfileUseCase } from '@/features/profile/domain/usecases/UpdateFarmerProfileUseCase';
import { captureGpsFarmMapUseCase } from '@/features/profile/domain/usecases/CaptureGpsFarmMapUseCase';

import { weatherRepositoryImpl } from '@/features/weather/data/repositories/WeatherRepositoryImpl';

/**
 * Enterprise DI Bootstrap / Initializer.
 * Registers all core singletons and repository implementations at application startup.
 */
export function initializeDIContainer(): void {
  // 1. Infrastructure Services
  container.registerSingleton(DI_TOKENS.SecureStorage, secureStorage);
  container.registerSingleton(DI_TOKENS.DioClient, dioClient);
  container.registerSingleton(DI_TOKENS.ConnectivityMonitor, connectivityMonitor);
  container.registerSingleton(DI_TOKENS.AnalyticsService, analyticsService);
  container.registerSingleton(DI_TOKENS.CrashLoggingService, crashLoggingService);
  container.registerSingleton(DI_TOKENS.AppLifecycleManager, appLifecycleManager);

  // 2. Repositories
  container.registerSingleton(DI_TOKENS.AuthRepository, authRepositoryImpl);
  container.registerSingleton(DI_TOKENS.ProfileRepository, profileRepositoryImpl);
  container.registerSingleton(DI_TOKENS.WeatherRepository, weatherRepositoryImpl);

  // 3. Auth Use Cases
  container.registerSingleton(DI_TOKENS.SignInUseCase, signInUseCase);
  container.registerSingleton(DI_TOKENS.SignUpUseCase, signUpUseCase);
  container.registerSingleton(DI_TOKENS.LogoutUseCase, logoutUseCase);
  container.registerSingleton(DI_TOKENS.VerifyOtpUseCase, verifyOtpUseCase);
  container.registerSingleton(DI_TOKENS.ForgotPasswordUseCase, forgotPasswordUseCase);
  container.registerSingleton(DI_TOKENS.ChangePasswordUseCase, changePasswordUseCase);
  container.registerSingleton(DI_TOKENS.SocialAuthUseCase, socialAuthUseCase);
  container.registerSingleton(DI_TOKENS.ManageSessionsUseCase, manageSessionsUseCase);

  // 4. Profile Use Cases
  container.registerSingleton(DI_TOKENS.GetFarmerProfileUseCase, getFarmerProfileUseCase);
  container.registerSingleton(DI_TOKENS.UpdateFarmerProfileUseCase, updateFarmerProfileUseCase);
  container.registerSingleton(DI_TOKENS.CaptureGpsFarmMapUseCase, captureGpsFarmMapUseCase);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[DIContainer] Enterprise dependencies initialized successfully.');
  }
}
