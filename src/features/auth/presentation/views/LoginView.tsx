import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { FaGoogle as Google } from 'react-icons/fa';
import { Logo } from '@/components/ui/Logo';
import { AppButton } from '@/shared/widgets/AppButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import brandingImage from '@/assets/auth_branding_illustration.jpg';

import { useAuthViewModel } from '../viewmodels/useAuthViewModel';

interface ILoginViewProps {
  onSwitchToSignUp: () => void;
  onSwitchToForgot: () => void;
  onSwitchToOtp: (target: string, type: 'phone' | 'email') => void;
  onSuccess: () => void;
  onBack?: () => void;
}

export const LoginView: React.FC<ILoginViewProps> = ({
  onSwitchToSignUp,
  onSwitchToForgot,
  onSwitchToOtp,
  onSuccess,
  onBack,
}) => {
  const { t, language } = useLanguage();
  const hi = language === 'hi';

  const [usePassword, setUsePassword] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const [state, { signIn, sendOtp, clearError, signInWithOAuth }] = useAuthViewModel();

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldError(null);

    if (!email || !email.includes('@')) {
      setFieldError(hi ? 'कृपया वैध ईमेल पता दर्ज करें' : 'Please enter a valid email address');
      return;
    }

    const success = await sendOtp(email.trim(), 'email');
    if (success) {
      onSwitchToOtp(email.trim(), 'email');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldError(null);

    if (!email || !email.includes('@')) {
      setFieldError(hi ? 'कृपया वैध ईमेल पता दर्ज करें' : 'Please enter a valid email address');
      return;
    }
    if (!password) {
      setFieldError(hi ? 'कृपया अपना पासवर्ड दर्ज करें' : 'Please enter your password');
      return;
    }

    const success = await signIn(email.trim(), password, rememberMe);
    if (success) {
      onSuccess();
    }
  };

  const inputClass =
    'w-full rounded-lg border border-border bg-card pl-11 pr-4 py-3 type-body text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors';

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector />
      </div>
      <div className="flex flex-1 flex-col lg:flex-row justify-center items-center max-w-6xl mx-auto px-4 py-12 gap-10">
        {/* Left branding panel */}
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-6">
          {!imageError ? (
            <img
              src={brandingImage}
              alt={hi ? 'कृषि तकनीक' : 'Farming Innovation'}
              className="w-full max-w-sm rounded-xl border border-border object-cover aspect-square"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full max-w-sm aspect-square bg-card border border-border rounded-xl flex flex-col items-center justify-center p-6">
              <ShieldCheck size={44} className="text-primary mb-3" aria-hidden="true" />
              <span className="type-h2">AgriConnect</span>
              <span className="type-small text-muted-foreground mt-1">
                {t('auth.secureNetwork') || 'Secure Farming Network'}
              </span>
            </div>
          )}
          <h2 className="mt-6 type-h1 text-center">
            {t('auth.futureOfFarming') || 'Welcome to the Future of Farming'}
          </h2>
          <p className="mt-2 text-center type-body text-muted-foreground max-w-sm">
            {t('auth.tagline') || 'Smart insights, real-time market prices, and AI-assisted farming'}
          </p>
        </div>

        {/* Right auth card */}
        <div className="flex-1 w-full max-w-md">
          <div className="bg-card border border-border rounded-xl p-8">
            <div className="flex items-center justify-between">
              {onBack ? (
                <button
                  onClick={onBack}
                  className="rounded-lg px-3 py-1.5 type-small font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {t('common.back')}
                </button>
              ) : (
                <div />
              )}
              <span className="flex items-center gap-1 type-label text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                <ShieldCheck size={13} aria-hidden="true" /> {t('auth.encryptionBadge') || '256-Bit Secure'}
              </span>
            </div>

            {/* Logo & Welcome Header */}
            <div className="mt-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <Logo size={64} />
                <h1 className="type-h1">
                  {t('auth.login.welcomeTitle')}
                </h1>
                <p className="type-small text-muted-foreground">
                  {t('auth.login.welcomeSubtitle')}
                </p>
                <AppButton
                  variant="outline"
                  size="lg"
                  fullWidth
                  onClick={() => signInWithOAuth('google')}
                  isLoading={state.isLoading}
                  disabled={state.isLoading}
                  leftIcon={<Google size={18} className="text-[#4285F4]" />}
                  className="mt-2 bg-card border border-border text-foreground hover:bg-muted"
                >
                  {t('auth.login.continueWithGoogle')}
                </AppButton>
              </div>
            </div>

            {/* Segmented tab control (Email OTP vs Email/Password) */}
            <div className="mt-6">
              <div className="grid grid-cols-2 p-1 rounded-lg bg-muted">
                <button
                  type="button"
                  onClick={() => { setUsePassword(false); setFieldError(null); clearError(); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md type-small font-semibold transition-colors ${
                    !usePassword
                      ? 'bg-card text-foreground border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Mail size={14} aria-hidden="true" />
                  {t('auth.login.tabEmailOtp')}
                </button>
                <button
                  type="button"
                  onClick={() => { setUsePassword(true); setFieldError(null); clearError(); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-md type-small font-semibold transition-colors ${
                    usePassword
                      ? 'bg-card text-foreground border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Lock size={14} aria-hidden="true" />
                  {t('auth.login.tabPassword')}
                </button>
              </div>
            </div>

            {/* Form Container */}
            <div className="mt-6">
              {fieldError && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/25 type-small font-semibold text-destructive">
                  {fieldError}
                </div>
              )}
              {state.error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/25 type-small font-semibold text-destructive">
                  {state.error}
                </div>
              )}

              {!usePassword ? (
                // Email + OTP Login Form
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block type-label text-muted-foreground">
                      {t('auth.login.emailLabel')}
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <input
                        type="email"
                        aria-label={t('auth.login.emailLabel')}
                        required
                        autoComplete="email"
                        placeholder="farmer@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <AppButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={state.isLoading}
                    rightIcon={<ArrowRight size={16} />}
                  >
                    {t('auth.login.sendEmailOtp')}
                  </AppButton>
                </form>
              ) : (
                // Email + Password Form
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block type-label text-muted-foreground">
                      {t('auth.login.emailLabel')}
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <input
                        type="email"
                        aria-label={t('auth.login.emailLabel')}
                        required
                        autoComplete="email"
                        placeholder="farmer@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block type-label text-muted-foreground">
                        {t('auth.login.tabPassword')}
                      </label>
                      <button
                        type="button"
                        onClick={onSwitchToForgot}
                        className="type-small font-semibold text-primary hover:underline"
                      >
                        {t('auth.login.forgotPassword')}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        aria-label={t('auth.login.tabPassword')}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClass} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none type-small font-semibold text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                      />
                      {t('auth.login.rememberMe')}
                    </label>
                  </div>

                  <AppButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={state.isLoading}
                    rightIcon={<ArrowRight size={16} />}
                  >
                    {t('auth.login.signInButton')}
                  </AppButton>
                </form>
              )}
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 space-y-4 text-center">
            <p className="type-small text-muted-foreground">
              {t('auth.login.newToAgriconnect')}{' '}
              <button onClick={onSwitchToSignUp} className="font-semibold text-primary hover:underline ml-1">
                {t('auth.login.createAccount')}
              </button>
            </p>

            <p className="type-meta text-muted-foreground">
              {t('auth.agreeTerms') || 'By signing in, you agree to our'}{' '}
              <Link to="/terms" className="font-semibold underline underline-offset-2">{t('nav.terms') || 'Terms'}</Link> &amp;{' '}
              <Link to="/privacy-policy" className="font-semibold underline underline-offset-2">{t('nav.privacy') || 'Privacy Policy'}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
