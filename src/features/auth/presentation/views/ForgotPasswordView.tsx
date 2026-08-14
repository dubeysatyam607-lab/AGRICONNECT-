import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, RotateCw, ShieldCheck } from 'lucide-react';
import { AppButton } from '@/shared/widgets/AppButton';
import { FadeIn } from '@/shared/widgets/AppAnimations';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';

interface IForgotPasswordViewProps {
  onBackToLogin: () => void;
  onSuccess: () => void;
}

/**
 * Forgot Password = Sign in with Email OTP.
 * AgriConnect authenticates via passwordless email OTP, so account recovery
 * is an email-OTP sign-in: OTP is sent, verified against Supabase, an
 * authenticated session is created, and the user lands on the Dashboard.
 */
export const ForgotPasswordView: React.FC<IForgotPasswordViewProps> = ({ onBackToLogin, onSuccess }) => {
  const { t, language } = useLanguage();
  const hi = language === 'hi';

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(5 * 60);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [state, { sendOtp, verifyOtp, clearError }] = useAuthViewModel();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === 'verify' && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldError(null);

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setFieldError(hi ? 'कृपया अपना ईमेल पता दर्ज करें' : 'Please enter your email address');
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(normalized)) {
      setFieldError(hi ? 'कृपया वैध ईमेल पता दर्ज करें' : 'Please enter a valid email address');
      return;
    }

    const success = await sendOtp(normalized, 'email');
    if (success) {
      setEmail(normalized);
      setTimer(5 * 60);
      setStep('verify');
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldError(null);

    const token = otp.trim();
    if (token.length !== 6) {
      setFieldError(hi ? 'कृपया 6 अंकों का कोड दर्ज करें' : 'Please enter the 6-digit code');
      return;
    }

    const success = await verifyOtp(email, token, 'email');
    if (success) {
      onSuccess();
    }
  };

  const handleResend = async () => {
    if (timer > 0 || state.isLoading) return;
    clearError();
    const success = await sendOtp(email, 'email');
    if (success) setTimer(5 * 60);
  };

  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col justify-between">
      {/* Ambient background wash */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[28rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[110px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-6 py-8">
        <div>
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToLogin}
              className="flex items-center gap-1 text-xs font-extrabold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} /> {t('common.back')}
            </button>
            <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <ShieldCheck size={13} /> {hi ? 'ईमेल ओटीपी साइन इन' : 'Email OTP Sign In'}
            </span>
          </div>

          {/* Header */}
          <FadeIn className="mt-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-md">
              <Mail size={28} />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground">
              {hi ? 'ईमेल से साइन इन करें' : 'Sign In with Email OTP'}
            </h1>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">
              {step === 'request'
                ? (hi ? 'अपना पंजीकृत ईमेल दर्ज करें। हम आपको एक सत्यापन कोड भेजेंगे।' : 'Enter your registered email. We will send you a verification code.')
                : (hi ? `${email} पर एक 6 अंकों का कोड भेजा गया है` : `A 6-digit code has been sent to ${email}`)}
            </p>
          </FadeIn>

          {/* Error Banner */}
          {(fieldError || state.error) && (
            <div className="mt-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-shake">
              ⚠️ {fieldError || state.error}
            </div>
          )}

          {/* Wizard Steps */}
          <FadeIn delayMs={120} className="mt-6">
            {step === 'request' && (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {hi ? 'ईमेल पता' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      aria-label={hi ? 'ईमेल पता' : 'Email Address'}
                      autoComplete="email"
                      placeholder="farmer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card pl-11 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <AppButton type="submit" variant="primary" size="lg" fullWidth isLoading={state.isLoading}>
                  {hi ? 'सत्यापन कोड भेजें' : 'Send Verification Code'}
                </AppButton>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {hi ? 'सत्यापन कोड' : 'Verification Code'}
                  </label>
                  <input
                    type="text"
                    aria-label={hi ? 'सत्यापन कोड' : 'Verification Code'}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest text-lg font-black rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card py-3 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all"
                    autoFocus
                  />
                </div>

                <AppButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={state.isLoading}
                  disabled={otp.length !== 6}
                >
                  {hi ? 'सत्यापित करें और साइन इन करें' : 'Verify & Sign In'}
                </AppButton>

                {/* Resend OTP & Change Email */}
                <div className="flex flex-col items-center gap-2.5 pt-1">
                  {timer > 0 ? (
                    <span className="text-xs font-bold text-muted-foreground">
                      {hi ? `कोड पुनः भेजें (${mm}:${ss})` : `Resend code in ${mm}:${ss}`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={state.isLoading}
                      className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      <RotateCw size={13} /> {hi ? 'कोड पुनः भेजें' : 'Resend Code'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { setStep('request'); setOtp(''); clearError(); setFieldError(null); }}
                    className="text-xs font-extrabold text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    {hi ? 'ईमेल बदलें' : 'Change Email'}
                  </button>
                </div>
              </form>
            )}
          </FadeIn>
        </div>
      </div>
    </div>
  );
};
