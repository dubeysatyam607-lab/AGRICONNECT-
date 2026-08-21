import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, Settings2, Check, X } from 'lucide-react';
import {
  getSavedCookiePreferences,
  saveCookiePreferences,
  CookieSettingsModal,
  ICookiePreferences,
} from './CookieSettingsModal';

export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't made a choice yet
    const saved = getSavedCookiePreferences();
    if (!saved) {
      // Small delay so it smoothly slides in after page render
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for global open requests from footer link
  useEffect(() => {
    const handleOpenSettings = () => {
      setModalOpen(true);
    };
    window.addEventListener('agri_open_cookie_settings', handleOpenSettings);
    return () => window.removeEventListener('agri_open_cookie_settings', handleOpenSettings);
  }, []);

  const handleAcceptAll = () => {
    const prefs: ICookiePreferences = {
      essential: true,
      analytics: true,
      preferences: true,
      marketing: true,
    };
    saveCookiePreferences(prefs);
    setVisible(false);
  };

  const handleRejectNonEssential = () => {
    const prefs: ICookiePreferences = {
      essential: true,
      analytics: false,
      preferences: false,
      marketing: false,
    };
    saveCookiePreferences(prefs);
    setVisible(false);
  };

  return (
    <>
      {visible && (
        <aside
          aria-label="Cookie consent banner"
          className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl transition-all duration-300 animate-slideUp"
        >
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Info Message */}
            <div className="flex items-start gap-3.5 text-slate-200">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Cookie size={20} />
              </div>
              <div className="space-y-1 text-xs sm:text-sm">
                <p className="font-bold text-white flex items-center gap-1.5">
                  We respect your privacy & agricultural data
                </p>
                <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">
                  AgriConnect uses essential cookies for secure login and language selection. We also use optional analytics to improve app performance. Read our{' '}
                  <Link to="/privacy-policy" className="text-emerald-400 underline hover:text-emerald-300 font-medium">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/data-declaration" className="text-emerald-400 underline hover:text-emerald-300 font-medium">
                    Data Declaration
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex-1 sm:flex-initial rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 px-3.5 flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                <Settings2 size={14} />
                <span>Preferences</span>
              </button>

              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="flex-1 sm:flex-initial rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 px-3.5 transition-colors border border-slate-700"
              >
                Essential Only
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black py-2.5 px-4 shadow-md shadow-emerald-900/30 transition-all"
              >
                Accept All
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Settings Modal */}
      <CookieSettingsModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setVisible(false);
        }}
      />
    </>
  );
};
