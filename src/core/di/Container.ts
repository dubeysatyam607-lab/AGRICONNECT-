/**
 * Enterprise Dependency Injection Tokens & Container.
 * Manages inversion of control (IoC) and dependency resolution across the application.
 */

export const DI_TOKENS = {
  // Infrastructure
  SecureStorage: Symbol.for('SecureStorage'),
  DioClient: Symbol.for('DioClient'),
  ConnectivityMonitor: Symbol.for('ConnectivityMonitor'),
  AnalyticsService: Symbol.for('AnalyticsService'),
  CrashLoggingService: Symbol.for('CrashLoggingService'),
  AppLifecycleManager: Symbol.for('AppLifecycleManager'),

  // Auth Domain
  AuthRepository: Symbol.for('AuthRepository'),
  SignInUseCase: Symbol.for('SignInUseCase'),
  SignUpUseCase: Symbol.for('SignUpUseCase'),
  LogoutUseCase: Symbol.for('LogoutUseCase'),
  VerifyOtpUseCase: Symbol.for('VerifyOtpUseCase'),
  ForgotPasswordUseCase: Symbol.for('ForgotPasswordUseCase'),
  ChangePasswordUseCase: Symbol.for('ChangePasswordUseCase'),
  SocialAuthUseCase: Symbol.for('SocialAuthUseCase'),
  ManageSessionsUseCase: Symbol.for('ManageSessionsUseCase'),

  // Profile Domain
  ProfileRepository: Symbol.for('ProfileRepository'),
  GetFarmerProfileUseCase: Symbol.for('GetFarmerProfileUseCase'),
  UpdateFarmerProfileUseCase: Symbol.for('UpdateFarmerProfileUseCase'),
  CaptureGpsFarmMapUseCase: Symbol.for('CaptureGpsFarmMapUseCase'),

  // Weather Domain
  WeatherRepository: Symbol.for('WeatherRepository'),
};

type Factory<T> = () => T;

export class DIContainer {
  private static instance: DIContainer;
  private services: Map<symbol, any> = new Map();
  private factories: Map<symbol, Factory<any>> = new Map();

  private constructor() {}

  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Registers a singleton instance in the DI container.
   */
  public registerSingleton<T>(token: symbol, instance: T): void {
    this.services.set(token, instance);
  }

  /**
   * Registers a transient factory in the DI container.
   */
  public registerFactory<T>(token: symbol, factory: Factory<T>): void {
    this.factories.set(token, factory);
  }

  /**
   * Resolves a dependency by token.
   */
  public resolve<T>(token: symbol): T {
    if (this.services.has(token)) {
      return this.services.get(token);
    }

    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      return factory();
    }

    throw new Error(`[DIContainer] Dependency not registered for token: ${token.toString()}`);
  }

  /**
   * Clears all registered dependencies (useful for testing and reset).
   */
  public reset(): void {
    this.services.clear();
    this.factories.clear();
  }
}

export const container = DIContainer.getInstance();
