import React, { useState } from 'react';
import { Eye, EyeOff, User, Mail, Phone, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { AppButton } from '@/shared/widgets/AppButton';
import { FadeIn, SlideUp } from '@/shared/widgets/AppAnimations';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';

interface ISignUpViewProps {
  onSwitchToSignIn: () => void;
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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [state, { signUp, sendOtp, clearError }] = useAuthViewModel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldError(null);

    if (!fullName.trim()) {
      setFieldError(hi ? 'कृपया अपना पूरा नाम दर्ज करें' : 'Please enter your full name');
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setFieldError(hi ? 'कृपया ईमेल या मोबाइल नंबर दर्ज करें' : 'Please enter an email or mobile number');
      return;
    }

    if (password.length < 6) {
      setFieldError(hi ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFieldError(hi ? 'पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते' : 'Passwords do not match');
      return;
    }

    // Phone registration path -> send OTP
    if (phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        setFieldError(hi ? 'कृपया 10-अंकों का वैध मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
        return;
      }
      const target = `+91${digits}`;
      const success = await sendOtp(target, 'phone');
      if (success) {
        onSwitchToOtp(target, 'phone');
        return;
      }
    }

    // Email registration path -> direct signup
    const success = await signUp(email.trim(), password, fullName.trim(), phone.trim());
    if (success) {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col justify-between">
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
              <ShieldCheck size={13} /> {hi ? 'निःशुल्क पंजीकरण' : 'Free Registration'}
            </span>
          </div>

          {/* Header */}
          <FadeIn className="mt-6 text-center">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {hi ? 'नया किसान खाता बनाएं' : 'Create Farmer Account'}
            </h1>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">
              {hi ? 'एग्रीकनेक्ट के साथ स्मार्ट खेती और मंडी भाव से जुड़ें' : 'Join AgriConnect for Mandi prices, AI advisory & farm management'}
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
                  {hi ? 'पूरा नाम' : 'Full Name'}
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

              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {hi ? 'मोबाइल नंबर (ओटीपी हेतु)' : 'Mobile Number (for OTP)'}
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

              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {hi ? 'ईमेल पता (वैकल्पिक)' : 'Email Address (Optional)'}
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="farmer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card pl-11 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {hi ? 'पासवर्ड' : 'Password'}
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
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

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  {hi ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card pl-11 pr-12 py-3 text-sm font-bold text-foreground outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
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
                  {hi ? 'खाता बनाएं' : 'Create Account'}
                </AppButton>
              </div>
            </form>
          </FadeIn>
        </div>

        {/* Footer */}
        <SlideUp delayMs={200} className="mt-6 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            {hi ? 'पहले से खाता है?' : 'Already have an account?'}{' '}
            <button onClick={onSwitchToSignIn} className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline ml-1">
              {hi ? 'साइन इन करें' : 'Sign In'}
            </button>
          </p>
        </SlideUp>
      </div>
    </div>
  );
};
