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
import { shortDate } from '../../domain/adminStore';
import type { KycRecord } from '../../domain/adminTypes';

const COLUMNS: DataColumn<KycRecord>[] = [
  { key: 'user', header: 'User', render: (r) => <span className="font-medium text-foreground">{r.user}</span> },
  { key: 'idType', header: 'ID Type' },
  { key: 'riskScore', header: 'Risk', align: 'right', sortValue: (r) => r.riskScore, render: (r) => {
      const tone = r.riskScore >= 70 ? 'text-red-600' : r.riskScore >= 40 ? 'text-amber-600' : 'text-green-600';
      return <span className={`font-medium ${tone}`}>{r.riskScore}</span>;
    } },
  { key: 'expires', header: 'Expires', className: 'hidden md:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.expires)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Verified', 'Pending', 'Rejected', 'Expired'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'user', label: 'User', type: 'text', required: true },
  { name: 'idType', label: 'ID Type', type: 'select', options: ['Aadhaar', 'Voter ID', 'PAN Card'].map((v) => ({ value: v, label: v })) },
  { name: 'riskScore', label: 'Risk Score (0-100)', type: 'number' },
  { name: 'expires', label: 'Expires', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: ['Verified', 'Pending', 'Rejected', 'Expired'].map((v) => ({ value: v, label: v })) },
];

export function KycModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'kycRecords', label: 'KYC Record', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KycRecord | null>(null);

  const bulkActions: BulkAction<KycRecord>[] = [
    { label: 'Verify', onClick: (items) => setStatus(items, 'Verified') },
    { label: 'Reject', variant: 'secondary', onClick: (items) => setStatus(items, 'Rejected') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected KYC records?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="KYC Records"
        subtitle={`${rows.length} records · ${rows.filter((r) => r.riskScore >= 70).length} high risk`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Record</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['user', 'idType']}
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="kyc-records"
        onExport={(c) => logAdminExport('KYC Record', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit KYC Record' : 'Add KYC Record'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Record'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
