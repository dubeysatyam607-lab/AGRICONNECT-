import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { AppButton } from '@/shared/widgets/AppButton';
import { FadeIn, SlideUp } from '@/shared/widgets/AppAnimations';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/common/LanguageSelector';

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

  const [usePassword, setUsePassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [state, { signIn, sendOtp, clearError }] = useAuthViewModel();

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

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col justify-between">
        <LanguageSelector />
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -left-24 bottom-1/4 h-80 w-80 rounded-full bg-teal-500/10 blur-[100px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-6 py-8">
        {/* Top Header Bar */}
        <div>
          <div className="flex items-center justify-between">
            {onBack ? (
              <button
                onClick={onBack}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
              >
                {t('common.back')}
              </button>
            ) : (
              <div />
            )}
            <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck size={13} /> {hi ? 'सुरक्षित 256-बिट एन्क्रिप्शन' : '256-Bit Secure'}
            </span>
          </div>

          {/* Logo & Welcome Header */}
          <FadeIn className="mt-8 text-center">
            <div className="mx-auto w-fit">
              <Logo size={72} className="drop-shadow-lg" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground">
              {hi ? 'एग्रीकनेक्ट में आपका स्वागत है' : 'Welcome to AgriConnect'}
            </h1>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">
              {hi ? 'भारत के विश्वसनीय कृषि नेटवर्क से जुड़ें' : 'Sign in to access Mandi prices, AI crop advice & farm management'}
            </p>
          </FadeIn>

          {/* Clean Segmented Tab Control (Email OTP vs Email/Password) */}
          <FadeIn delayMs={80} className="mt-6">
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => { setUsePassword(false); setFieldError(null); clearError(); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  !usePassword
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mail size={14} />
                {hi ? 'ईमेल + ओटीपी' : 'Email + OTP'}
              </button>
              <button
                type="button"
                onClick={() => { setUsePassword(true); setFieldError(null); clearError(); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  usePassword
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock size={14} />
                {hi ? 'पासवर्ड' : 'Password'}
              </button>
            </div>
          </FadeIn>

          {/* Form Container */}
          <FadeIn delayMs={120} className="mt-6">
            {fieldError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-shake">
                ⚠️ {fieldError}
              </div>
            )}
            {state.error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-shake">
                ⚠️ {state.error}
              </div>
            )}

            {!usePassword ? (
              /* Email + OTP Login Form */
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {hi ? 'ईमेल पता' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      aria-label={hi ? 'ईमेल पता' : 'Email Address'}
                      required
                      autoComplete="email"
                      placeholder="farmer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card pl-11 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all"
                      autoFocus
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
                  {hi ? 'ईमेल ओटीपी भेजें' : 'Send Email OTP'}
                </AppButton>
              </form>
            ) : (
              /* Email + Password Form */
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {hi ? 'ईमेल पता' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      aria-label={hi ? 'ईमेल पता' : 'Email Address'}
                      required
                      autoComplete="email"
                      placeholder="farmer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card pl-11 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                      {hi ? 'पासवर्ड' : 'Password'}
                    </label>
                    <button
                      type="button"
                      onClick={onSwitchToForgot}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      {hi ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      aria-label={hi ? 'पासवर्ड' : 'Password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card pl-11 pr-12 py-3 text-sm font-bold text-foreground outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all"
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
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                    {hi ? 'मुझे याद रखें' : 'Remember Me'}
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
                  {hi ? 'साइन इन करें' : 'Sign In'}
                </AppButton>
              </form>
            )}
          </FadeIn>
        </div>

        {/* Footer Navigation */}
        <SlideUp delayMs={200} className="mt-8 space-y-4 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            {hi ? 'क्या आपका खाता नहीं है?' : 'New to AgriConnect?'}{' '}
            <button onClick={onSwitchToSignUp} className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline ml-1">
              {hi ? 'नया खाता बनाएं' : 'Create Account'}
            </button>
          </p>

          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            {hi ? 'साइन इन करने पर आप हमारी' : 'By signing in, you agree to our'}{' '}
            <a href="/terms" className="font-bold underline-offset-2 hover:underline">{hi ? 'सेवा शर्तों' : 'Terms'}</a> &{' '}
            <a href="/privacy-policy" className="font-bold underline-offset-2 hover:underline">{hi ? 'गोपनीयता नीति' : 'Privacy Policy'}</a>
          </p>
        </SlideUp>
      </div>
    </div>
  );
};
