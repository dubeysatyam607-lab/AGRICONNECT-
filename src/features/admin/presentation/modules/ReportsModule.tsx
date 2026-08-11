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
import { timeAgo } from '../../domain/adminStore';
import type { ReportEntity } from '../../domain/adminTypes';

const priorityClass = (p: string) =>
  p === 'Critical' ? 'text-red-600 font-semibold' : p === 'High' ? 'text-amber-600 font-semibold' : 'text-muted-foreground';

const COLUMNS: DataColumn<ReportEntity>[] = [
  { key: 'id', header: 'ID', render: (r) => <span className="font-medium text-foreground">{r.id}</span> },
  { key: 'subject', header: 'Subject', render: (r) => (
      <div>
        <p className="max-w-sm font-medium text-foreground">{r.subject}</p>
        <p className="text-xs text-muted-foreground">{r.reporter} · {r.type}</p>
      </div>
    ) },
  { key: 'category', header: 'Category', className: 'hidden md:table-cell' },
  { key: 'priority', header: 'Priority', render: (r) => <span className={priorityClass(r.priority)}>{r.priority}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'created', header: 'Created', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{timeAgo(r.created)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Open', 'In Progress', 'Resolved', 'Closed'].map((v) => ({ value: v, label: v })) },
  { key: 'priority', label: 'Priority', options: ['Low', 'Medium', 'High', 'Critical'].map((v) => ({ value: v, label: v })) },
  { key: 'type', label: 'Type', options: ['Complaint', 'Report'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'reporter', label: 'Reporter', type: 'text', required: true },
  { name: 'type', label: 'Type', type: 'select', options: ['Complaint', 'Report'].map((v) => ({ value: v, label: v })) },
  { name: 'category', label: 'Category', type: 'text' },
  { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'].map((v) => ({ value: v, label: v })) },
  { name: 'status', label: 'Status', type: 'select', options: ['Open', 'In Progress', 'Resolved', 'Closed'].map((v) => ({ value: v, label: v })) },
  { name: 'subject', label: 'Subject', type: 'textarea', full: true },
];

export function ReportsModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'reports', label: 'Report/Complaint', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReportEntity | null>(null);

  const critical = rows.filter((r) => r.priority === 'Critical' && r.status !== 'Resolved' && r.status !== 'Closed').length;

  const bulkActions: BulkAction<ReportEntity>[] = [
    { label: 'Mark In Progress', onClick: (items) => setStatus(items, 'In Progress') },
    { label: 'Resolve', variant: 'secondary', onClick: (items) => setStatus(items, 'Resolved') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected reports?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Complaints"
        subtitle={`${rows.length} items · ${critical} unresolved critical`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Entry</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['id', 'subject', 'reporter', 'category']}
        searchPlaceholder="Search subject, reporter…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="reports-complaints"
        onExport={(c) => logAdminExport('Report/Complaint', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Entry' : 'Add Entry'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Entry'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
