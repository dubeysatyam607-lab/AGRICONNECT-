import React from 'react';
import { WelcomeFlow } from '@/features/auth/presentation/WelcomeFlow';

/**
 * Authentication Page Wrapper.
 * Hosts the premium WelcomeFlow (Splash → Language → Onboarding → Login/OTP → Profile Setup).
 */
export const Login: React.FC = () => {
  return <WelcomeFlow />;
};

export default Login;
