import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { AdminStatusBadge } from '../components/StatusBadge';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { timeAgo } from '../../domain/adminStore';
import type { SupportTicket } from '../../domain/adminTypes';

const priorityClass = (p: string) =>
  p === 'Critical' ? 'text-red-600 font-semibold' : p === 'High' ? 'text-amber-600 font-semibold' : 'text-muted-foreground';

const COLUMNS: DataColumn<SupportTicket>[] = [
  { key: 'id', header: 'Ticket', render: (r) => <span className="font-medium text-foreground">{r.id}</span> },
  { key: 'subject', header: 'Subject', render: (r) => (
      <div>
        <p className="max-w-sm font-medium text-foreground">{r.subject}</p>
        <p className="text-xs text-muted-foreground">{r.user} · {r.category}</p>
      </div>
    ) },
  { key: 'priority', header: 'Priority', render: (r) => <span className={priorityClass(r.priority)}>{r.priority}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'agent', header: 'Agent' },
  { key: 'created', header: 'Created', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{timeAgo(r.created)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed'].map((v) => ({ value: v, label: v })) },
  { key: 'priority', label: 'Priority', options: ['Low', 'Medium', 'High', 'Critical'].map((v) => ({ value: v, label: v })) },
  { key: 'category', label: 'Category', options: ['Orders', 'Account', 'Payments', 'Rentals', 'Technical', 'KYC', 'Schemes', 'Marketplace'].map((v) => ({ value: v, label: v })) },
];

export function SupportModule() {
  const { rows, update, removeMany, setStatus } = useAdminCrud({ key: 'supportTickets', label: 'Support Ticket', idKey: 'id' });
  const open = rows.filter((r) => r.status === 'Open').length;

  const bulkActions: BulkAction<SupportTicket>[] = [
    { label: 'Start', onClick: (items) => setStatus(items, 'In Progress') },
    { label: 'Resolve', variant: 'secondary', onClick: (items) => setStatus(items, 'Resolved') },
    { label: 'Close', variant: 'outline', onClick: (items) => setStatus(items, 'Closed') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected tickets?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Support Tickets"
        subtitle={`${rows.length} tickets · ${open} open`}
        actions={open > 0 ? (
          <Button variant="outline" onClick={() => rows.filter((r) => r.status === 'Open').forEach((r) => update(r, { agent: 'Priya Sharma', status: 'In Progress' }))}>
            <UserCheck className="h-4 w-4" /> Claim All Open
          </Button>
        ) : undefined}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['id', 'subject', 'user', 'category', 'agent']}
        searchPlaceholder="Search ticket, subject, user…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="support-tickets"
        onExport={(c) => logAdminExport('Support Ticket', c)}
      />
    </div>
  );
}
