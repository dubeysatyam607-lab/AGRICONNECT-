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
import { fmtCompact, fmtNumber, shortDate } from '../../domain/adminStore';
import type { KnowledgeArticle } from '../../domain/adminTypes';

const COLUMNS: DataColumn<KnowledgeArticle>[] = [
  { key: 'title', header: 'Article', render: (r) => (
      <div>
        <p className="max-w-md font-medium text-foreground">{r.title}</p>
        <p className="text-xs text-muted-foreground">{r.category} · {r.language}</p>
      </div>
    ) },
  { key: 'author', header: 'Author', className: 'hidden md:table-cell' },
  { key: 'views', header: 'Views', align: 'right', sortValue: (r) => r.views, render: (r) => <span>{fmtCompact(r.views)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'published', header: 'Published', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.published)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Published', 'Draft', 'Archived'].map((v) => ({ value: v, label: v })) },
  { key: 'category', label: 'Category', options: ['Crop Cultivation', 'Pest & Disease', 'Soil Health', 'Irrigation', 'Organic Farming', 'Machinery', 'Livestock', 'Post-Harvest'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true, full: true },
  { name: 'category', label: 'Category', type: 'text' },
  { name: 'author', label: 'Author', type: 'text' },
  { name: 'language', label: 'Language', type: 'text' },
  { name: 'views', label: 'Views', type: 'number' },
  { name: 'published', label: 'Published', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft', 'Archived'].map((v) => ({ value: v, label: v })) },
];

export function KnowledgeModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'knowledgeArticles', label: 'Knowledge Article', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);

  const bulkActions: BulkAction<KnowledgeArticle>[] = [
    { label: 'Publish', onClick: (items) => setStatus(items, 'Published') },
    { label: 'Archive', variant: 'secondary', onClick: (items) => setStatus(items, 'Archived') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected articles?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Knowledge Hub"
        subtitle={`${fmtNumber(rows.length)} articles across ${fmtNumber(new Set(rows.map((r) => r.category)).size)} categories`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Article</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['title', 'author', 'category', 'language']}
        searchPlaceholder="Search title, author…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="knowledge-hub"
        onExport={(c) => logAdminExport('Knowledge Article', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Article' : 'Add Article'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Add Article'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
    </div>
  );
}
