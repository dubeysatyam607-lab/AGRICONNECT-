import { useState, useEffect, useCallback } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, RefreshCw, Database, BadgeCheck, History, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { DataColumn, DataFilter } from '../components/DataTable';
import { logAdminExport } from '../hooks/useAdminCrud';
import { fetchMandiPrices, type MandiPrice } from '@/lib/mandi-api';
import { fmtINR, timeAgo } from '../../domain/adminStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getAgriImageCacheStats } from '@/lib/pexels-api';

function mapMandiToEntry(m: MandiPrice): MandiEntry {
  const avg = m.minPrice && m.maxPrice ? Math.round((m.minPrice + m.maxPrice) / 2) : m.price;
  return {
    id: m.id,
    crop: m.crop,
    market: m.market,
    state: m.state,
    district: m.district,
    minPrice: m.minPrice || m.price,
    maxPrice: m.maxPrice || m.price,
    modalPrice: m.price || avg,
    unit: '/quintal',
    trend: m.status,
    updated: m.arrivalDate || m.lastUpdatedText || '',
  };
}

interface MandiEntry {
  id: string;
  crop: string;
  market: string;
  state: string;
  district?: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  updated: string;
}

interface SyncRow {
  id: number;
  status: string;
  records_fetched: number;
  records_upserted: number;
  error_message?: string | null;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number | null;
}

interface MandiStats {
  records: number;
  states: number;
  districts: number;
  markets: number;
  commodities: number;
  latestArrivalDate?: string | null;
  lastSync?: {
    status?: string;
    records_fetched?: number;
    records_upserted?: number;
    error_message?: string | null;
    started_at?: string;
    finished_at?: string;
  } | null;
  syncHistory?: SyncRow[] | null;
}

const COLUMNS: DataColumn<MandiEntry>[] = [
  { key: 'crop', header: 'Crop', render: (r) => <span className="font-medium text-foreground">{r.crop}</span> },
  { key: 'market', header: 'Market', render: (r) => (
      <div>
        <p className="text-foreground">{r.market}</p>
        <p className="text-xs text-muted-foreground">{[r.district, r.state].filter(Boolean).join(', ')}</p>
      </div>
    ) },
  { key: 'minPrice', header: 'Min', align: 'right', sortValue: (r) => r.minPrice, render: (r) => <span>{r.minPrice > 0 ? fmtINR(r.minPrice) : 'N/A'}</span> },
  { key: 'maxPrice', header: 'Max', align: 'right', sortValue: (r) => r.maxPrice, render: (r) => <span>{r.maxPrice > 0 ? fmtINR(r.maxPrice) : 'N/A'}</span> },
  { key: 'modalPrice', header: 'Modal', align: 'right', sortValue: (r) => r.modalPrice, render: (r) => <span className="font-medium">{fmtINR(r.modalPrice)}</span> },
  { key: 'trend', header: 'Range', render: (r) => r.trend === 'up' ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : r.trend === 'down' ? <ArrowDownRight className="h-4 w-4 text-red-600" /> : <Minus className="h-4 w-4 text-muted-foreground" /> },
  { key: 'updated', header: 'Arrival', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{r.updated ? r.updated.slice(0, 10) : '—'}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'trend', label: 'Range', options: [{ value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }, { value: 'stable', label: 'Stable' }] },
];

function fmtCount(n: number) {
  return n.toLocaleString('en-IN');
}

