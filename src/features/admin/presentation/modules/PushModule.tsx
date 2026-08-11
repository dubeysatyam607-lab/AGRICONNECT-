import { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { EntityDialog } from '../components/EntityDialog';
import type { FormField } from '../components/EntityDialog';
import { AdminStatusBadge } from '../components/StatusBadge';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { fmtCompact, fmtNumber, shortDate } from '../../domain/adminStore';
import type { PushCampaign } from '../../domain/adminTypes';

const COLUMNS: DataColumn<PushCampaign>[] = [
  { key: 'title', header: 'Campaign', render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.title}</p>
        <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">{r.message}</p>
      </div>
    ) },
  { key: 'audience', header: 'Audience', className: 'hidden md:table-cell' },
  { key: 'sent', header: 'Sent', align: 'right', sortValue: (r) => r.sent, render: (r) => <span>{fmtCompact(r.sent)}</span> },
  { key: 'opened', header: 'Opened', align: 'right', sortValue: (r) => r.opened, render: (r) => (
      <span>
        {fmtCompact(r.opened)}
        {r.sent > 0 && <span className="ml-1 text-xs text-muted-foreground">({Math.round((r.opened / r.sent) * 100)}%)</span>}
      </span>
    ) },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'scheduled', header: 'Scheduled', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.scheduled)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'title', label: 'Campaign Title', type: 'text', required: true },
  { name: 'audience', label: 'Audience', type: 'text' },
  { name: 'scheduled', label: 'Send Date', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'].map((v) => ({ value: v, label: v })) },
  { name: 'message', label: 'Message', type: 'textarea', full: true },
];

export function PushModule() {
  const { rows, create, update, remove, removeMany, setStatus } = useAdminCrud({ key: 'pushCampaigns', label: 'Push Campaign', idKey: 'id' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PushCampaign | null>(null);

  const sendNow = (items: PushCampaign[]) => {
    items.forEach((r) =>
      update(r, { status: 'Sent', sent: 240000 + Math.round(Math.random() * 40000), opened: Math.round((240000 * 0.5)) }),
    );
  };

  const bulkActions: BulkAction<PushCampaign>[] = [
    { label: 'Send Now', onClick: sendNow },
    { label: 'Schedule', variant: 'secondary', onClick: (items) => setStatus(items, 'Scheduled') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected campaigns?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Push Notifications"
        subtitle={`${fmtNumber(rows.length)} campaigns · ${fmtCompact(rows.reduce((s, r) => s + r.sent, 0))} total sends`}
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> New Campaign</Button>}
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['title', 'message', 'audience']}
        searchPlaceholder="Search campaign…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="push-campaigns"
        onExport={(c) => logAdminExport('Push Campaign', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={remove}
      />
      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Campaign' : 'New Push Campaign'}
        fields={FIELDS}
        initial={editing ?? undefined}
        submitLabel={editing ? 'Save Changes' : 'Create Campaign'}
        onSubmit={(v) => (editing ? update(editing, v) : create(v))}
      />
      {rows.some((r) => r.status === 'Draft') && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Send className="h-3.5 w-3.5" />
          {rows.filter((r) => r.status === 'Draft').length} draft campaign(s) — select and use "Send Now" to broadcast.
        </p>
      )}
    </div>
  );
}
