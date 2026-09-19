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

interface ErrorBoundaryProps {
  children: React.ReactNode;
  moduleKey: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AdminModuleErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[AdminConsole] Runtime error in module "${this.props.moduleKey}":`, error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.moduleKey !== this.props.moduleKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/20 p-6 text-center space-y-3 shadow-sm my-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Module Temporarily Unavailable</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              The module encountered a non-critical runtime error. Other admin modules and live data streams remain fully active.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl font-bold"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry Module
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      const localAdmin = typeof window !== 'undefined' && localStorage.getItem('agri_admin_session') === 'true';

      const isAuthorizedAdmin =
        (profile && String(profile.role).toLowerCase() === 'admin') ||
        userEmail === 'dubeysatyam607@gmail.com' ||
        userEmail === 'satyamff124@gmail.com' ||
        userEmail.startsWith('admin@') ||
        userMetaRole === 'admin' ||
        appMetaRole === 'admin' ||
        (localAdmin && (userEmail.includes('dubey') || userEmail.includes('admin') || userMetaRole === 'admin'));

      if (isAuthorizedAdmin) {
        if (typeof window !== 'undefined') localStorage.setItem('agri_admin_session', 'true');
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

      if (typeof window !== 'undefined') {
        localStorage.setItem('agri_admin_session', 'true');
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
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="type-small text-muted-foreground">Verifying admin credentials…</p>
        </div>
      </div>
    );
  }

  if (gate === 'anon') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 sm:p-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/15">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="mt-4 type-h1">
              AgriConnect Admin
            </h1>
            <p className="mt-1 type-small text-muted-foreground">
              Sign in with an admin account to manage the platform.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            {authError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 type-small text-red-600 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="type-label text-foreground">
                Admin Email / User ID
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dubeysatyam607@gmail.com"
                required
                className="mt-1.5 rounded-lg border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <div>
              <label className="type-label text-foreground">
                Admin Password
              </label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="rounded-lg border-border bg-background text-foreground placeholder:text-muted-foreground pr-10 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={authenticating}
              size="lg"
              className="w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-2"
            >
              {authenticating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Authenticating…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" /> Sign In to Admin <ArrowRight className="h-4 w-4 ml-auto" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center">
            <p className="type-meta flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Protected — Admin &amp; Super Admin access only
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (gate === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-red-500/10 text-red-600 border border-red-500/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-5 type-h1">Access Restricted</h1>
          <p className="mt-2 type-small text-muted-foreground leading-relaxed">
            This console is only for <span className="font-semibold text-foreground">Admin</span> or <span className="font-semibold text-foreground">Super Admin</span> roles. Your account is not authorized to view administrative controls.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full rounded-lg border-border bg-background text-foreground hover:bg-muted"
              onClick={() => {
                supabase.auth.signOut().then(() => setGate('anon'));
              }}
            >
              Sign In with Another Account
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
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
        <AdminModuleErrorBoundary moduleKey={current}>
          <Module onNavigate={go} />
        </AdminModuleErrorBoundary>
      </AdminShell>
    </>
  );
}
