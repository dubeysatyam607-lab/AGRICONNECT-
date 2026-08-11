import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { EntityDialog } from '../components/EntityDialog';
import type { FormField } from '../components/EntityDialog';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { fmtINR, timeAgo } from '../../domain/adminStore';
import type { MandiEntry } from '../../domain/adminTypes';
import { cn } from '@/lib/utils';

const TrendIcon = ({ trend }: { trend: MandiEntry['trend'] }) => {
  if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-green-600" />;
  if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const COLUMNS: DataColumn<MandiEntry>[] = [
  { key: 'crop', header: 'Crop', render: (r) => <span className="font-medium text-foreground">{r.crop}</span> },
  { key: 'market', header: 'Market', render: (r) => (
      <div>
        <p className="text-foreground">{r.market}</p>
        <p className="text-xs text-muted-foreground">{r.state}</p>
      </div>
    ) },
  { key: 'minPrice', header: 'Min', align: 'right', sortValue: (r) => r.minPrice, render: (r) => <span>{fmtINR(r.minPrice)}</span> },
  { key: 'maxPrice', header: 'Max', align: 'right', sortValue: (r) => r.maxPrice, render: (r) => <span>{fmtINR(r.maxPrice)}</span> },
  { key: 'modalPrice', header: 'Modal', align: 'right', sortValue: (r) => r.modalPrice, render: (r) => <span className="font-medium">{fmtINR(r.modalPrice)}</span> },
  { key: 'trend', header: 'Trend', render: (r) => <TrendIcon trend={r.trend} /> },
  { key: 'updated', header: 'Updated', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{timeAgo(r.updated)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'state', label: 'State', options: ['Rajasthan', 'Haryana', 'Karnataka', 'Madhya Pradesh', 'Maharashtra', 'Delhi', 'Gujarat', 'Uttar Pradesh', 'Tamil Nadu', 'Andhra Pradesh'].map((v) => ({ value: v, label: v })) },
  { key: 'trend', label: 'Trend', options: [{ value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }, { value: 'stable', label: 'Stable' }] },
];

const FIELDS: FormField[] = [
  { name: 'crop', label: 'Crop', type: 'text', required: true },
  { name: 'market', label: 'Market', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'minPrice', label: 'Min Price', type: 'number' },
  { name: 'maxPrice', label: 'Max Price', type: 'number' },
  { name: 'modalPrice', label: 'Modal Price', type: 'number' },
  { name: 'unit', label: 'Unit', type: 'text' },
  { name: 'trend', label: 'Trend', type: 'select', options: [{ value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }, { value: 'stable', label: 'Stable' }] },
];

export function MandiModule() {
  const { rows, create, update, remove, removeMany } = useAdminCrud({ key: 'mandiPrices', label: 'Mandi Entry', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MandiEntry | null>(null);

  const bulkActions: BulkAction<MandiEntry>[] = [
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected mandi entries?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mandi Data Management"
        subtitle={`${rows.length} crop-market listings across ${new Set(rows.map((r) => r.state)).size} states`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Entry</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['crop', 'market', 'state']}
        searchPlaceholder="Search crop, market…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="mandi-prices"
        onExport={(c) => logAdminExport('Mandi Entry', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Entry' : 'Add Mandi Entry'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Entry'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
      <p className={cn('text-xs', rows.some((r) => r.trend === 'up') ? 'text-green-600' : 'text-muted-foreground')}>
        {rows.filter((r) => r.trend === 'up').length} crops trending up, {rows.filter((r) => r.trend === 'down').length} trending down.
      </p>
    </div>
  );
}
