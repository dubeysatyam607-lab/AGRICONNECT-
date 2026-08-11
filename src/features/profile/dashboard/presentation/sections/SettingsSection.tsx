import React, { useState } from 'react';
import { Globe, Moon, Sun, ShieldCheck, Lock, Trash2, ChevronRight, Bell, AlertTriangle } from 'lucide-react';
import { useLanguage, LANGUAGE_NAMES, type Language } from '@/contexts/LanguageContext';
import { useThemeManager } from '@/core/theme/ThemeManager';
import { useAuth } from '@/hooks/useAuth';
import type { UseDigitalProfileReturn } from '../types';

interface SettingsSectionProps {
  data: UseDigitalProfileReturn;
  onNavigate: (tab: string) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ data, onNavigate }) => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useThemeManager();
  const { user, signOut } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const languages = Object.entries(LANGUAGE_NAMES) as [Language, string][];
  const isDark = theme === 'dark';

  const handleDelete = async () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('agri_') || k.startsWith('bkl_secure_') || k.startsWith('supabase.'))
      .forEach((k) => localStorage.removeItem(k));
    try { await signOut(); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{t('prof.settings')}</h2>
      </div>

      {/* Language */}
      <section>
        <h3 className="mb-2.5 text-sm font-extrabold text-foreground flex items-center gap-2">
          <Globe size={16} className="text-primary" /> {t('prof.language')}
        </h3>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {languages.map(([code, name]) => (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                  language === code ? 'bg-primary text-primary-foreground shadow-glow' : 'text-foreground hover:bg-muted'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section>
        <h3 className="mb-2.5 text-sm font-extrabold text-foreground">{t('prof.appearance')}</h3>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-muted/40 transition-colors"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </span>
            <span className="text-left">
              <span className="block text-sm font-extrabold text-foreground">{t('prof.darkMode')}</span>
              <span className="block text-[11px] text-muted-foreground">
                {isDark ? t('prof.darkModeOn') : t('prof.darkModeOff')}
              </span>
            </span>
          </span>
          <span className={`relative h-6 w-11 rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-muted'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isDark ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
      </section>

      {/* Notification preferences shortcut */}
      <button
        onClick={() => onNavigate('notifications')}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-600 dark:text-sky-400">
            <Bell size={18} />
          </span>
          <span className="text-left">
            <span className="block text-sm font-extrabold text-foreground">{t('prof.notifPrefs')}</span>
            <span className="block text-[11px] text-muted-foreground">{t('prof.notifPrefsDesc')}</span>
          </span>
        </span>
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      </button>

      {/* Privacy & Security */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-600 dark:text-violet-400">
            <Lock size={18} />
          </span>
          <p className="mt-2.5 text-sm font-extrabold text-foreground">{t('prof.privacy')}</p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{t('prof.privacyDesc')}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={18} />
          </span>
          <p className="mt-2.5 text-sm font-extrabold text-foreground">{t('prof.security')}</p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            {user?.email ? user.email : t('prof.sessionActive')}
          </p>
        </div>
      </div>

      {/* Advanced settings */}
      <button
        onClick={() => onNavigate('settings')}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-muted/40 transition-colors"
      >
        <span className="text-left">
          <span className="block text-sm font-extrabold text-foreground">{t('prof.advancedSettings')}</span>
          <span className="block text-[11px] text-muted-foreground">{t('prof.advancedSettingsDesc')}</span>
        </span>
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      </button>

      {/* Delete account */}
      <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4">
        {confirmDelete ? (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-xs font-bold text-red-600 dark:text-red-400">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {t('prof.deleteConfirmHint')}
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-full px-4 py-2.5 text-xs font-extrabold text-muted-foreground hover:bg-muted transition-colors">
                {t('prof.cancel')}
              </button>
              <button onClick={handleDelete} className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-red-500 active:scale-95 transition-all">
                {t('prof.deleteAccount')}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/12 text-red-600 dark:text-red-400">
                <Trash2 size={18} />
              </span>
              <span className="text-left">
                <span className="block text-sm font-extrabold text-red-600 dark:text-red-400">{t('prof.deleteAccount')}</span>
                <span className="block text-[11px] text-muted-foreground">{t('prof.deleteAccountDesc')}</span>
              </span>
            </span>
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};