export function MandiModule() {
  const [rows, setRows] = useState<MandiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MandiStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data, error: e } = await supabase.rpc('mandi_stats');
      if (e) throw new Error(e.message || 'Failed to load mandi stats');
      setStats((data as MandiStats) || null);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMandiPrices();
      if (result.isError) {
        setError(result.errorMessage || 'Failed to fetch mandi prices');
        setRows([]);
      } else {
        setRows(result.prices.map(mapMandiToEntry));
      }
    } catch {
      setError('Network error fetching mandi data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const imageCache = getAgriImageCacheStats();
  const lastSync = stats?.lastSync;
  const syncOk = lastSync?.status === 'success';
  const syncError = lastSync?.status === 'error';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mandi Data Management"
        subtitle={
          loading ? 'Fetching verified government mandi data…'
            : error ? `Government data error: ${error}`
            : `${rows.length} verified crop-market entries from ${new Set(rows.map((r) => r.state)).size} states`
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => { loadData(); loadStats(); }}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />

      {/* Real sync/DB stats */}
      {statsLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading real sync stats…
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <StatCard icon={<Database className="h-3.5 w-3.5" />} label="Synced Records" value={fmtCount(stats?.records ?? 0)} />
          <StatCard icon={<Database className="h-3.5 w-3.5" />} label="States" value={fmtCount(stats?.states ?? 0)} />
          <StatCard icon={<Database className="h-3.5 w-3.5" />} label="Districts" value={fmtCount(stats?.districts ?? 0)} />
          <StatCard icon={<Database className="h-3.5 w-3.5" />} label="Mandis" value={fmtCount(stats?.markets ?? 0)} />
          <StatCard icon={<Database className="h-3.5 w-3.5" />} label="Commodities" value={fmtCount(stats?.commodities ?? 0)} />
          <StatCard icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Latest Arrival" value={stats?.latestArrivalDate?.slice(0, 10) || '—'} tone="muted" />
        </div>
      )}

      {/* Last sync status */}
      <div className={cn(
        'rounded-2xl border p-3 flex flex-wrap items-center justify-between gap-2 text-xs',
        syncError ? 'border-rose-500/30 bg-rose-500/5' : syncOk ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'
      )}>
        <span className="flex items-center gap-2 font-bold text-foreground">
          <History className="h-3.5 w-3.5 text-emerald-600" />
          Last AGMARKNET sync: {lastSync ? (
            <span className={syncError ? 'text-rose-600' : syncOk ? 'text-emerald-700' : 'text-amber-700'}>
              {syncError ? 'failed' : syncOk ? 'success' : (lastSync.status || 'unknown')}
            </span>
          ) : 'no sync recorded yet'}
        </span>
        {lastSync?.started_at && (
          <span className="text-muted-foreground font-medium">
            {timeAgo(lastSync.started_at)} · fetched {fmtCount(lastSync.records_fetched ?? 0)} · upserted {fmtCount(lastSync.records_upserted ?? 0)}
            {lastSync.finished_at ? ` · took ${Math.round(((new Date(lastSync.finished_at).getTime() - new Date(lastSync.started_at).getTime()) / 1000))}s` : ''}
          </span>
        )}
        {lastSync?.error_message && (
          <span className="w-full text-rose-600 font-medium break-all">{lastSync.error_message}</span>
        )}
      </div>

      {/* Recent sync history */}
      {stats?.syncHistory && stats.syncHistory.length > 0 && (
        <div className="rounded-2xl border border-border p-3">
          <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground mb-2">Recent Sync Runs</p>
          <div className="space-y-1.5">
            {stats.syncHistory.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <span className={cn('w-1.5 h-1.5 rounded-full', s.status === 'success' ? 'bg-emerald-500' : s.status === 'error' ? 'bg-rose-500' : 'bg-amber-500')} />
                  {s.started_at ? new Date(s.started_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  {s.status !== 'success' && s.error_message && <span className="text-rose-600 truncate max-w-[240px]">{s.error_message}</span>}
                </span>
                <span className="text-muted-foreground font-medium">
                  fetched {fmtCount(s.records_fetched ?? 0)} · upserted {fmtCount(s.records_upserted ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image cache status */}
      <div className="rounded-2xl border border-border p-3 flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2 font-bold text-foreground">
          <ImageIcon className="h-3.5 w-3.5 text-sky-600" />
          Crop image cache
        </span>
        <span className="text-muted-foreground font-medium">
          {fmtCount(imageCache.totalCached)} cached · {fmtCount(imageCache.verifiedCount)} verified URLs
        </span>
      </div>

      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['crop', 'market', 'state', 'district']}
        searchPlaceholder="Search crop, market, state…"
        filters={FILTERS}
        bulkActions={[]}
        exportName="mandi-prices"
        onExport={(c) => logAdminExport('Mandi Entry', c)}
        onDelete={() => loadData()}
      />
      {rows.length === 0 && !loading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {error ? 'Unable to load mandi data. Check the edge function and GOVT_DATA_API_KEY configuration.' : 'No mandi data available.'}
        </div>
      )}
      {rows.length > 0 && (
        <p className={cn('text-xs', rows.some((r) => r.trend === 'up') ? 'text-green-600' : 'text-muted-foreground')}>
          {rows.filter((r) => r.trend === 'up').length} values near the top of their published range, {rows.filter((r) => r.trend === 'down').length} near the bottom.
        </p>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone = 'default' }: { icon: React.ReactNode; label: string; value: string; tone?: 'default' | 'muted' }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-1">
      <span className={cn('flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-muted-foreground', tone === 'muted' && 'opacity-70')}>
        {icon} {label}
      </span>
      <span className="text-lg font-black text-foreground leading-none">{value}</span>
    </div>
  );
}