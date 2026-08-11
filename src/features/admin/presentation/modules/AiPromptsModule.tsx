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
import { fmtCompact } from '../../domain/adminStore';
import type { AiPrompt } from '../../domain/adminTypes';

const COLUMNS: DataColumn<AiPrompt>[] = [
  { key: 'title', header: 'Prompt', render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.title}</p>
        <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">{r.prompt}</p>
      </div>
    ) },
  { key: 'category', header: 'Category', className: 'hidden md:table-cell' },
  { key: 'model', header: 'Model', className: 'hidden lg:table-cell' },
  { key: 'version', header: 'Version' },
  { key: 'usage', header: 'Usage', align: 'right', sortValue: (r) => r.usage, render: (r) => <span>{fmtCompact(r.usage)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Active', 'Draft', 'Disabled'].map((v) => ({ value: v, label: v })) },
  { key: 'category', label: 'Category', options: ['Crop Doctor', 'Market', 'Soil & Fertilizer', 'Weather', 'Schemes', 'Finance', 'Livestock'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'category', label: 'Category', type: 'select', options: ['Crop Doctor', 'Market', 'Soil & Fertilizer', 'Weather', 'Schemes', 'Finance', 'Livestock'].map((v) => ({ value: v, label: v })) },
  { name: 'model', label: 'Model', type: 'select', options: ['Llama 3.3 70B', 'Llava 1.6'].map((v) => ({ value: v, label: v })) },
  { name: 'version', label: 'Version', type: 'text' },
  { name: 'usage', label: 'Usage Count', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Draft', 'Disabled'].map((v) => ({ value: v, label: v })) },
  { name: 'prompt', label: 'Prompt Template', type: 'textarea', full: true },
];

export function AiPromptsModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'aiPrompts', label: 'AI Prompt', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AiPrompt | null>(null);

  const bulkActions: BulkAction<AiPrompt>[] = [
    { label: 'Activate', onClick: (items) => setStatus(items, 'Active') },
    { label: 'Disable', variant: 'secondary', onClick: (items) => setStatus(items, 'Disabled') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected prompts?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Prompt Management"
        subtitle={`${rows.length} prompt templates · ${fmtCompact(rows.reduce((s, r) => s + r.usage, 0))} total AI invocations`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Prompt</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['title', 'prompt', 'category', 'model']}
        searchPlaceholder="Search prompt…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="ai-prompts"
        onExport={(c) => logAdminExport('AI Prompt', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Prompt' : 'Add Prompt'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Prompt'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
