import React, { useEffect, useState, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * RequireAdmin component enforces that the current user is authenticated and has an admin role.
 * It queries the `profiles` table for the `role` field.
 * If the role matches the configured admin role, the wrapped children are rendered.
 * Otherwise, the user is redirected to the home page.
 */
export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    // Fetch role from the profiles table (admin role is stored as 'admin')
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching admin role:', error);
          setIsAdmin(false);
          return;
        }
        setIsAdmin(data?.role?.toLowerCase() === 'admin');
      })
      .catch(() => {
        setIsAdmin(false);
      });
  }, [user]);

  if (isAdmin === null) {
    // Loading state – could render a spinner or skeleton
    return <div className="flex h-screen items-center justify-center">Loading…</div>;
  }

  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
};
