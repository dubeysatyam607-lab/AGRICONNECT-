import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Cookie, Lock, Check, X } from 'lucide-react';

export interface ICookiePreferences {
  essential: boolean; // Always true
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
  updatedAt?: string;
}

export const DEFAULT_COOKIE_PREFERENCES: ICookiePreferences = {
  essential: true,
  analytics: false,
  preferences: true,
  marketing: false,
};

const STORAGE_KEY = 'agri_cookie_consent';

export function getSavedCookiePreferences(): ICookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCookiePreferences(prefs: ICookiePreferences): void {
  if (typeof window === 'undefined') return;
  try {
    const data = { ...prefs, essential: true, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('agri_cookie_consent_updated', { detail: data }));
  } catch {
    // Storage quota or private mode
  }
}

export const CookieSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<ICookiePreferences>(() => {
    return getSavedCookiePreferences() || DEFAULT_COOKIE_PREFERENCES;
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPrefs(getSavedCookiePreferences() || DEFAULT_COOKIE_PREFERENCES);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const updated = { ...prefs, essential: true, updatedAt: new Date().toISOString() };
    saveCookiePreferences(updated);

    // Sync to Supabase profile if user is logged in
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({
            cookies_preferences: updated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      } catch (err) {
        console.warn('[CookieSettingsModal] Profile cookie preference sync failed:', err);
      }
    }

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleAcceptAll = () => {
    const allOn: ICookiePreferences = {
      essential: true,
      analytics: true,
      preferences: true,
      marketing: true,
    };
    setPrefs(allOn);
    saveCookiePreferences(allOn);
    if (user?.id) {
      supabase.from('profiles').update({ cookies_preferences: allOn }).eq('id', user.id).then();
    }
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6 animate-scaleIn">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cookie size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Privacy & Cookie Preferences</h2>
              <p className="text-xs text-slate-400">Customize how AgriConnect stores your data.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          {/* 1. Essential */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">Essential & Security Cookies</span>
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Always Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Strictly necessary for user login, session encryption, CSRF protection, and selected app language.
            </p>
          </div>

          {/* 2. Preferences */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Functional & Preferences</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.preferences}
                  onChange={(e) => setPrefs({ ...prefs, preferences: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
            <p className="text-xs text-slate-400">
              Remembers your selected mandi state filters, theme preference, and farm calculator inputs.
            </p>
          </div>

          {/* 3. Analytics */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Performance & Analytics</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
            <p className="text-xs text-slate-400">
              Helps us measure page load times and identify bugs to improve your farming app experience.
            </p>
          </div>

          {/* 4. Marketing */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Government Schemes & Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
            <p className="text-xs text-slate-400">
              Allows relevant notifications regarding state agricultural subsidies and tractor marketplace offers.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="w-full sm:w-1/2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-3 px-4 transition-colors"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-1/2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black py-3 px-4 shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-1.5 transition-all"
          >
            {savedSuccess ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
