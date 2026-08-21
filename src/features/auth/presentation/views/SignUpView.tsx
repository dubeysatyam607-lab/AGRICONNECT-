import React, { useState } from 'react';
import { User, Mail, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { AppButton } from '@/shared/widgets/AppButton';
import { FadeIn, SlideUp } from '@/shared/widgets/AppAnimations';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';

interface ISignUpViewProps {
  onSwitchToSignIn: () => void;
  // Email-only OTP flow – phone detection removed; always treat identifier as email.
  onSwitchToOtp: (target: string, type: 'phone' | 'email') => void;
  onSuccess: () => void;
}

export const SignUpView: React.FC<ISignUpViewProps> = ({
  onSwitchToSignIn,
  onSwitchToOtp,
  onSuccess,
}) => {
  const { t, language } = useLanguage();
  const hi = language === 'hi';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [state, { sendOtp, clearError }] = useAuthViewModel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldError(null);

    if (!fullName.trim()) {
      setFieldError(t('auth.error.enterFullName') || 'Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFieldError(t('auth.error.validEmail') || 'Please enter a valid email address');
      return;
    }

    // Email OTP only — no password required. Mobile is optional profile info.
    const success = await sendOtp(email.trim(), 'email', {
      full_name: fullName.trim(),
      phone: phone.trim(),
    });
    if (success) {
      onSwitchToOtp(email.trim(), 'email');
    }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col justify-between">
        <LanguageSelector />
      {/* Background wash */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-teal-500/10 blur-[100px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-6 py-8">
        <div>
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={onSwitchToSignIn}
              className="rounded-xl px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
            >
              {t('common.back')}
            </button>
            <span className="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck size={13} /> {t('auth.freeRegistration') || 'Free Registration'}
            </span>
          </div>

          {/* Header */}
          <FadeIn className="mt-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {t('auth.signup.title')}
            </h1>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">
              {t('auth.createFarmerSubtitle') || 'Join AgriConnect for Mandi prices, AI advisory & farm management'}
            </p>
          </FadeIn>

          {/* Registration Form */}
          <FadeIn delayMs={100} className="mt-6">
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t('auth.signup.fullNameLabel')}
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="Ramesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card pl-11 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t('auth.signup.emailLabel')}
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
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

              {/* Mobile Number (optional profile info) */}
              <div className="space-y-1">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {t('auth.signup.mobileLabel')}
                </label>
                <div className="flex items-stretch overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15 transition-all">
                  <span className="flex items-center gap-1 border-r border-border bg-slate-50 dark:bg-slate-800/50 px-4 text-sm font-black text-foreground">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-transparent px-4 py-3 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              <div className="pt-2">
                <AppButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={state.isLoading}
                  rightIcon={<ArrowRight size={16} />}
                >
                  {t('auth.signup.sendEmailOtp')}
                </AppButton>
              </div>
            </form>
          </FadeIn>
        </div>

        {/* Footer */}
        <SlideUp delayMs={200} className="mt-6 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            {t('auth.signup.alreadyHaveAccount')}{' '}
            <button onClick={onSwitchToSignIn} className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline ml-1">
              {t('auth.signup.signInLink')}
            </button>
          </p>
        </SlideUp>
      </div>
    </div>
  );
};
