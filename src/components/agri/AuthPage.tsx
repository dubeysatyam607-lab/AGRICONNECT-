import React, { useState } from 'react';
import { LoginView } from '@/features/auth/presentation/views/LoginView';
import { SignUpView } from '@/features/auth/presentation/views/SignUpView';
import { OtpVerificationView } from '@/features/auth/presentation/views/OtpVerificationView';
import { ForgotPasswordView } from '@/features/auth/presentation/views/ForgotPasswordView';

interface AuthPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

type AuthStep = 'login' | 'signup' | 'otp' | 'forgot';

export const AuthPage: React.FC<AuthPageProps> = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState<AuthStep>('login');
  const [otpTarget, setOtpTarget] = useState('');
  const [otpType, setOtpType] = useState<'phone' | 'email'>('email');

  const handleSwitchToOtp = (target: string, type: 'phone' | 'email') => {
    setOtpTarget(target);
    setOtpType(type);
    setStep('otp');
  };

  switch (step) {
    case 'signup':
      return (
        <SignUpView
          onSwitchToSignIn={() => setStep('login')}
          onSwitchToOtp={handleSwitchToOtp}
          onSuccess={onSuccess}
        />
      );

    case 'otp':
      return (
        <OtpVerificationView
          target={otpTarget}
          type={otpType}
          onSuccess={onSuccess}
          onBack={() => setStep('login')}
        />
      );

    case 'forgot':
      return (
        <ForgotPasswordView
          onBackToLogin={() => setStep('login')}
        />
      );

    case 'login':
    default:
      return (
        <LoginView
          onSwitchToSignUp={() => setStep('signup')}
          onSwitchToForgot={() => setStep('forgot')}
          onSwitchToOtp={handleSwitchToOtp}
          onSuccess={onSuccess}
          onBack={onBack}
        />
      );
  }
};

export default AuthPage;
