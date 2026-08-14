import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/integrations/supabase/client';
import { AdminShell } from './components/AdminShell';
import { ADMIN_MODULES, getAdminModule } from './adminModules';

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
  const current = moduleKeyFromPath(location.pathname);
  const go = (key: string) => navigate(key === 'overview' ? '/admin' : `/admin/${key}`);
  const Module = getAdminModule(current).component;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) setGate('anon');
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        const isAdmin = !error && data && String(data.role).toLowerCase() === 'admin';
        if (!mounted) return;
        if (isAdmin) {
          setActiveRole('Admin');
          setGate('granted');
        } else {
          setGate('denied');
        }
      } catch {
        if (mounted) setGate('denied');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setActiveRole]);

  if (gate === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-950 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-xs font-medium text-slate-400">{t('adm48')}</p>
        </div>
      </div>
    );
  }

  if (gate === 'anon') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-950 p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <LogIn className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-white tracking-tight">{t('adm49')}</h1>
          <p className="mt-2 text-xs font-medium text-slate-400 leading-relaxed">
            The Admin Console is a protected executive workspace. Please sign in to your AgriConnect account to continue.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-lg shadow-emerald-600/25" onClick={() => navigate('/login')}>
              <LogIn className="h-5 w-5 mr-2" /> Sign in <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (gate === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-950 p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 shadow-inner">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-white tracking-tight">{t('adm50')}</h1>
          <p className="mt-2 text-xs font-medium text-slate-400 leading-relaxed">
            This console is restricted to users with the <span className="font-bold text-emerald-400">{t('adm51')}</span> role on their account. Your profile role was not authorized.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button variant="outline" size="lg" className="w-full rounded-2xl border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => navigate('/')}>
              Return to Farmer App
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminShell current={current} onNavigate={go}>
      <Module onNavigate={go} />
    </AdminShell>
  );
}
