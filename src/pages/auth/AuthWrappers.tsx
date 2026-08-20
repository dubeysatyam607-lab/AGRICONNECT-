import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginView } from '@/features/auth/presentation/views/LoginView';
import { SignUpView } from '@/features/auth/presentation/views/SignUpView';
import { OtpVerificationView } from '@/features/auth/presentation/views/OtpVerificationView';
import { ForgotPasswordView } from '@/features/auth/presentation/views/ForgotPasswordView';
import { ChangePasswordView } from '@/features/auth/presentation/views/ChangePasswordView';
import { useAuth } from '@/hooks/useAuth';

/** Sanitize a redirect path to prevent open-redirect attacks.
 *  Only allows relative paths starting with '/' and blocks protocol-relative URLs. */
function sanitizeRedirectPath(path: string | undefined): string {
  if (!path || typeof path !== 'string') return '/';
  // Must start with '/' and not be '//' (protocol-relative) or contain '://'
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return '/';
  }
  // Normalize to prevent path traversal (e.g., /../../../etc)
  try {
    const normalized = new URL(path, window.location.origin).pathname;
    return normalized.startsWith('/') ? normalized : '/';
  } catch {
    return '/';
  }
}

/** Wrapper page for Login */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1F14] text-white">
        <span className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleSuccess = () => {
    const raw = (location.state as { from?: string })?.from;
    const safePath = sanitizeRedirectPath(raw);
    navigate(safePath, { replace: true });
  };
  return (
    <LoginView
      onSwitchToSignUp={() => navigate('/auth/register')}
      onSwitchToForgot={() => navigate('/auth/forgot')}
      onSwitchToOtp={(target, type) => navigate('/auth/otp', { state: { target, type } })}
      onSuccess={handleSuccess}
    />
  );
};

/** Wrapper page for Register */
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1F14] text-white">
        <span className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleSuccess = () => navigate('/', { replace: true });
  return (
    <SignUpView
      onSwitchToSignIn={() => navigate('/auth/login')}
      onSwitchToOtp={(target, type) => navigate('/auth/otp', { state: { target, type } })}
      onSuccess={handleSuccess}
    />
  );
};

/** Wrapper page for OTP verification */
export const OtpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as { target?: string; type?: 'phone' | 'email' };
  const target = state.target ?? '';
  const type = state.type ?? 'email';
  const handleSuccess = () => navigate('/', { replace: true });
  const handleBack = () => navigate('/auth/login');

  // If no target (direct navigation / page refresh), redirect to login
  React.useEffect(() => {
    if (!target) {
      navigate('/auth/login', { replace: true });
    }
  }, [target, navigate]);

  if (!target) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1F14] text-white">
        <span className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <OtpVerificationView
      target={target}
      type={type}
      onSuccess={handleSuccess}
      onBack={handleBack}
    />
  );
};

/** Wrapper page for Forgot Password */
export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const handleSuccess = () => navigate('/auth/login');
  const handleBack = () => navigate('/auth/login');
  return (
    <ForgotPasswordView
      onSuccess={handleSuccess}
      onBackToLogin={handleBack}
    />
  );
};

/** Wrapper page for Change/Reset Password (used after email link) */
export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  // Supabase puts tokens in the hash fragment (#access_token=...), not query params
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const queryParams = new URLSearchParams(window.location.search);
  const token = hashParams.get('access_token') ?? queryParams.get('access_token') ?? '';
  const type = (hashParams.get('type') ?? queryParams.get('type') as 'recovery' | 'magiclink') ?? 'recovery';
  const handleSuccess = () => navigate('/auth/login');
  return (
    <ChangePasswordView
      token={token}
      type={type}
      onSuccess={handleSuccess}
    />
  );
};
