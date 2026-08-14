import React, { useState } from 'react';
import { AppButton } from '@/shared/widgets/AppButton';
import { AppCard } from '@/shared/widgets/AppCard';
import { FadeIn } from '@/shared/widgets/AppAnimations';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';
import { PasswordStrength } from '../components/PasswordStrength';
import { isPasswordStrong } from '@/utils/passwordPolicy';

/**
 * Enterprise Change Password View / Modal.
 * Secure password change interface with real-time strength meter and confirmation matching.
 */
interface IChangePasswordViewProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ChangePasswordView: React.FC<IChangePasswordViewProps> = ({ onSuccess, onCancel }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [state, { changePassword, clearError }] = useAuthViewModel();
  const { t } = useLanguage();
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!isPasswordStrong(newPassword)) {
      setFieldError('Password does not meet strength requirements');
      return;
    }
    const success = await changePassword(oldPassword, newPassword, confirmPassword);
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <FadeIn className="w-full max-w-md mx-auto">
      <AppCard variant="glass" padding="lg" className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl border border-emerald-500/20">
              🔒
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">{t('chpw.title')}</h2>
              <p className="text-xs text-muted-foreground">{t('chpw.subtitle')}</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg"
            >
              ✕
            </button>
          )}
        </div>

        {state.error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-medium animate-shake">
            ⚠️ {state.error}
          </div>
        )}
        {fieldError && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 text-xs font-medium animate-shake">
            ⚠️ {fieldError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('chpw.current')}
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              aria-label={t('chpw.old')}
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('chpw.new')}
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              aria-label={t('chpw.new')}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
            />
            <PasswordStrength password={newPassword} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('chpw.confirm')}
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              aria-label={t('chpw.confirm')}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                confirmPassword && confirmPassword !== newPassword
                  ? 'border-rose-500 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'
              }`}
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-[11px] text-rose-500 font-bold pt-0.5">⚠️ {t('chpw.mismatch')}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="show-pass"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <label htmlFor="show-pass" className="text-xs font-medium text-muted-foreground cursor-pointer">
              {t('chpw.show')}
            </label>
          </div>

          <div className="pt-2 flex gap-3">
            {onCancel && (
              <AppButton type="button" variant="secondary" size="md" fullWidth onClick={onCancel}>
                {t('chpw.cancel')}
              </AppButton>
            )}
            <AppButton
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={state.isLoading}
              disabled={!oldPassword || !newPassword || newPassword !== confirmPassword || !isPasswordStrong(newPassword)}
            >
              {t('chpw.update')}
            </AppButton>
          </div>
        </form>
      </AppCard>
    </FadeIn>
  );
};
