import { Users, UserPlus, Activity, TrendingUp } from 'lucide-react';
import { Line, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, LineChart, BarChart } from 'recharts';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { useAdminStore } from '../hooks/useAdminStore';
import { fmtCompact, fmtNumber } from '../../domain/adminStore';

const CONFIG = {
  activeUsers: { label: 'Active Users', color: '#22c55e' },
  sessions: { label: 'Sessions', color: '#0ea5e9' },
  orders: { label: 'Orders', color: '#f59e0b' },
  newSignups: { label: 'New Signups', color: '#a855f7' },
};

export function AppAnalyticsModule() {
  const state = useAdminStore();
  const series = state.appAnalytics;
  const latest = series[series.length - 1];
  const prev = series[series.length - 2] ?? latest;

  const daus = series.map((d) => d.activeUsers);
  const peakDau = Math.max(...daus);

  return (
    <div className="space-y-4">
      <PageHeader title="App Analytics" subtitle="14-day platform performance snapshot (read-only)" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Daily Active Users" value={fmtNumber(latest.activeUsers)} icon={Users} iconClassName="bg-green-100 text-green-700" delta={Math.round(((latest.activeUsers - prev.activeUsers) / prev.activeUsers) * 100)} deltaLabel="vs yesterday" />
        <StatCard title="New Signups" value={fmtNumber(latest.newSignups)} icon={UserPlus} iconClassName="bg-purple-100 text-purple-700" hint="today" />
        <StatCard title="Sessions" value={fmtCompact(latest.sessions)} icon={Activity} iconClassName="bg-sky-100 text-sky-700" hint="today" />
        <StatCard title="Peak DAU (14d)" value={fmtNumber(peakDau)} icon={TrendingUp} iconClassName="bg-amber-100 text-amber-700" hint="rolling" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Active Users — last 14 days</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} stroke="currentColor" className="opacity-40" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => fmtCompact(v)} stroke="currentColor" className="opacity-40" width={42} />
              <Tooltip content={({ active, payload, label }: any) =>
                active && payload?.length ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow">
                    <p className="font-medium">{label}</p>
                    {payload.map((p: any) => (
                      <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtNumber(p.value)}</p>
                    ))}
                  </div>
                ) : null} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="activeUsers" name="Active Users" stroke={CONFIG.activeUsers.color} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sessions" name="Sessions" stroke={CONFIG.sessions.color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Orders & Signups — last 14 days</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} stroke="currentColor" className="opacity-40" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="opacity-40" width={42} />
              <Tooltip content={({ active, payload, label }: any) =>
                active && payload?.length ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow">
                    <p className="font-medium">{label}</p>
                    {payload.map((p: any) => (
                      <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtNumber(p.value)}</p>
                    ))}
                  </div>
                ) : null} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="orders" name="Orders" fill={CONFIG.orders.color} radius={[3, 3, 0, 0]} />
              <Bar dataKey="newSignups" name="New Signups" fill={CONFIG.newSignups.color} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric title="Retention (day 7 avg)" value={`${Math.round(series.reduce((s, d) => s + d.retention, 0) / series.length)}%`} />
        <Metric title="Avg Sessions / DAU" value={(latest.sessions / latest.activeUsers).toFixed(1)} />
        <Metric title="Conversion to orders" value={`${((latest.orders / latest.activeUsers) * 100).toFixed(1)}%`} />
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
