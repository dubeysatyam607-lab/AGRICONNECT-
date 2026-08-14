import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ArrowLeft, RotateCw } from 'lucide-react';
import { AppButton } from '@/shared/widgets/AppButton';
import { FadeIn } from '@/shared/widgets/AppAnimations';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';

interface IOtpVerificationViewProps {
  target: string;
  type: 'phone' | 'email';
  onSuccess: () => void;
  onBack: () => void;
}

const OTP_LENGTH = 6;

const maskTarget = (target: string, type: 'phone' | 'email') => {
  if (type === 'email') {
    const [user, domain] = target.split('@');
    if (!user || !domain) return target;
    const masked = user[0] + '*'.repeat(Math.max(user.length - 2, 1)) + user[user.length - 1];
    return `${masked}@${domain}`;
  }
  if (target.length >= 10) return `+91 ${target.slice(-10, -4)}••••${target.slice(-2)}`;
  return target;
};

export const OtpVerificationView: React.FC<IOtpVerificationViewProps> = ({
  target,
  type,
  onSuccess,
  onBack,
}) => {
  const { t, language } = useLanguage();
  const hi = language === 'hi';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [state, { verifyOtp, sendOtp, clearError }] = useAuthViewModel();

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const next = [...otp];
      digits.forEach((d, idx) => {
        if (idx < OTP_LENGTH) next[idx] = d;
      });
      setOtp(next);
      inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const token = otp.join('');
    if (token.length !== OTP_LENGTH) return;

    const success = await verifyOtp(target, token, type);
    if (success) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      onSuccess();
    }
  };

  const handleResend = async () => {
    if (timer > 0 || state.isLoading) return;
    clearError();
    const success = await sendOtp(target, type);
    if (success) setTimer(60);
  };

  const filled = otp.join('').length;

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col justify-between">
      {/* Background wash */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[28rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[110px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-6 py-8">
        <div>
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs font-extrabold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} /> {t('common.back')}
            </button>
            <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck size={13} /> {hi ? 'सत्यापन' : 'OTP Verification'}
            </span>
          </div>

          {/* Icon Header */}
          <FadeIn className="mt-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/20 text-white">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="3" />
                <path d="M11 6h2" />
                <path d="M12 18h.01" />
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight text-foreground">
              {hi ? 'ओटीपी कोड दर्ज करें' : 'Enter Verification Code'}
            </h1>
            <p className="mx-auto mt-2 max-w-xs text-xs font-medium text-muted-foreground">
              {hi ? 'कोड इस नंबर पर भेजा गया:' : 'A 6-digit code has been sent to'}{' '}
              <span className="font-extrabold text-foreground">{maskTarget(target, type)}</span>
            </p>
          </FadeIn>

          {/* Error Banner */}
          {state.error && (
            <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-600 dark:text-rose-400 animate-shake">
              ⚠️ {state.error}
            </div>
          )}

          {/* 6 Digit Input Grid */}
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="flex justify-between gap-1.5 sm:gap-2" role="group" aria-label="OTP digit inputs">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  aria-label={`Digit ${index + 1}`}
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={OTP_LENGTH}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`h-14 w-full max-w-[3.4rem] flex-1 rounded-2xl border-2 bg-card text-center text-xl font-black text-foreground shadow-sm outline-none transition-all focus:ring-4 ${
                    digit
                      ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/15'
                      : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/15'
                  }`}
                />
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <AppButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={state.isLoading}
                disabled={filled !== OTP_LENGTH}
              >
                {hi ? 'सत्यापित करें' : 'Verify & Continue'}
              </AppButton>

              {/* Resend OTP & Change Number */}
              <div className="flex flex-col items-center gap-2.5 pt-1">
                {timer > 0 ? (
                  <span className="text-xs font-bold text-muted-foreground">
                    {hi ? `पुनः ओटीपी भेजें (${timer} सेकंड)` : `Resend code in ${timer}s`}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={state.isLoading}
                    className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <RotateCw size={13} /> {hi ? 'पुनः ओटीपी भेजें' : 'Resend OTP Code'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onBack}
                  className="text-xs font-extrabold text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  {type === 'email' ? (hi ? 'ईमेल बदलें' : 'Change Email') : (hi ? 'नंबर बदलें' : 'Change Number')}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="pt-6 text-center text-[10px] font-medium text-muted-foreground/70">
          🔒 {hi ? 'सुरक्षित 256-बिट एन्क्रिप्शन द्वारा रक्षित' : 'Protected by enterprise 256-bit encryption'}
        </p>
      </div>
    </div>
  );
};
