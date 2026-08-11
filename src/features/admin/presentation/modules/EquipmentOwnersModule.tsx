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
import { fmtINR, fmtNumber, shortDate } from '../../domain/adminStore';
import type { EquipmentOwner } from '../../domain/adminTypes';

const COLUMNS: DataColumn<EquipmentOwner>[] = [
  { key: 'name', header: 'Owner', render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.phone}</p>
      </div>
    ) },
  { key: 'location', header: 'Location', render: (r) => (
      <div>
        <p className="text-foreground">{r.location}</p>
        <p className="text-xs text-muted-foreground">{r.state}</p>
      </div>
    ) },
  { key: 'machines', header: 'Machines', align: 'right', sortValue: (r) => r.machines, render: (r) => <span>{fmtNumber(r.machines)}</span> },
  { key: 'categories', header: 'Categories', className: 'hidden lg:table-cell' },
  { key: 'rating', header: 'Rating', align: 'right', sortValue: (r) => r.rating, render: (r) => <span>{r.rating}</span> },
  { key: 'revenue', header: 'Revenue', align: 'right', sortValue: (r) => r.revenue, render: (r) => <span className="font-medium">{fmtINR(r.revenue)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'joined', header: 'Joined', className: 'hidden md:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.joined)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Active', 'Suspended', 'Pending'].map((v) => ({ value: v, label: v })) },
  { key: 'state', label: 'State', options: ['Rajasthan', 'Punjab', 'Haryana', 'Gujarat', 'Andhra Pradesh'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'name', label: 'Owner Name', type: 'text', required: true, full: true },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'machines', label: 'Machines', type: 'number' },
  { name: 'categories', label: 'Categories', type: 'text', full: true },
  { name: 'rating', label: 'Rating (0-5)', type: 'number' },
  { name: 'revenue', label: 'Revenue (₹)', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Suspended', 'Pending'].map((v) => ({ value: v, label: v })) },
];

export function EquipmentOwnersModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'equipmentOwners', label: 'Equipment Owner', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentOwner | null>(null);

  const bulkActions: BulkAction<EquipmentOwner>[] = [
    { label: 'Activate', onClick: (items) => setStatus(items, 'Active') },
    { label: 'Suspend', variant: 'secondary', onClick: (items) => setStatus(items, 'Suspended') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected equipment owners?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Equipment Owners"
        subtitle={`${fmtNumber(rows.length)} owners renting machinery across the network`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Owner</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['name', 'phone', 'location', 'state', 'categories']}
        searchPlaceholder="Search owner, location…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="equipment-owners"
        onExport={(c) => logAdminExport('Equipment Owner', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Equipment Owner' : 'Add Equipment Owner'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Owner'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
