import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { AdminStatusBadge } from '../components/StatusBadge';
import { useAdminCrud, logAdminExport } from '../hooks/useAdminCrud';
import { fmtNumber, timeAgo } from '../../domain/adminStore';
import type { CrashReport } from '../../domain/adminTypes';

const COLUMNS: DataColumn<CrashReport>[] = [
  { key: 'error', header: 'Error', render: (r) => (
      <div>
        <p className="max-w-md font-mono text-xs font-medium text-foreground">{r.error}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">v{r.version} · {r.platform}</p>
      </div>
    ) },
  { key: 'count', header: 'Occurrences', align: 'right', sortValue: (r) => r.count, render: (r) => <span>{fmtNumber(r.count)}</span> },
  { key: 'usersAffected', header: 'Users', align: 'right', sortValue: (r) => r.usersAffected, render: (r) => <span>{fmtNumber(r.usersAffected)}</span> },
  { key: 'lastOccurred', header: 'Last Seen', render: (r) => <span className="text-muted-foreground">{timeAgo(r.lastOccurred)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['New', 'Investigating', 'Fixed', 'Ignored'].map((v) => ({ value: v, label: v })) },
  { key: 'platform', label: 'Platform', options: ['Android', 'iOS', 'Web'].map((v) => ({ value: v, label: v })) },
];

export function CrashModule() {
  const { rows, setStatus, removeMany } = useAdminCrud({ key: 'crashReports', label: 'Crash Report', idKey: 'id' });
  const open = rows.filter((r) => r.status === 'New' || r.status === 'Investigating').length;

  const bulkActions: BulkAction<CrashReport>[] = [
    { label: 'Investigate', onClick: (items) => setStatus(items, 'Investigating') },
    { label: 'Mark Fixed', variant: 'secondary', onClick: (items) => setStatus(items, 'Fixed') },
    { label: 'Ignore', variant: 'outline', onClick: (items) => setStatus(items, 'Ignored') },
    { label: 'Delete', variant: 'destructive', confirm: 'Delete the selected crash reports?', onClick: removeMany },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Crash Reports"
        subtitle={`${rows.length} reports · ${open} needing attention`}
        actions={
          open > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" /> {open} unresolved
            </span>
          ) : undefined
        }
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['error', 'version', 'platform']}
        searchPlaceholder="Search error message…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="crash-reports"
        onExport={(c) => logAdminExport('Crash Report', c)}
      />
    </div>
  );
}
