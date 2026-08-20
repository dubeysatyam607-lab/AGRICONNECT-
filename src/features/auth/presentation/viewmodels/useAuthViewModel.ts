import { useState, useEffect, useCallback } from 'react';
import { IFarmerUser, IDeviceSession } from '../../domain/models/User';
import { inject } from '@/core/di/inject';
import { DI_TOKENS } from '@/core/di/Container';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { SignInUseCase } from '../../domain/usecases/SignInUseCase';
import { SignUpUseCase } from '../../domain/usecases/SignUpUseCase';
import { LogoutUseCase } from '../../domain/usecases/LogoutUseCase';
import { VerifyOtpUseCase } from '../../domain/usecases/VerifyOtpUseCase';
import { ForgotPasswordUseCase } from '../../domain/usecases/ForgotPasswordUseCase';
import { ChangePasswordUseCase } from '../../domain/usecases/ChangePasswordUseCase';
import { SocialAuthUseCase } from '../../domain/usecases/SocialAuthUseCase';
import { ManageSessionsUseCase } from '../../domain/usecases/ManageSessionsUseCase';
import { ErrorHandler } from '@/core/errors/ErrorHandler';
import { snackbarService } from '@/core/services/SnackbarService';
import { useAuth, useOptionalAuth } from '@/hooks/useAuth';

/* useAuthViewModel now consumes the centralized AuthProvider context via
 * useAuth() instead of subscribing to supabase.auth.onAuthStateChange
 * independently. This eliminates the dual-subscription race condition where
 * two separate listeners could get out of sync and cause inconsistent auth
 * state across the application. */

/**
 * Enterprise MVVM Reactive ViewModel for Authentication.
 * Connects UI views to domain use cases with loading animations, error states, and session tracking.
 */

export interface IAuthViewModelState {
  user: IFarmerUser | null;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  isAuthenticated: boolean;
  activeSessions: IDeviceSession[];
}

