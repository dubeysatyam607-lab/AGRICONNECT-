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
          className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-card border-t border-border"
        >
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Info Message */}
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Cookie size={20} aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="type-small font-semibold text-foreground">
                  We respect your privacy & agricultural data
                </p>
                <p className="type-meta leading-relaxed max-w-2xl">
                  AgriConnect uses essential cookies for secure login and language selection. We also use optional analytics to improve app performance. Read our{' '}
                  <Link to="/privacy-policy" className="text-primary underline">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/data-declaration" className="text-primary underline">
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
                className="flex-1 sm:flex-initial rounded-lg border border-border bg-card hover:bg-muted text-foreground type-small font-semibold py-2.5 px-3.5 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Settings2 size={14} />
                <span>Preferences</span>
              </button>

              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="flex-1 sm:flex-initial rounded-lg border border-border bg-card hover:bg-muted text-foreground type-small font-semibold py-2.5 px-3.5 transition-colors"
              >
                Essential Only
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:w-auto rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground type-small font-semibold py-2.5 px-4 transition-colors"
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
