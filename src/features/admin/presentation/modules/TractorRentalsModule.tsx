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
import { fmtINR, shortDate } from '../../domain/adminStore';
import type { TractorRental } from '../../domain/adminTypes';

const COLUMNS: DataColumn<TractorRental>[] = [
  { key: 'id', header: 'Booking', render: (r) => <span className="font-medium text-foreground">{r.id}</span> },
  { key: 'farmer', header: 'Farmer' },
  { key: 'tractor', header: 'Tractor', render: (r) => (
      <div>
        <p className="text-foreground">{r.tractor}</p>
        <p className="text-xs text-muted-foreground">Owner: {r.owner}</p>
      </div>
    ) },
  { key: 'duration', header: 'Duration', className: 'hidden md:table-cell' },
  { key: 'total', header: 'Total', align: 'right', sortValue: (r) => r.total, render: (r) => <span className="font-medium">{fmtINR(r.total)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'booked', header: 'Booked', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.booked)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'id', label: 'Booking ID', type: 'text' },
  { name: 'farmer', label: 'Farmer', type: 'text', required: true, full: true },
  { name: 'tractor', label: 'Tractor', type: 'text' },
  { name: 'owner', label: 'Owner', type: 'text' },
  { name: 'rate', label: 'Rate (₹/hr)', type: 'number' },
  { name: 'duration', label: 'Duration', type: 'text' },
  { name: 'total', label: 'Total (₹)', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map((v) => ({ value: v, label: v })) },
];

export function TractorRentalsModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'tractorRentals', label: 'Tractor Rental', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TractorRental | null>(null);

  const bulkActions: BulkAction<TractorRental>[] = [
    { label: 'Confirm', onClick: (items) => setStatus(items, 'Confirmed') },
    { label: 'Complete', variant: 'secondary', onClick: (items) => setStatus(items, 'Completed') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected bookings?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tractor Rentals"
        subtitle={`${rows.length} bookings · ${rows.filter((r) => r.status === 'In Progress').length} in progress`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Booking</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['id', 'farmer', 'tractor', 'owner']}
        searchPlaceholder="Search booking, farmer, tractor…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="tractor-rentals"
        onExport={(c) => logAdminExport('Tractor Rental', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Booking' : 'Add Booking'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Booking'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
