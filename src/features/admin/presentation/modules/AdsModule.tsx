import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { EntityDialog } from '../components/EntityDialog';
import type { FormField } from '../components/EntityDialog';
import { AdminStatusBadge } from '../components/StatusBadge';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { fmtCompact, fmtINR } from '../../domain/adminStore';
import type { AdEntity } from '../../domain/adminTypes';

const COLUMNS: DataColumn<AdEntity>[] = [
  { key: 'title', header: 'Advert', render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.title}</p>
        <p className="text-xs text-muted-foreground">{r.advertiser} · {r.placement}</p>
      </div>
    ) },
  { key: 'budget', header: 'Budget', align: 'right', sortValue: (r) => r.budget, render: (r) => <span>{fmtINR(r.budget)}</span> },
  { key: 'impressions', header: 'Impressions', align: 'right', sortValue: (r) => r.impressions, render: (r) => <span>{fmtCompact(r.impressions)}</span> },
  { key: 'clicks', header: 'Clicks', align: 'right', sortValue: (r) => r.clicks, render: (r) => <span>{fmtCompact(r.clicks)}</span> },
  { key: 'ctr', header: 'CTR', align: 'right', sortValue: (r) => r.impressions ? r.clicks / r.impressions : 0, render: (r) => (
      <span className="font-medium">{r.impressions ? ((r.clicks / r.impressions) * 100).toFixed(1) : '0.0'}%</span>
    ) },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Active', 'Paused', 'Ended'].map((v) => ({ value: v, label: v })) },
  { key: 'placement', label: 'Placement', options: ['Home Banner', 'Marketplace Spotlight', 'Schemes Feed', 'Store Carousel', 'Rental Home'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'title', label: 'Advert Title', type: 'text', required: true, full: true },
  { name: 'advertiser', label: 'Advertiser', type: 'text' },
  { name: 'placement', label: 'Placement', type: 'select', options: ['Home Banner', 'Marketplace Spotlight', 'Schemes Feed', 'Store Carousel', 'Rental Home'].map((v) => ({ value: v, label: v })) },
  { name: 'budget', label: 'Budget (₹)', type: 'number' },
  { name: 'impressions', label: 'Impressions', type: 'number' },
  { name: 'clicks', label: 'Clicks', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Paused', 'Ended'].map((v) => ({ value: v, label: v })) },
];

export function AdsModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'ads', label: 'Advertisement', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdEntity | null>(null);

  const bulkActions: BulkAction<AdEntity>[] = [
    { label: 'Activate', onClick: (items) => setStatus(items, 'Active') },
    { label: 'Pause', variant: 'secondary', onClick: (items) => setStatus(items, 'Paused') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected adverts?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Advertisement Management"
        subtitle={`${rows.length} campaigns · ${fmtCompact(rows.reduce((s, r) => s + r.impressions, 0))} total impressions`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Advert</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['title', 'advertiser', 'placement']}
        searchPlaceholder="Search advert, advertiser…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="advertisements"
        onExport={(c) => logAdminExport('Advertisement', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Advert' : 'Add Advert'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Advert'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
