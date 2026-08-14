import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/ui/Logo';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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

        if (code) {
          // Exchange authorization code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }

          if (data.session) {
            if (mounted) {
              navigate('/', { replace: true });
            }
            return;
          }
        }

        // If no code, check if we already have an active session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (mounted) {
            navigate('/', { replace: true });
          }
          return;
        }

        // Otherwise, this callback was opened directly or authentication failed
        throw new Error(hi ? 'कोई वैध प्रमाणीकरण कोड नहीं मिला।' : 'No valid authentication code found.');

      } catch (err: any) {
        console.error('OAuth Callback Error:', err);
        if (mounted) {
          setErrorMsg(err.message || (hi ? 'प्रमाणीकरण विफल रहा' : 'Authentication failed'));
          setTimeout(() => {
            navigate('/auth/login', { replace: true });
          }, 3000);
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
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-bold animate-shake">
            ⚠️ {errorMsg}
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
