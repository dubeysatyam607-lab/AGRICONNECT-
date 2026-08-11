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
import type { Payment } from '../../domain/adminTypes';

const COLUMNS: DataColumn<Payment>[] = [
  { key: 'id', header: 'Payment ID', render: (r) => <span className="font-medium text-foreground">{r.id}</span> },
  { key: 'payer', header: 'Payer' },
  { key: 'purpose', header: 'Purpose', className: 'hidden lg:table-cell' },
  { key: 'method', header: 'Method', className: 'hidden md:table-cell' },
  { key: 'amount', header: 'Amount', align: 'right', sortValue: (r) => r.amount, render: (r) => <span className="font-medium">{fmtINR(r.amount)}</span> },
  { key: 'fee', header: 'Fee', align: 'right', sortValue: (r) => r.fee, render: (r) => <span className="text-muted-foreground">{fmtINR(r.fee)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'date', header: 'Date', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.date)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Success', 'Pending', 'Failed', 'Refunded'].map((v) => ({ value: v, label: v })) },
  { key: 'method', label: 'Method', options: ['UPI', 'Cash on Delivery', 'Card', 'Net Banking'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'id', label: 'Payment ID', type: 'text' },
  { name: 'payer', label: 'Payer', type: 'text', required: true },
  { name: 'purpose', label: 'Purpose', type: 'text', full: true },
  { name: 'method', label: 'Method', type: 'select', options: ['UPI', 'Cash on Delivery', 'Card', 'Net Banking'].map((v) => ({ value: v, label: v })) },
  { name: 'amount', label: 'Amount (₹)', type: 'number' },
  { name: 'fee', label: 'Fee (₹)', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: ['Success', 'Pending', 'Failed', 'Refunded'].map((v) => ({ value: v, label: v })) },
];

export function PaymentsModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'payments', label: 'Payment', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);

  const successSum = rows.filter((r) => r.status === 'Success').reduce((s, r) => s + r.amount, 0);

  const bulkActions: BulkAction<Payment>[] = [
    { label: 'Mark Success', onClick: (items) => setStatus(items, 'Success') },
    { label: 'Refund', variant: 'secondary', onClick: (items) => setStatus(items, 'Refunded') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected payments?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        subtitle={`${rows.length} transactions · ${fmtINR(successSum)} collected successfully`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Payment</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['id', 'payer', 'purpose']}
        searchPlaceholder="Search payment, payer…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="payments"
        onExport={(c) => logAdminExport('Payment', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Payment' : 'Add Payment'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Payment'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
