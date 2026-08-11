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
import type { Order } from '../../domain/adminTypes';

const COLUMNS: DataColumn<Order>[] = [
  { key: 'id', header: 'Order', render: (r) => <span className="font-medium text-foreground">{r.id}</span> },
  { key: 'customer', header: 'Customer' },
  { key: 'items', header: 'Items', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{r.items}</span> },
  { key: 'total', header: 'Total', align: 'right', sortValue: (r) => r.total, render: (r) => <span className="font-medium">{fmtINR(r.total)}</span> },
  { key: 'paymentMethod', header: 'Payment', className: 'hidden md:table-cell' },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'placed', header: 'Placed', className: 'hidden md:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.placed)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'].map((v) => ({ value: v, label: v })) },
  { key: 'paymentMethod', label: 'Payment', options: ['UPI', 'Cash on Delivery', 'Card', 'Net Banking'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'id', label: 'Order ID', type: 'text', full: true },
  { name: 'customer', label: 'Customer', type: 'text', required: true, full: true },
  { name: 'items', label: 'Items', type: 'text', full: true },
  { name: 'total', label: 'Total (₹)', type: 'number' },
  { name: 'paymentMethod', label: 'Payment Method', type: 'select', options: ['UPI', 'Cash on Delivery', 'Card', 'Net Banking'].map((v) => ({ value: v, label: v })) },
  { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'].map((v) => ({ value: v, label: v })) },
];

export function OrdersModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'orders', label: 'Order', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);

  const bulkActions: BulkAction<Order>[] = [
    { label: 'Mark Delivered', variant: 'default', onClick: (items) => setStatus(items, 'Delivered') },
    { label: 'Cancel', variant: 'secondary', onClick: (items) => setStatus(items, 'Cancelled') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected orders?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        subtitle={`${rows.length} orders · ₹${rows.reduce((s, r) => s + (r.status === 'Cancelled' || r.status === 'Refunded' ? 0 : r.total), 0).toLocaleString('en-IN')} active value`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Order</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['id', 'customer', 'items']}
        searchPlaceholder="Search order ID, customer…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="orders"
        onExport={(c) => logAdminExport('Order', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Order' : 'Add Order'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Order'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
