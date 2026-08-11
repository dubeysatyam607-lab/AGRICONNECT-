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
import { fmtNumber } from '../../domain/adminStore';
import type { FaqEntity } from '../../domain/adminTypes';

const COLUMNS: DataColumn<FaqEntity>[] = [
  { key: 'question', header: 'Question', render: (r) => (
      <div>
        <p className="max-w-md font-medium text-foreground">{r.question}</p>
        <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">{r.answer}</p>
      </div>
    ) },
  { key: 'category', header: 'Category' },
  { key: 'sortOrder', header: 'Order', align: 'right', sortValue: (r) => r.sortOrder, render: (r) => <span>{r.sortOrder}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Published', 'Draft'].map((v) => ({ value: v, label: v })) },
  { key: 'category', label: 'Category', options: ['Account', 'Rentals', 'Market', 'Schemes', 'AI Assistant', 'Support'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'question', label: 'Question', type: 'text', required: true, full: true },
  { name: 'answer', label: 'Answer', type: 'textarea', full: true },
  { name: 'category', label: 'Category', type: 'select', options: ['Account', 'Rentals', 'Market', 'Schemes', 'AI Assistant', 'Support'].map((v) => ({ value: v, label: v })) },
  { name: 'sortOrder', label: 'Display Order', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft'].map((v) => ({ value: v, label: v })) },
];

export function FaqModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'faqs', label: 'FAQ', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FaqEntity | null>(null);

  const bulkActions: BulkAction<FaqEntity>[] = [
    { label: 'Publish', onClick: (items) => setStatus(items, 'Published') },
    { label: 'Unpublish', variant: 'secondary', onClick: (items) => setStatus(items, 'Draft') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected FAQs?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="FAQ Management"
        subtitle={`${fmtNumber(rows.length)} FAQs · ${rows.filter((r) => r.status === 'Published').length} live`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add FAQ</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['question', 'answer', 'category']}
        searchPlaceholder="Search question…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="faqs"
        onExport={(c) => logAdminExport('FAQ', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit FAQ' : 'Add FAQ'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add FAQ'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
