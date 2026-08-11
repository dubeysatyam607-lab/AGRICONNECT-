import { useMemo } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { AdminStatusBadge } from '../components/StatusBadge';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { timeAgo } from '../../domain/adminStore';
import type { VerificationRequest } from '../../domain/adminTypes';

const COLUMNS: DataColumn<VerificationRequest>[] = [
  { key: 'user', header: 'Applicant', render: (r) => <span className="font-medium text-foreground">{r.user}</span> },
  { key: 'type', header: 'Type' },
  { key: 'document', header: 'Document', className: 'hidden md:table-cell' },
  { key: 'submitted', header: 'Submitted', render: (r) => <span className="text-muted-foreground">{timeAgo(r.submitted)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Pending', 'Approved', 'Rejected'].map((v) => ({ value: v, label: v })) },
  { key: 'type', label: 'Type', options: ['Farmer', 'Tractor Owner', 'Store Owner', 'Cattle Owner'].map((v) => ({ value: v, label: v })) },
];

export function VerificationModule() {
  const { rows, update, removeMany } = useAdminCrud({ key: 'verificationRequests', label: 'Verification Request', idKey: 'id' });

  const pending = useMemo(() => rows.filter((r) => r.status === 'Pending'), [rows]);
  const approved = rows.filter((r) => r.status === 'Approved').length;

  const bulkActions: BulkAction<VerificationRequest>[] = [
    { label: 'Approve Selected', onClick: (items) => items.forEach((r) => update(r, { status: 'Approved' })) },
    { label: 'Reject Selected', variant: 'secondary', onClick: (items) => items.forEach((r) => update(r, { status: 'Rejected' })) },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected verification requests?', onClick: removeMany },
  ];

  const approveAll = () => pending.forEach((r) => update(r, { status: 'Approved' }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Verification"
        subtitle={`${pending.length} pending · ${approved} approved`}
        actions={pending.length > 0 ? (
          <Button onClick={approveAll}>
            <BadgeCheck className="h-4 w-4" /> Approve All Pending ({pending.length})
          </Button>
        ) : undefined}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['user', 'type', 'document']}
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="verification-requests"
        onExport={(c) => logAdminExport('Verification Request', c)}
      />
    </div>
  );
}
