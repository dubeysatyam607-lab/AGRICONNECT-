import React, { useEffect, useState, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * RequireAdmin component enforces that the current user is authenticated and has an admin role.
 * Uses DUAL verification:
 * 1. Client-side: checks profiles table via RLS
 * 2. Defense-in-depth: also checks app_metadata in the JWT for admin claims
 * If either check fails, the user is redirected to the home page.
 */
export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      if (!user) {
        if (mounted) setIsAdmin(false);
        return;
      }

      // Defense-in-depth: check JWT app_metadata for admin claim
      const jwtRole = (user.app_metadata as any)?.role;
      if (jwtRole === 'admin') {
        if (mounted) setIsAdmin(true);
        return;
      }

      // Primary check: verify via profiles table (RLS-enforced)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          console.error('Error fetching admin role:', error);
          if (mounted) setIsAdmin(false);
          return;
        }

        if (mounted) setIsAdmin(data?.role?.toLowerCase() === 'admin');
      } catch (err) {
        console.error('Admin check failed:', err);
        if (mounted) setIsAdmin(false);
      }
    };

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [user, session]);

  if (isAdmin === null) {
    return <div className="flex h-screen items-center justify-center">Loading…</div>;
  }

  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
};
