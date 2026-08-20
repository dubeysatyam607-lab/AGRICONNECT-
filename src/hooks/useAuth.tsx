import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authRemoteDataSource } from '@/features/auth/data/datasources/AuthRemoteDataSource';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Persist only non-sensitive profile metadata for the offline AI advisor.
  // Never mirrors the JWT or the full user object into localStorage (XSS risk).
  const persistAuthMeta = (current: User | null): void => {
    const meta = current?.user_metadata ?? {};
    if (current) {
      localStorage.setItem(
        'agri_auth_meta',
        JSON.stringify({
          full_name: meta.full_name ?? '',
          village: meta.village ?? '',
          state: meta.state ?? '',
        }),
      );
    } else {
      localStorage.removeItem('agri_auth_meta');
    }
  };

  useEffect(() => {
    const cleanAuthHash = () => {
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', cleanUrl);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      persistAuthMeta(session?.user ?? null);
      if (session) cleanAuthHash();
    }).catch(() => {
      // Network failure or IndexedDB corruption — treat as logged out
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      persistAuthMeta(session?.user ?? null);
      if (session) cleanAuthHash();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    localStorage.removeItem('agri_auth_meta');
    localStorage.removeItem('agri_token');
    localStorage.removeItem('agri_user');
    window.location.href = '/auth/login';
  };

  // Verify OTP after registration
  const verifyOtp = async (email: string, token: string) => {
    try {
      await authRemoteDataSource.verifyOtp(email, token);
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'OTP verification failed.' };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }
      // Session will be updated by onAuthStateChange listener
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Sign in failed. Please try again.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, signUp, signIn, verifyOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Use this only in providers that can also render before authentication is
 * available (for example, public onboarding and isolated component tests).
 */
export const useOptionalAuth = () => useContext(AuthContext);
