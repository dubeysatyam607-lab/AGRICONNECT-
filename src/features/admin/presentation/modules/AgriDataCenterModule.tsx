import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Activity,
  ExternalLink,
  Radio,
  FileClock,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import {
  getAgriReport,
  triggerAgriSync,
  AgriReport,
  DataSourceHealth,
  SyncLogRow,
} from '@/lib/agri-info';

type SyncJob = 'scheme' | 'news' | 'msp';

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function statusTone(status: string): 'healthy' | 'error' | 'unknown' {
  const s = status.toLowerCase();
  if (s.includes('error') || s.includes('failed') || s === 'down') return 'error';
  if (s === 'healthy' || s === 'ok' || s === 'active' || s === 'up') return 'healthy';
  return 'unknown';
}

function SourceRow({ source }: { source: DataSourceHealth }) {
  const tone = statusTone(source.status);
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground truncate">{source.source_name}</p>
            {source.source_url && (
              <a
                href={source.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary shrink-0"
                aria-label="Open source"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {source.category} · {source.source_type}
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
            tone === 'healthy'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              : tone === 'error'
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
          }`}
        >
          {source.status || 'unknown'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-sm font-black text-foreground">{source.records_count}</p>
          <p className="text-[10px] font-semibold text-muted-foreground">Records</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-sm font-black text-foreground">{source.failure_count}</p>
          <p className="text-[10px] font-semibold text-muted-foreground">Failures</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-sm font-black text-foreground">{source.allowlisted ? 'Yes' : 'No'}</p>
          <p className="text-[10px] font-semibold text-muted-foreground">Allowlisted</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Last OK: {fmtDateTime(source.last_success)}
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-rose-500" /> Last Fail: {fmtDateTime(source.last_failure)}
        </span>
      </div>
    </div>
  );
}

function LogRow({ log }: { log: SyncLogRow }) {
  const ok = log.status === 'success' || log.status === 'completed';
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground capitalize">{log.job_name.replace(/_/g, ' ')}</p>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
            ok
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
          }`}
        >
          {log.status || 'unknown'}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        <Metric v={log.records_found} label="Found" />
        <Metric v={log.records_added} label="Added" />
        <Metric v={log.records_updated} label="Updated" />
        <Metric v={log.records_removed + log.records_skipped} label="Skip/Removed" />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileClock className="h-3 w-3" /> {fmtDateTime(log.started_at)}
          {log.duration_ms ? ` · ${(log.duration_ms / 1000).toFixed(1)}s` : ''}
        </span>
        {log.error_message && <span className="text-rose-500 font-semibold truncate max-w-[60%]">{log.error_message}</span>}
      </div>
    </div>
  );
}

function Metric({ v, label }: { v: number; label: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <p className="text-sm font-black text-foreground">{v}</p>
      <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

export function AgriDataCenterModule() {
  const [report, setReport] = useState<AgriReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<SyncJob[] | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAgriReport();
      setReport(data);
      if (!data?.sources?.length && !data?.syncLogs?.length) {
        setError('No sync activity yet — run your first sync (Vercel cron or the buttons below).');
      }
    } catch {
      setError('Could not load the data center report. Ensure the agri-data edge function is deployed.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runSync = async (jobs: SyncJob[]) => {
    setSyncing(jobs);
    setSyncResult(null);
    try {
      const outcome = await triggerAgriSync(jobs);
      if (outcome?.ok && outcome.completed) {
        const parts = outcome.completed.map(c => `${c.job}: ${c.status} (${c.added} added, ${c.updated} updated)`);
        setSyncResult(parts.join(' · ') || 'Sync completed.');
      } else {
        setSyncResult(outcome?.error || 'Sync request failed — check the edge function.');
      }
    } catch {
      setSyncResult('Sync failed — could not reach the edge function.');
    } finally {
      setSyncing(null);
      load();
    }
  };

  const sources = report?.sources ?? [];
  const logs = report?.syncLogs ?? [];
  const healthy = sources.filter(s => statusTone(s.status) === 'healthy').length;
  const failing = sources.length - healthy;
  const totalRecords = sources.reduce((sum, s) => sum + s.records_count, 0);
  const latest = logs[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agriculture Data Center"
        subtitle="Live sync health of official agri data sources (schemes, news, MSP, insurance, loans) stored in Supabase"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => runSync(['scheme'])} disabled={!!syncing} className="rounded-xl text-xs">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing?.includes('scheme') ? 'animate-spin' : ''}`} /> Sync Schemes
            </Button>
            <Button variant="outline" onClick={() => runSync(['news'])} disabled={!!syncing} className="rounded-xl text-xs">
              <Radio className="h-3.5 w-3.5 mr-1.5" /> Sync News
            </Button>
            <Button variant="outline" onClick={() => runSync(['msp'])} disabled={!!syncing} className="rounded-xl text-xs">
              <Activity className="h-3.5 w-3.5 mr-1.5" /> Sync MSP
            </Button>
            <Button onClick={() => runSync(['scheme', 'news', 'msp'])} disabled={!!syncing} className="rounded-xl text-xs">
              <Database className="h-3.5 w-3.5 mr-1.5" /> Sync All
            </Button>
          </div>
        }
      />

      {syncResult && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{syncResult}</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 text-xs font-medium text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading data center report…</div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <StatCard title="Data Sources" value={String(sources.length)} icon={Database} iconClassName="bg-emerald-500/10 text-emerald-600" hint="allowlisted official sources" />
            <StatCard title="Healthy Sources" value={String(healthy)} icon={ShieldCheck} iconClassName="bg-emerald-500/10 text-emerald-600" hint={failing ? `${failing} failing / unverified` : 'all sources reachable'} />
            <StatCard title="Records Stored" value={String(totalRecords)} icon={Activity} iconClassName="bg-blue-500/10 text-blue-600" hint="across all tables" />
            <StatCard
              title="Latest Sync"
              value={latest ? (latest.status || '—') : '—'}
              icon={FileClock}
              iconClassName="bg-violet-500/10 text-violet-600"
              hint={latest ? `${latest.job_name.replace(/_/g, ' ')} · ${fmtDateTime(latest.started_at)}` : 'no syncs yet'}
            />
          </div>

          {sources.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Data Sources
              </h2>
              <div className="space-y-2.5">
                {sources.map(s => <SourceRow key={s.id || s.source_name} source={s} />)}
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-foreground">
                <Radio className="h-4 w-4 text-primary" /> Sync History
              </h2>
              <div className="space-y-2.5">
                {logs.slice(0, 10).map(l => <LogRow key={l.id} log={l} />)}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>
              Record counts come directly from the database. Scheduled syncs run twice daily via Vercel Cron; use the
              buttons above to trigger a manual sync on demand.
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}