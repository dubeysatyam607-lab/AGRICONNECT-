import { useState, useEffect, useCallback } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { DataColumn, DataFilter } from '../components/DataTable';
import { logAdminExport } from '../hooks/useAdminCrud';
import { fetchMandiPrices, type MandiPrice } from '@/lib/mandi-api';
import { fmtINR, timeAgo } from '../../domain/adminStore';
import { cn } from '@/lib/utils';

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
    trend: m.changePercent > 0 ? 'up' : m.changePercent < 0 ? 'down' : 'stable',
    updated: m.lastUpdated || m.arrivalDate || new Date().toISOString(),
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

const COLUMNS: DataColumn<MandiEntry>[] = [
  { key: 'crop', header: 'Crop', render: (r) => <span className="font-medium text-foreground">{r.crop}</span> },
  { key: 'market', header: 'Market', render: (r) => (
      <div>
        <p className="text-foreground">{r.market}</p>
        <p className="text-xs text-muted-foreground">{[r.district, r.state].filter(Boolean).join(', ')}</p>
      </div>
    ) },
  { key: 'minPrice', header: 'Min', align: 'right', sortValue: (r) => r.minPrice, render: (r) => <span>{fmtINR(r.minPrice)}</span> },
  { key: 'maxPrice', header: 'Max', align: 'right', sortValue: (r) => r.maxPrice, render: (r) => <span>{fmtINR(r.maxPrice)}</span> },
  { key: 'modalPrice', header: 'Modal', align: 'right', sortValue: (r) => r.modalPrice, render: (r) => <span className="font-medium">{fmtINR(r.modalPrice)}</span> },
  { key: 'trend', header: 'Trend', render: (r) => r.trend === 'up' ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : r.trend === 'down' ? <ArrowDownRight className="h-4 w-4 text-red-600" /> : <Minus className="h-4 w-4 text-muted-foreground" /> },
  { key: 'updated', header: 'Updated', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{r.updated ? timeAgo(r.updated) : '—'}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'trend', label: 'Trend', options: [{ value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }, { value: 'stable', label: 'Stable' }] },
];

export function MandiModule() {
  const [rows, setRows] = useState<MandiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mandi Data Management"
        subtitle={
          loading ? 'Fetching live mandi prices from api.data.gov.in…'
            : error ? `Error: ${error}`
            : `${rows.length} live crop-market entries from ${new Set(rows.map((r) => r.state)).size} states`
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />
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
          {error ? 'Unable to load mandi data. Check API key configuration.' : 'No mandi data available.'}
        </div>
      )}
      {rows.length > 0 && (
        <p className={cn('text-xs', rows.some((r) => r.trend === 'up') ? 'text-green-600' : 'text-muted-foreground')}>
          {rows.filter((r) => r.trend === 'up').length} crops trending up, {rows.filter((r) => r.trend === 'down').length} trending down.
        </p>
      )}
    </div>
  );
}