export interface IAuthViewModelActions {
  signIn: (email: string, pass: string, rememberMe?: boolean) => Promise<boolean>;
  signUp: (email: string, pass: string, fullName: string, phone?: string) => Promise<boolean>;
  sendOtp: (target: string, type: 'phone' | 'email', meta?: { full_name?: string; phone?: string }) => Promise<boolean>;
  verifyOtp: (target: string, token: string, type: 'phone' | 'email') => Promise<boolean>;
  forgotPassword: (identifier: string) => Promise<boolean>;
  changePassword: (oldPass: string, newPass: string, confirmPass: string) => Promise<boolean>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<boolean>;
  fetchActiveSessions: () => Promise<void>;
  signOutFromAllDevices: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export function useAuthViewModel(): [IAuthViewModelState, IAuthViewModelActions] {
  // Use the centralized AuthProvider context when available.
  const authContext = useOptionalAuth();
  const authUser = authContext?.user ?? null;
  const authSession = authContext?.session ?? null;
  const authLoading = authContext?.loading ?? false;

  const [state, setState] = useState<IAuthViewModelState>({
    user: null,
    isLoading: false,
    isInitializing: true,
    error: null,
    isAuthenticated: false,
    activeSessions: [],
  });

  const authRepository = inject<IAuthRepository>(DI_TOKENS.AuthRepository);
  const signInUseCase = inject<SignInUseCase>(DI_TOKENS.SignInUseCase);
  const logoutUseCase = inject<LogoutUseCase>(DI_TOKENS.LogoutUseCase);
  const verifyOtpUseCase = inject<VerifyOtpUseCase>(DI_TOKENS.VerifyOtpUseCase);
  const forgotPasswordUseCase = inject<ForgotPasswordUseCase>(DI_TOKENS.ForgotPasswordUseCase);
  const changePasswordUseCase = inject<ChangePasswordUseCase>(DI_TOKENS.ChangePasswordUseCase);
  const socialAuthUseCase = inject<SocialAuthUseCase>(DI_TOKENS.SocialAuthUseCase);
  const manageSessionsUseCase = inject<ManageSessionsUseCase>(DI_TOKENS.ManageSessionsUseCase);

  // Sync with centralized auth state from AuthProvider
  useEffect(() => {
    if (authLoading) return; // Wait for auth to resolve

    // Map Supabase User to IFarmerUser for the ViewModel
    const mappedUser: IFarmerUser | null = authUser ? {
      id: authUser.id,
      email: authUser.email || '',
      fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Farmer',
      phone: authUser.user_metadata?.phone || '',
      avatarUrl: authUser.user_metadata?.avatar_url,
      role: (authUser.user_metadata?.role as any) || 'farmer',
      isEmailVerified: !!authUser.email_confirmed_at,
      isPhoneVerified: !!authUser.phone_confirmed_at,
      createdAt: authUser.created_at || new Date().toISOString(),
    } : null;

    setState(prev => ({
      ...prev,
      user: mappedUser,
      isAuthenticated: !!mappedUser,
      isInitializing: false,
    }));
  }, [authUser, authLoading]);

  const signIn = useCallback(async (email: string, pass: string, rememberMe: boolean = true): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const session = await signInUseCase.execute(email, pass, rememberMe);
      setState(prev => ({
        ...prev,
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
      }));
      snackbarService.success('Welcome back to AgriConnect!');
      return true;
    } catch (e: any) {
      const appEx = ErrorHandler.handle(e);
      setState(prev => ({ ...prev, isLoading: false, error: appEx.toUserFriendlyMessage() }));
      snackbarService.error(appEx.toUserFriendlyMessage(), 'Sign In Failed');
      return false;
    }
  }, [signInUseCase]);

  const signUp = useCallback(async (email: string, _pass: string, fullName: string, phone?: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await verifyOtpUseCase.sendOtp(email, 'email', { full_name: fullName, phone });
      setState(prev => ({ ...prev, isLoading: false }));
      snackbarService.success('Verification OTP sent. Please verify to complete registration.');
      return true;
    } catch (e: any) {
      const appEx = ErrorHandler.handle(e);
      setState(prev => ({ ...prev, isLoading: false, error: appEx.toUserFriendlyMessage() }));
      snackbarService.error(appEx.toUserFriendlyMessage(), 'Registration Failed');
      return false;
    }
  }, [verifyOtpUseCase]);

  const sendOtp = useCallback(async (target: string, type: 'phone' | 'email', meta?: { full_name?: string; phone?: string }): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await verifyOtpUseCase.sendOtp(target, type, meta);
      setState(prev => ({ ...prev, isLoading: false }));
      snackbarService.success(`Verification OTP sent to your ${type === 'phone' ? 'mobile number' : 'email'}.`);
      return true;
    } catch (e: any) {
      const appEx = ErrorHandler.handle(e);
      setState(prev => ({ ...prev, isLoading: false, error: appEx.toUserFriendlyMessage() }));
      snackbarService.error(appEx.toUserFriendlyMessage(), 'Failed to send OTP');
      return false;
    }
  }, [verifyOtpUseCase]);

  const verifyOtp = useCallback(async (target: string, token: string, type: 'phone' | 'email'): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const session = await verifyOtpUseCase.execute(target, token, type);
      setState(prev => ({
        ...prev,
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
      }));
      snackbarService.success('OTP Verified successfully!');
      return true;
    } catch (e: any) {
      const appEx = ErrorHandler.handle(e);
      setState(prev => ({ ...prev, isLoading: false, error: appEx.toUserFriendlyMessage() }));
      snackbarService.error(appEx.toUserFriendlyMessage(), 'Verification Failed');
      return false;
    }
  }, [verifyOtpUseCase]);

  const forgotPassword = useCallback(async (identifier: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await forgotPasswordUseCase.execute(identifier);
      setState(prev => ({ ...prev, isLoading: false }));
      snackbarService.success('Password recovery instructions sent! Check your inbox or SMS.');
      return true;
    } catch (e: any) {
      const appEx = ErrorHandler.handle(e);
      setState(prev => ({ ...prev, isLoading: false, error: appEx.toUserFriendlyMessage() }));
      snackbarService.error(appEx.toUserFriendlyMessage(), 'Recovery Failed');
      return false;
    }
  }, [forgotPasswordUseCase]);

  const changePassword = useCallback(async (oldPass: string, newPass: string, confirmPass: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await changePasswordUseCase.execute(oldPass, newPass, confirmPass);
      setState(prev => ({ ...prev, isLoading: false }));
      snackbarService.success('Password changed securely!');
      return true;
    } catch (e: any) {
      const appEx = ErrorHandler.handle(e);
      setState(prev => ({ ...prev, isLoading: false, error: appEx.toUserFriendlyMessage() }));
      snackbarService.error(appEx.toUserFriendlyMessage(), 'Password Update Failed');
      return false;
    }
  }, [changePasswordUseCase]);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple'): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await socialAuthUseCase.execute(provider);
      setState(prev => ({ ...prev, isLoading: false }));
      return true;
    } catch (e: any) {
      const appEx = ErrorHandler.handle(e);
      setState(prev => ({ ...prev, isLoading: false, error: appEx.toUserFriendlyMessage() }));
      snackbarService.error(appEx.toUserFriendlyMessage(), `${provider.toUpperCase()} Login Failed`);
      return false;
    }
  }, [socialAuthUseCase]);

  const fetchActiveSessions = useCallback(async (): Promise<void> => {
    try {
      const sessions = await manageSessionsUseCase.getActiveSessions();
      setState(prev => ({ ...prev, activeSessions: sessions }));
    } catch (e) {
      console.warn('[useAuthViewModel] Failed to fetch sessions', e);
    }
  }, [manageSessionsUseCase]);

  const signOutFromAllDevices = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await manageSessionsUseCase.signOutFromAllDevices();
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        activeSessions: [],
      }));
      snackbarService.show('Signed out from all devices globally.');
    } catch (e) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [manageSessionsUseCase]);

  const logout = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await logoutUseCase.execute();
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        activeSessions: [],
      }));
      snackbarService.show('You have been signed out.');
    } catch (e) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [logoutUseCase]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return [
    state,
    {
      signIn,
      signUp,
      sendOtp,
      verifyOtp,
      forgotPassword,
      changePassword,
      signInWithOAuth,
      fetchActiveSessions,
      signOutFromAllDevices,
      logout,
      clearError,
    },
  ];
}
