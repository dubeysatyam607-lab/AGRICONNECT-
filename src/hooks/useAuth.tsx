import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authRemoteDataSource } from '@/features/auth/data/datasources/AuthRemoteDataSource';
import { Session, User } from '@supabase/supabase-js';
import { rememberProfile } from '@/core/voice/memory';

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

  // Automatically syncs user profile data into Kisan AI Long-Term Memory
  // and emits real-time audit event for the Admin Console
  const syncUserWithAiAndAdmin = async (currentUser: User | null, eventName: string = 'SESSION_SYNC') => {
    if (!currentUser) {
      localStorage.removeItem('agri_auth_meta');
      return;
    }

    try {
      const meta = currentUser.user_metadata ?? {};
      localStorage.setItem(
        'agri_auth_meta',
        JSON.stringify({
          full_name: meta.full_name ?? '',
          village: meta.village ?? '',
          state: meta.state ?? '',
        }),
      );

      // Fetch extended farm profile from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      const extended = (profile as any)?.extended_profile || {};
      const crop = extended.crops?.[0] || extended.primaryCrop || meta.crop || 'Wheat';
      const village = extended.village || profile?.location?.split(',')?.[0]?.trim() || meta.village || '';
      const state = extended.state || profile?.location?.split(',')?.[1]?.trim() || meta.state || 'India';
      const landSize = Number(extended.landSize || extended.land_size || 0);

      // Feed directly into Kisan AI memory
      rememberProfile({
        name: profile?.full_name || meta.full_name || 'Farmer',
        village,
        state,
        crop,
        farmArea: landSize,
        soilType: extended.soilType || 'Alluvial Soil',
      });

      // Broadcast login/registration to audit_logs for live Admin Dashboard stream
      if (eventName === 'SIGNED_IN' || eventName === 'USER_UPDATED') {
        await supabase.from('audit_logs').insert({
          user_id: currentUser.id,
          action: 'LOGIN',
          table_name: 'profiles',
          record_id: currentUser.id,
          new_data: {
            email: currentUser.email,
            name: profile?.full_name || meta.full_name,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      // Background sync is resilient & non-blocking
      console.warn('[Auth] AI & Admin Sync warning:', err);
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
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          syncUserWithAiAndAdmin(session.user, 'INITIAL_SESSION');
        }
        if (session) cleanAuthHash();
      })
      .catch(() => {
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes in real-time
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        syncUserWithAiAndAdmin(session.user, event);
      }
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
        },
      },
    });

    if (!error && data?.user) {
      syncUserWithAiAndAdmin(data.user, 'SIGNED_UP');
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }
      if (data?.user) {
        syncUserWithAiAndAdmin(data.user, 'SIGNED_IN');
      }
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

export const useOptionalAuth = () => useContext(AuthContext);
