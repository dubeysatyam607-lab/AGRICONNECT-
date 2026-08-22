import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/integrations/supabase/client';
import { AdminShell } from './components/AdminShell';
import { ADMIN_MODULES, getAdminModule } from './adminModules';
import { SeoHead } from '@/components/seo/SeoHead';
import { logAdminAudit } from '../domain/adminDatabaseService';

const moduleKeyFromPath = (pathname: string): string => {
  const parts = pathname.split('/').filter(Boolean);
  const key = parts[1] ?? 'overview';
  return ADMIN_MODULES.some((m) => m.key === key) ? key : 'overview';
};

type Gate = 'loading' | 'granted' | 'denied' | 'anon';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { setActiveRole } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  const [gate, setGate] = useState<Gate>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  const current = moduleKeyFromPath(location.pathname);
  const go = (key: string) => navigate(key === 'overview' ? '/admin' : `/admin/${key}`);
  const Module = getAdminModule(current).component;

  const verifyUserSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setGate('anon');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const userEmail = String(user.email || '').toLowerCase();
      const userMetaRole = String((user.user_metadata as any)?.role || '').toLowerCase();
      const appMetaRole = String((user.app_metadata as any)?.role || '').toLowerCase();

      const isAuthorizedAdmin =
        (profile && String(profile.role).toLowerCase() === 'admin') ||
        userEmail === 'dubeysatyam607@gmail.com' ||
        userEmail === 'satyamff124@gmail.com' ||
        userEmail.startsWith('admin@') ||
        userMetaRole === 'admin' ||
        appMetaRole === 'admin';

      if (isAuthorizedAdmin) {
        setActiveRole('Admin');
        setGate('granted');
      } else {
        setGate('denied');
      }
    } catch {
      setGate('anon');
    }
  };

  useEffect(() => {
    verifyUserSession();
  }, [setActiveRole]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter your admin email and password.');
      return;
    }

    setAuthenticating(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error || !data?.user) {
        setAuthError(error?.message || 'Invalid credentials. Please verify your admin ID and password.');
        setAuthenticating(false);
        return;
      }

      // Verify admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      const userEmail = String(data.user.email || '').toLowerCase();
      const userMetaRole = String((data.user.user_metadata as any)?.role || '').toLowerCase();
      const appMetaRole = String((data.user.app_metadata as any)?.role || '').toLowerCase();

      const isAuthorized =
        (profile && String(profile.role).toLowerCase() === 'admin') ||
        userEmail === 'dubeysatyam607@gmail.com' ||
        userEmail === 'satyamff124@gmail.com' ||
        userEmail.startsWith('admin@') ||
        userMetaRole === 'admin' ||
        appMetaRole === 'admin';

      if (!isAuthorized) {
        setAuthError('Access denied: This account does not possess administrator privileges.');
        setGate('denied');
        setAuthenticating(false);
        return;
      }

      await logAdminAudit({
        action: 'LOGIN',
        tableName: 'admin_sessions',
        recordId: data.user.id,
        newData: { email: userEmail, time: new Date().toISOString() },
        userId: data.user.id,
      });

      setActiveRole('Admin');
      setGate('granted');
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication service error. Please try again.');
    } finally {
      setAuthenticating(false);
    }
  };

  if (gate === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-xs font-medium text-slate-400">Verifying secure admin credentials…</p>
        </div>
      </div>
    );
  }

  if (gate === 'anon') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950 p-4 sm:p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-black text-white tracking-tight">
              AgriConnect Admin
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Executive Console · Enter your secure credentials
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            {authError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-400 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300">
                Admin Email / User ID
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dubeysatyam607@gmail.com"
                required
                className="mt-1.5 rounded-xl border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">
                Admin Password
              </label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="rounded-xl border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500 pr-10 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={authenticating}
              size="lg"
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/25 mt-2"
            >
              {authenticating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Authenticating…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" /> Sign In to Admin Console <ArrowRight className="h-4 w-4 ml-auto" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              256-bit Encrypted · Super Admin Access Gated
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (gate === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-slate-900/95 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 shadow-inner">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-white tracking-tight">Access Restricted</h1>
          <p className="mt-2 text-xs font-medium text-slate-400 leading-relaxed">
            This console requires the <span className="font-bold text-emerald-400">Admin</span> or <span className="font-bold text-emerald-400">Super Admin</span> role. Your account is not authorized to view executive administrative controls.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full rounded-2xl border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => {
                supabase.auth.signOut().then(() => setGate('anon'));
              }}
            >
              Sign In with Another Account
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
              onClick={() => navigate('/')}
            >
              Return to Farmer App
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead title="Admin Dashboard — AgriConnect" description="AgriConnect administrator console." noindex />
      <AdminShell current={current} onNavigate={go}>
        <Module onNavigate={go} />
      </AdminShell>
    </>
  );
}
