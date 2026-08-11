import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Phone, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { AppButton } from '@/shared/widgets/AppButton';
import { FadeIn } from '@/shared/widgets/AppAnimations';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';

interface IForgotPasswordViewProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordView: React.FC<IForgotPasswordViewProps> = ({ onBackToLogin }) => {
  const { t, language } = useLanguage();
  const hi = language === 'hi';

  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [identifier, setIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [state, { sendOtp, verifyOtp, changePassword, clearError }] = useAuthViewModel();

  const detectType = (value: string): 'phone' | 'email' =>
    value.includes('@') ? 'email' : 'phone';

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldError(null);

    if (!identifier.trim()) {
      setFieldError(hi ? 'कृपया अपना मोबाइल नंबर या ईमेल दर्ज करें' : 'Please enter your mobile number or email');
      return;
    }

    const success = await sendOtp(identifier.trim(), detectType(identifier.trim()));
    if (success) {
      setStep('reset');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldError(null);

    if (!resetCode.trim()) {
      setFieldError(hi ? 'कृपया रीसेट कोड दर्ज करें' : 'Please enter the reset code');
      return;
    }

    if (newPassword.length < 6) {
      setFieldError(hi ? 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFieldError(hi ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match');
      return;
    }

    const type = detectType(identifier.trim());
    const otpVerified = await verifyOtp(identifier.trim(), resetCode.trim(), type);
    if (!otpVerified) return;

    const updated = await changePassword('', newPassword, confirmPassword);
    if (updated) {
      setStep('success');
    }
  };

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
              <ArrowLeft size={16} /> {hi ? 'साइन इन पर लौटें' : 'Back to Sign In'}
            </button>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              {hi ? 'पासवर्ड रीसेट' : 'Password Reset'}
            </span>
          </div>

          {/* Header */}
          <FadeIn className="mt-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-md">
              <KeyRound size={28} />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-foreground">
              {hi ? 'पासवर्ड रीसेट करें' : 'Reset Your Password'}
            </h1>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">
              {step === 'request'
                ? (hi ? 'अपना पंजीकृत मोबाइल नंबर या ईमेल दर्ज करें' : 'Enter your registered mobile number or email address')
                : step === 'reset'
                ? (hi ? 'रीसेट कोड और नया पासवर्ड दर्ज करें' : 'Enter the reset code and your new password')
                : (hi ? 'आपका पासवर्ड सफलतापूर्वक रीसेट हो गया है' : 'Your password has been successfully reset')}
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
                    {hi ? 'मोबाइल नंबर या ईमेल' : 'Mobile Number or Email'}
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      placeholder="98765 43210 or farmer@example.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card pl-11 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <AppButton type="submit" variant="primary" size="lg" fullWidth isLoading={state.isLoading}>
                  {hi ? 'रीसेट कोड भेजें' : 'Send Reset Code'}
                </AppButton>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {hi ? 'रीसेट कोड' : 'Reset Code'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest text-lg font-black rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card py-3 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {hi ? 'नया पासवर्ड' : 'New Password'}
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card pl-11 pr-12 py-3 text-sm font-bold text-foreground outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {hi ? 'नए पासवर्ड की पुष्टि करें' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-card pl-11 pr-4 py-3 text-sm font-bold text-foreground outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15 transition-all"
                    />
                  </div>
                </div>

                <AppButton type="submit" variant="primary" size="lg" fullWidth isLoading={state.isLoading}>
                  {hi ? 'पासवर्ड अपडेट करें' : 'Update Password'}
                </AppButton>
              </form>
            )}

            {step === 'success' && (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 animate-scale-up">
                <CheckCircle2 size={44} className="text-emerald-500 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-black text-foreground">
                    {hi ? 'पासवर्ड सफलतापूर्वक बदल दिया गया!' : 'Password Successfully Changed!'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {hi ? 'आप अब अपने नए पासवर्ड से साइन इन कर सकते हैं' : 'You can now sign in with your new password.'}
                  </p>
                </div>
                <AppButton variant="primary" size="lg" fullWidth onClick={onBackToLogin}>
                  {hi ? 'साइन इन पर जाएं' : 'Proceed to Sign In'}
                </AppButton>
              </div>
            )}
          </FadeIn>
        </div>
      </div>
    </div>
  );
};
