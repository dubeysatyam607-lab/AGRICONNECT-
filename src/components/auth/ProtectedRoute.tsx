import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';

/**
 * Route guard for authenticated-only areas (app dashboard, admin console).
 * Uses the live Supabase session (source of truth) rather than localStorage
 * flags. While the session is loading a branded splash is rendered so the
 * redirect never flashes before auth state is known.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#0B1F14] text-white">
        <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-emerald-500/30 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-amber-500/20 blur-[130px]" />
        <div className="relative flex flex-col items-center">
          <span className="absolute inline-flex h-32 w-32 animate-ping rounded-full bg-emerald-400/20" style={{ animationDuration: '2.4s' }} />
          <Logo size={72} className="drop-shadow-2xl shadow-emerald-500/40" />
        </div>
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
