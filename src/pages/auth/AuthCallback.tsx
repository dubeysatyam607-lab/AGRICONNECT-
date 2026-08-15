import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/ui/Logo';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { syncOAuthProfileFromIdentity } from '@/features/auth/data/datasources/AuthRemoteDataSource';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const hi = language === 'hi';
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        // Check for error query parameters first
        if (error) {
          throw new Error(errorDescription || error);
        }

        // Clean up hash/query parameters immediately from window history to prevent token exposure
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState(null, '', cleanUrl);
        }

        let user: { id: string } | null = null;

        if (code) {
          // Exchange authorization code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
          user = data.user ?? data.session?.user ?? null;
          if (data.session) {
            // Enrich the AgriConnect profile from the Google identity (best-effort;
            // fills only empty name/avatar fields — never farm/location/weather).
            await syncOAuthProfileFromIdentity(data.session.user);
          }
        }

        // If no code, check if we already have an active session
        if (!user) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            user = sessionData.session.user;
            await syncOAuthProfileFromIdentity(sessionData.session.user);
          }
        }

        if (user && mounted) {
          navigate('/', { replace: true });
          return;
        }

        // Otherwise, this callback was opened directly or authentication failed
        throw new Error(hi ? 'कोई वैध प्रमाणीकरण कोड नहीं मिला।' : 'No valid authentication code found.');

      } catch (err: any) {
        console.error('OAuth Callback Error:', err?.message || err);
        if (mounted) {
          // Never surface stack traces, tokens or secrets — only a safe, friendly message.
          const safeMessage = hi
            ? 'प्रमाणीकरण पूरा नहीं हो सका। कृपया पुनः प्रयास करें।'
            : 'Sign-in could not be completed. Please try again.';
          setErrorMsg(safeMessage);
        }
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [navigate, hi]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white flex flex-col items-center justify-center px-6">
      <div className="relative flex flex-col items-center max-w-sm w-full text-center">
        <div className="relative flex items-center justify-center mb-6">
          <span className="absolute inline-flex h-24 w-24 animate-ping rounded-full bg-emerald-400/20" style={{ animationDuration: '2s' }} />
          <Logo size={72} className="drop-shadow-2xl shadow-emerald-500/40 animate-pulse" />
        </div>
        
        {errorMsg ? (
          <div className="w-full space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-bold animate-shake">
              ⚠️ {errorMsg}
            </div>
            <button
              type="button"
              onClick={() => navigate('/auth/login', { replace: true })}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold py-3 px-4 shadow-lg shadow-emerald-900/40 transition-colors"
            >
              {hi ? 'साइन इन पर वापस जाएं' : 'Back to Sign In'}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold tracking-tight mb-2">
              {hi ? 'सुरक्षित साइन-इन पूरा किया जा रहा है...' : 'Completing secure sign-in...'}
            </h2>
            <p className="text-sm text-emerald-200/80 font-medium flex items-center gap-1.5 justify-center">
              <ShieldCheck size={16} />
              {hi ? 'एंटरप्राइज 256-बिट एन्क्रिप्शन' : 'Enterprise 256-Bit Encryption'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
