import React from 'react';
import { WelcomeFlow } from '@/features/auth/presentation/WelcomeFlow';
import { SeoHead } from '@/components/seo/SeoHead';

/**
 * Authentication Page Wrapper.
 * Hosts the premium WelcomeFlow (Splash → Language → Onboarding → Login/OTP → Profile Setup).
 */
export const Login: React.FC = () => {
  return (
    <>
      <SeoHead
        title="Sign In — AgriConnect"
        description="Sign in to AgriConnect to access live mandi prices, AI crop doctor, weather forecasts and government schemes."
        noindex
      />
      <WelcomeFlow />
    </>
  );
};

export default Login;
