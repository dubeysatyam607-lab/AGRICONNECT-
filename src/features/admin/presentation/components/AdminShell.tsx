import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronsUpDown,
  Globe,
  Leaf,
  LogOut,
  Menu,
  Moon,
  Radio,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useThemeManager } from '@/core/theme/ThemeManager';
import { getAdminSession, resetAdminData } from '../../domain/adminStore';
import { ADMIN_MODULES, ADMIN_MODULE_GROUPS, getAdminModule } from '../adminModules';
import { RealtimeFeedPanel, RealtimeFeedBadge } from './RealtimeFeedPanel';

interface AdminShellProps {
  current: string;
  onNavigate: (key: string) => void;
  children: ReactNode;
}

const initials = (name: string): string =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function NavItems({
  current,
  onNavigate,
}: {
  current: string;
  onNavigate: (key: string) => void;
}) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {ADMIN_MODULE_GROUPS.map((group) => (
        <div key={group}>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group}
          </p>
          <div className="mt-1.5 space-y-0.5">
            {ADMIN_MODULES.filter((m) => m.group === group).map((mod) => {
              const active = current === mod.key;
              return (
                <button
                  key={mod.key}
                  onClick={() => onNavigate(mod.key)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <mod.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{mod.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ current, onNavigate, children }: AdminShellProps) {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [displayRole, setDisplayRole] = useState('');
  const [feedOpen, setFeedOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useThemeManager();
  const session = getAdminSession();
  const currentModule = getAdminModule(current);

  // Derive the identity shown in the header from the real authenticated
  // Supabase session — never a stored/hardcoded demo admin.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata ?? {};
      const name = user?.email ? (meta.full_name || user.email.split('@')[0] || '') : '';
      const role = (user?.user_metadata?.role as string) || '';
      if (mounted) {
        setDisplayName(name);
        setDisplayRole(role);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const actorName = displayName || session.name;

  const navigate = (key: string) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  const Brand = (
    <div className="flex h-14 items-center gap-2 border-b px-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Leaf className="h-4.5 w-4.5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-foreground">{t('adm0')}</p>
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('adm1')}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card lg:flex">
        {Brand}
        <NavItems current={current} onNavigate={navigate} />
        <div className="space-y-2 border-t p-3">
          {/* Live Feed Toggle */}
          <RealtimeFeedBadge onClick={() => setFeedOpen(!feedOpen)} />
          {feedOpen && (
            <RealtimeFeedPanel className="max-h-[400px]" onClose={() => setFeedOpen(false)} />
          )}
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">PostgreSQL Live</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
                title="Sync live data"
                onClick={() => resetAdminData()}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Connected to Supabase DB</p>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">{t('adm4')}</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Leaf className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold">{t('adm5')}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavItems current={current} onNavigate={navigate} />
            <div className="border-t p-3">
              <Button variant="outline" size="sm" className="w-full" onClick={() => resetAdminData()}>
                <RotateCcw className="h-3.5 w-3.5 mr-2" /> Sync Live Database
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur">
          <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">{currentModule.label}</h2>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Realtime Live
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden text-muted-foreground sm:inline-flex" asChild>
              <Link to="/">
                <Globe className="h-4 w-4" /> View app
              </Link>
            </Button>
            <Button variant="outline" size="icon" onClick={toggleTheme} title="Toggle theme">
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5 bg-card">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials(actorName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden leading-tight md:block">
                <p className="text-xs font-semibold text-foreground">{actorName}</p>
                <p className="text-[10px] text-muted-foreground">{displayRole || session.roleName}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 border-red-500/20"
              title="Sign Out & Lock Console"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/admin';
              }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1" /> Lock
            </Button>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>

      {/* Reset confirm */}
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adm6')}</AlertDialogTitle>
            <AlertDialogDescription>
              This restores all modules to their original seed data. Any admin changes made in this browser will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('adm7')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetAdminData();
                setConfirmReset(false);
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
