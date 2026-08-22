import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  CreditCard,
  Landmark,
  Layers,
  Newspaper,
  Package,
  RefreshCw,
  ScanLine,
  Send,
  ShieldCheck,
  Star,
  Store,
  Tractor,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { AdminStatusBadge } from '../components/StatusBadge';
import { useAdminKpis } from '../hooks/useAdminKpis';
import { isPlatformEmpty } from '../../domain/adminRemoteData';
import { fmtCompact, fmtINR, fmtNumber, timeAgo } from '../../domain/adminStore';

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-6 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export function OverviewModule({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { t } = useLanguage();
  const { status, data, error, isRefreshing, refresh } = useAdminKpis();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(() => data ? new Date(data.generatedAt) : new Date());

  useEffect(() => {
    if (data) setLastRefreshed(new Date(data.generatedAt));
  }, [data]);

  if (status === 'loading' && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Executive KPI Dashboard" subtitle="Loading live platform metrics…" />
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="animate-pulse h-60 rounded-xl border bg-card" />
          <div className="animate-pulse h-60 rounded-xl border bg-card" />
        </div>
      </div>
    );
  }

  if (status === 'error' && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Executive KPI Dashboard" subtitle="Live platform metrics" />
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-6 py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <div>
            <p className="text-lg font-black text-foreground">{t('adm14')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error === 'ADMIN_ROLE_REQUIRED'
                ? 'Your account does not have the admin role. Contact a platform admin.'
                : `Supabase returned: ${error}`}
            </p>
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-red-500 active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const snapshot = data!;
  const k = snapshot.kpis;
  const platformEmpty = isPlatformEmpty(snapshot);
  const daily = snapshot.daily;

  const attention = [
    { label: 'Contact messages', count: k.contactMessages, icon: Package, tone: 'bg-sky-100 text-sky-700', key: 'support' },
    { label: 'Transport requests', count: k.transportBookings, icon: Truck, tone: 'bg-blue-100 text-blue-700', key: 'reports' },
    { label: 'Labour requests', count: k.laborRequests, icon: Users, tone: 'bg-amber-100 text-amber-700', key: 'reports' },
    { label: 'Tractor bookings', count: k.tractorBookings, icon: Tractor, tone: 'bg-emerald-100 text-emerald-700', key: 'tractorRentals' },
    { label: 'Cattle listings', count: k.cattleListings, icon: BadgeCheck, tone: 'bg-lime-100 text-lime-700', key: 'orders' },
    { label: 'Push subscribers', count: k.pushSubscribers, icon: Send, tone: 'bg-purple-100 text-purple-700', key: 'push' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Live Auto-Refresh */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Executive KPI Dashboard"
          subtitle={`Real-time platform metrics · Last updated: ${lastRefreshed.toLocaleTimeString('en-IN')}`}
        />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/50 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            LIVE
          </span>
          <button
            onClick={refresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-card px-4 py-2 text-xs font-bold text-foreground transition-all hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            {isRefreshing ? 'Refreshing…' : 'Refresh Metrics'}
          </button>
        </div>
      </div>

      {platformEmpty && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
          <Activity className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-black">{t('adm15')}</span> The platform has no activity yet — metrics will populate live as farmers sign up, book tractors, and submit requests. Unmeasured channels (AI, payments, ratings) show 0 until tracking is connected.
          </p>
        </div>
      )}

      {/* ALL 18 KPI CARDS GRID */}
      <div>
        <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Platform Overview KPIs (18 Core Indicators)
        </h2>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <StatCard title="Total Users" value={fmtNumber(k.totalUsers)} icon={Users} iconClassName="bg-emerald-100 text-emerald-700" hint="from profiles table" />
          <StatCard title="New Users Today" value={fmtNumber(k.newToday)} icon={TrendingUp} iconClassName="bg-blue-100 text-blue-700" hint="signups today" />
          <StatCard title="New (7 days)" value={fmtNumber(k.new7d)} icon={Users} iconClassName="bg-sky-100 text-sky-700" hint="last 7 days" />
          <StatCard title="New (30 days)" value={fmtNumber(k.new30d)} icon={Users} iconClassName="bg-indigo-100 text-indigo-700" hint="last 30 days" />

          <StatCard title="AI Conversations" value={fmtNumber(k.aiConversations)} icon={Bot} iconClassName="bg-teal-100 text-teal-700" hint={k.aiConversations > 0 ? "total conversations" : "0"} />
          <StatCard title="Crop Scans" value={fmtNumber(k.cropScans)} icon={ScanLine} iconClassName="bg-green-100 text-green-700" hint={k.cropScans > 0 ? "total scans" : "0"} />
          <StatCard title="Tractor Rentals" value={fmtNumber(k.tractorBookings)} icon={Tractor} iconClassName="bg-amber-100 text-amber-700" hint={`${k.bookingsToday} today`} />
          <StatCard title="Cattle Listings" value={fmtNumber(k.cattleListings)} icon={BadgeCheck} iconClassName="bg-yellow-100 text-yellow-700" hint="marketplace listings" />

          <StatCard title="Marketplace" value={fmtNumber(k.marketplaceProducts)} icon={Store} iconClassName="bg-orange-100 text-orange-700" hint="product listings" />
          <StatCard title="Equipment" value={fmtNumber(k.equipmentListings)} icon={Tractor} iconClassName="bg-lime-100 text-lime-700" hint="tractor listings" />
          <StatCard title="Active Subs" value={fmtNumber(k.activeSubscriptions)} icon={Layers} iconClassName="bg-violet-100 text-violet-700" hint="subscribers" />
          <StatCard title="Payments" value={fmtNumber(k.successfulPayments)} icon={CreditCard} iconClassName="bg-purple-100 text-purple-700" hint="successful payments" />

          <StatCard title="Push Subscribers" value={fmtNumber(k.pushSubscribers)} icon={Send} iconClassName="bg-amber-100 text-amber-700" hint="push subscribers" />
          <StatCard title="Price Alerts" value={fmtNumber(k.priceAlerts)} icon={TrendingUp} iconClassName="bg-sky-100 text-sky-700" hint="active alerts" />
          <StatCard title="Support Tickets" value={fmtNumber(k.openSupportTickets)} icon={AlertTriangle} iconClassName="bg-red-100 text-red-700" hint="open tickets" />
          <StatCard title="Crash Reports" value={fmtNumber(k.crashReports)} icon={ShieldCheck} iconClassName="bg-rose-100 text-rose-700" hint="reported crashes" />

          <StatCard title="Contact Messages" value={fmtNumber(k.contactMessages)} icon={Package} iconClassName="bg-slate-100 text-slate-700" hint="form submissions" />
          <StatCard title="Labor Requests" value={fmtNumber(k.laborRequests)} icon={Users} iconClassName="bg-teal-100 text-teal-700" hint="labor requests" />
        </div>
      </div>

      {/* CHARTS GRID — Growth, Requests, Rentals & Signups */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{t('adm16')}</p>
              <p className="text-[11px] text-muted-foreground">{t('adm17')}</p>
            </div>
            <button onClick={() => onNavigate('appAnalytics')} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Analytics <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} stroke="currentColor" className="opacity-40" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtCompact(v)} stroke="currentColor" className="opacity-40" width={42} />
              <Tooltip content={({ active, payload, label }: any) =>
                active && payload?.length ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow">
                    <p className="font-medium">{label}</p>
                    <p className="text-emerald-600 font-bold">{fmtNumber(payload[0].value)} total users</p>
                    <p className="text-blue-600 font-bold">{fmtNumber(payload[1]?.value ?? 0)} new signups</p>
                  </div>
                ) : null} />
              <Area type="monotone" dataKey="totalUsers" stroke="#22c55e" strokeWidth={2.5} fill="url(#dauGrad)" />
              <Line type="monotone" dataKey="newUsers" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{t('adm18')}</p>
              <p className="text-[11px] text-muted-foreground">{t('adm19')}</p>
            </div>
            <button onClick={() => onNavigate('reports')} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Reports <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} stroke="currentColor" className="opacity-40" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="opacity-40" width={42} />
              <Tooltip content={({ active, payload, label }: any) =>
                active && payload?.length ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow">
                    <p className="font-medium">{label}</p>
                    <p className="text-sky-600 font-bold">{fmtNumber(payload[0].value)} requests</p>
                  </div>
                ) : null} />
              <Bar dataKey="requests" name="Requests" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{t('adm20')}</p>
              <p className="text-[11px] text-muted-foreground">{t('adm21')}</p>
            </div>
            <button onClick={() => onNavigate('tractorRentals')} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Rentals <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} stroke="currentColor" className="opacity-40" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="opacity-40" width={42} />
              <Tooltip />
              <Line type="monotone" dataKey="tractorBookings" name="Tractor Bookings" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cattleListings" name="Cattle Listings" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{t('adm22')}</p>
              <p className="text-[11px] text-muted-foreground">{t('adm23')}</p>
            </div>
            <button onClick={() => onNavigate('farmers')} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Farmers <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} stroke="currentColor" className="opacity-40" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="opacity-40" width={42} />
              <Tooltip />
              <Bar dataKey="newUsers" name="New Farmers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Platform Signals & Real Audit Trail */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 lg:col-span-2 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{t('adm24')}</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {attention.map((item) => (
              <button
                key={item.label}
                onClick={() => onNavigate(item.key)}
                className="flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black leading-none text-foreground">{fmtNumber(item.count)}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{item.label}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{t('adm25')}</p>
            <button onClick={() => onNavigate('auditLogs')} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Audit log <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {snapshot.recentAudit.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">{t('adm26')}</p>
          ) : (
            <div className="space-y-3">
              {snapshot.recentAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <AdminStatusBadge status={log.action} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-medium text-foreground">{log.summary}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{log.actor} · {timeAgo(log.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

