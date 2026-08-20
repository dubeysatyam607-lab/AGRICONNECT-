import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { FaGoogle as Google } from 'react-icons/fa';
import { Logo } from '@/components/ui/Logo';
import { AppButton } from '@/shared/widgets/AppButton';
import { FadeIn, SlideUp } from '@/shared/widgets/AppAnimations';
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <div className="flex flex-1 flex-col lg:flex-row justify-center items-center max-w-6xl mx-auto px-4 py-12 gap-8">
        {/* Left branding panel */}
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-6">
          {!imageError ? (
            <img
              src={brandingImage}
              alt={hi ? 'कृषि तकनीक' : 'Farming Innovation'}
              className="w-full max-w-sm rounded-xl shadow-lg object-cover aspect-video lg:aspect-square"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full max-w-sm aspect-square bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-lg flex flex-col items-center justify-center p-6">
              <ShieldCheck size={48} className="text-emerald-600 dark:text-emerald-400 mb-3" />
              <span className="text-lg font-bold text-emerald-800 dark:text-emerald-300">AgriConnect</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                {hi ? 'सुरक्षित कृषि नेटवर्क' : 'Secure Farming Network'}
              </span>
            </div>
          )}
          <h2 className="mt-6 text-2xl font-extrabold text-emerald-800">
            {hi ? 'कृषि के भविष्य में आपका स्वागत है' : 'Welcome to the Future of Farming'}
          </h2>
          <p className="mt-2 text-center text-sm text-emerald-700">
            {hi
              ? 'स्मार्ट अंतर्दृष्टि, रियल‑टाइम मंडी मूल्य, और AI‑सहाय्यक खेती'
              : 'Smart insights, real‑time market prices, and AI‑assisted farming'}
          </p>
        </div>

        {/* Right auth card */}
        <div className="flex-1 w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/30 border border-white/20 rounded-xl shadow-xl p-8">
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
              <div className="flex flex-col items-center gap-4">
                <div className="mx-auto w-fit">
                  <Logo size={72} className="drop-shadow-lg" />
                </div>
                <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground">
                  {hi ? 'एग्रीकनेक्ट में आपका स्वागत है' : 'Welcome to AgriConnect'}
                </h1>
                <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                  {hi ? 'भारत के विश्वसनीय कृषि नेटवर्क से जुड़ें' : 'Sign in to access Mandi prices, AI crop advice & farm management'}
                </p>
                <AppButton
                  variant="outline"
                  size="lg"
                  fullWidth
                  onClick={() => signInWithOAuth('google')}
                  isLoading={state.isLoading}
                  disabled={state.isLoading}
                  leftIcon={<Google size={18} className="text-[#4285F4]" />}
                  className="mb-4 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {hi ? 'Google के साथ जारी रखें' : 'Continue with Google'}
                </AppButton>
              </div>
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
                // Email + OTP Login Form
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
                // Email + Password Form
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
              <a href="/terms" className="font-bold underline-offset-2 hover:underline">{hi ? 'सेवा शर्तों' : 'Terms'}</a> &amp;{' '}
              <a href="/privacy-policy" className="font-bold underline-offset-2 hover:underline">{hi ? 'गोपनीयता नीति' : 'Privacy Policy'}</a>
            </p>
          </SlideUp>
        </div>
      </div>
    </div>
  );
};
