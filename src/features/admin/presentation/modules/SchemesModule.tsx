import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { EntityDialog } from '../components/EntityDialog';
import type { FormField } from '../components/EntityDialog';
import { AdminStatusBadge } from '../components/StatusBadge';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { fmtNumber, shortDate } from '../../domain/adminStore';
import type { SchemeEntity } from '../../domain/adminTypes';

const COLUMNS: DataColumn<SchemeEntity>[] = [
  { key: 'title', header: 'Scheme', render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.title}</p>
        <p className="text-xs text-muted-foreground">{r.ministry}</p>
      </div>
    ) },
  { key: 'benefit', header: 'Benefit', className: 'hidden lg:table-cell' },
  { key: 'eligibility', header: 'Eligibility', className: 'hidden lg:table-cell' },
  { key: 'state', header: 'Coverage' },
  { key: 'deadline', header: 'Deadline', render: (r) => (r.deadline ? <span className="text-muted-foreground">{shortDate(r.deadline)}</span> : <span className="text-muted-foreground">{t('adm34')}</span>) },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Active', 'Closed', 'Upcoming'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'title', label: 'Scheme Title', type: 'text', required: true, full: true },
  { name: 'ministry', label: 'Ministry/Dept', type: 'text' },
  { name: 'benefit', label: 'Benefit', type: 'text', full: true },
  { name: 'eligibility', label: 'Eligibility', type: 'text', full: true },
  { name: 'state', label: 'State / Coverage', type: 'text' },
  { name: 'deadline', label: 'Deadline', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Closed', 'Upcoming'].map((v) => ({ value: v, label: v })) },
];

export function SchemesModule() {
  const { t } = useLanguage();
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'schemes', label: 'Scheme', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchemeEntity | null>(null);

  const bulkActions: BulkAction<SchemeEntity>[] = [
    { label: 'Activate', onClick: (items) => setStatus(items, 'Active') },
    { label: 'Close', variant: 'secondary', onClick: (items) => setStatus(items, 'Closed') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected schemes?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Government Schemes"
        subtitle={`${fmtNumber(rows.length)} schemes · ${rows.filter((r) => r.status === 'Active').length} active`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Scheme</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['title', 'ministry', 'benefit', 'eligibility', 'state']}
        searchPlaceholder="Search scheme, benefit…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="schemes"
        onExport={(c) => logAdminExport('Scheme', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Scheme' : 'Add Scheme'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Scheme'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
