import { useState } from 'react';
import { Plus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { EntityDialog } from '../components/EntityDialog';
import type { FormField } from '../components/EntityDialog';
import { AdminStatusBadge } from '../components/StatusBadge';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { fmtNumber, shortDate } from '../../domain/adminStore';
import type { FarmerEntity } from '../../domain/adminTypes';

const COLUMNS: DataColumn<FarmerEntity>[] = [
  { key: 'name', header: 'Farmer', render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.phone}</p>
      </div>
    ) },
  { key: 'village', header: 'Location', render: (r) => (
      <div>
        <p className="text-foreground">{r.village}</p>
        <p className="text-xs text-muted-foreground">{r.district}, {r.state}</p>
      </div>
    ) },
  { key: 'landSize', header: 'Land', align: 'right', sortValue: (r) => r.landSize, render: (r) => <span>{r.landSize} {r.unit}</span> },
  { key: 'primaryCrop', header: 'Primary Crop' },
  { key: 'orders', header: 'Orders', align: 'right', sortValue: (r) => r.orders, render: (r) => <span>{fmtNumber(r.orders)}</span> },
  { key: 'rating', header: 'Rating', align: 'right', sortValue: (r) => r.rating, render: (r) => <span>{r.rating || '—'}</span> },
  { key: 'verification', header: 'Verification', render: (r) => <AdminStatusBadge status={r.verification} /> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'joined', header: 'Joined', render: (r) => <span className="text-muted-foreground">{shortDate(r.joined)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Active', 'Suspended', 'Pending'].map((v) => ({ value: v, label: v })) },
  { key: 'verification', label: 'Verification', options: ['Verified', 'Unverified'].map((v) => ({ value: v, label: v })) },
  { key: 'state', label: 'State', options: [...new Set(['Rajasthan', 'Punjab', 'Madhya Pradesh', 'Maharashtra', 'Tamil Nadu', 'Uttar Pradesh', 'Andhra Pradesh', 'Bihar'])].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, full: true },
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'village', label: 'Village', type: 'text' },
  { name: 'district', label: 'District', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'landSize', label: 'Land Size', type: 'number' },
  { name: 'unit', label: 'Unit (ha/acre)', type: 'select', options: [{ value: 'ha', label: 'ha' }, { value: 'acre', label: 'acre' }] },
  { name: 'primaryCrop', label: 'Primary Crop', type: 'text' },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Suspended', 'Pending'].map((v) => ({ value: v, label: v })) },
  { name: 'verification', label: 'Verification', type: 'select', options: ['Verified', 'Unverified'].map((v) => ({ value: v, label: v })) },
  { name: 'orders', label: 'Orders', type: 'number' },
  { name: 'rating', label: 'Rating (0-5)', type: 'number' },
];

export function FarmersModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'farmers', label: 'Farmer', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FarmerEntity | null>(null);

  const bulkActions: BulkAction<FarmerEntity>[] = [
    { label: 'Activate', variant: 'default', onClick: (items) => setStatus(items, 'Active') },
    { label: 'Suspend', variant: 'secondary', onClick: (items) => setStatus(items, 'Suspended') },
    { label: 'Mark Verified', variant: 'outline', onClick: (items) => items.forEach((r) => update(r, { verification: 'Verified' })) },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected farmer records?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Farmer Management"
        subtitle={`${fmtNumber(rows.length)} registered farmers across the network`}
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Farmer
          </Button>
        }
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['name', 'phone', 'village', 'district', 'state', 'primaryCrop']}
        searchPlaceholder="Search name, village, crop…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="farmers"
        onExport={(c) => logAdminExport('Farmer', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Farmer' : 'Add Farmer'}
        description="Manage farmer identity, verification and status."
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Farmer'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
      {rows.filter((r) => r.status === 'Pending').length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserCheck className="h-3.5 w-3.5" />
          {rows.filter((r) => r.status === 'Pending').length} farmers awaiting verification.
        </p>
      )}
    </div>
  );
}
