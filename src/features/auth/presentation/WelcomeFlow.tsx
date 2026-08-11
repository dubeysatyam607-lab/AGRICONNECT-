import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SplashView } from './views/SplashView';
import { LoginView } from './views/LoginView';
import { SignUpView } from './views/SignUpView';
import { OtpVerificationView } from './views/OtpVerificationView';
import { ForgotPasswordView } from './views/ForgotPasswordView';
import { FarmOnboardingFlow } from './onboarding/FarmOnboardingFlow';
import { useAuthViewModel } from './viewmodels/useAuthViewModel';
import { hasOnboardingData } from './onboarding/onboardingData';

/**
 * Premium Welcome / Authentication Flow Orchestrator.
 * Splash → Personalized Farm Onboarding (8 steps, AI-ready) → Auth
 * (Login/Signup/OTP) → Dashboard. Returning farmers skip straight to login.
 */
type FlowStep = 'splash' | 'onboarding' | 'login' | 'signup' | 'otp' | 'forgot' | 'done';

const ONBOARDING_FLAG = 'agri_onboarding_seen';
const PROFILE_FLAG = 'agri_profile_complete';

const isFlagSet = (key: string) => typeof window !== 'undefined' && localStorage.getItem(key) === 'true';

export const WelcomeFlow: React.FC = () => {
  const navigate = useNavigate();
  const [state] = useAuthViewModel();
  const [step, setStep] = useState<FlowStep>('splash');
  const [otpTarget, setOtpTarget] = useState('');
  const [otpType, setOtpType] = useState<'phone' | 'email'>('phone');

  useEffect(() => {
    if (step === 'done') {
      navigate('/', { replace: true });
    }
  }, [step, navigate]);

  const handleSplashFinish = (isAuthenticated: boolean) => {
    if (isAuthenticated) {
      setStep(isFlagSet(PROFILE_FLAG) ? 'done' : 'onboarding');
      return;
    }
    // Returning farmers who already completed the journey skip straight to login.
    if (isFlagSet(ONBOARDING_FLAG) && hasOnboardingData()) {
      setStep('login');
      return;
    }
    setStep('onboarding');
  };

  const handleOnboardingComplete = () => {
    setStep(state.isAuthenticated ? 'done' : 'login');
  };

  const handleAuthSuccess = () => {
    setStep('done');
  };

  const handleSwitchToOtp = (target: string, type: 'phone' | 'email') => {
    setOtpTarget(target);
    setOtpType(type);
    setStep('otp');
  };

  const handleGuest = () => {
    setStep('done');
  };

  switch (step) {
    case 'splash':
      return <SplashView onFinish={handleSplashFinish} />;

    case 'onboarding':
      return <FarmOnboardingFlow onComplete={handleOnboardingComplete} />;

    case 'signup':
      return (
        <SignUpView
          onSwitchToSignIn={() => setStep('login')}
          onSwitchToOtp={handleSwitchToOtp}
          onSuccess={handleAuthSuccess}
        />
      );

    case 'otp':
      return (
        <OtpVerificationView
          target={otpTarget}
          type={otpType}
          onSuccess={handleAuthSuccess}
          onBack={() => setStep('login')}
        />
      );

    case 'forgot':
      return (
        <ForgotPasswordView
          onBackToLogin={() => setStep('login')}
        />
      );

    case 'done':
      return null;

    case 'login':
    default:
      return (
        <LoginView
          onSwitchToSignUp={() => setStep('signup')}
          onSwitchToForgot={() => setStep('forgot')}
          onSwitchToOtp={handleSwitchToOtp}
          onSuccess={handleAuthSuccess}
          onGuest={handleGuest}
          onBack={() => setStep('onboarding')}
        />
      );
  }
};
