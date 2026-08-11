import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { DataColumn, DataFilter } from '../components/DataTable';
import { useAdminStore } from '../hooks/useAdminStore';
import { logAdminExport } from '../hooks/useAdminCrud';
import { timeAgo } from '../../domain/adminStore';
import type { AdminAuditLog, AdminAuditAction } from '../../domain/adminTypes';

const actionTone: Record<AdminAuditAction, string> = {
  CREATE: 'text-green-600',
  UPDATE: 'text-blue-600',
  DELETE: 'text-red-600',
  BULK: 'text-red-600',
  LOGIN: 'text-sky-600',
  LOGOUT: 'text-sky-600',
  EXPORT: 'text-purple-600',
  ASSIGN: 'text-indigo-600',
  APPROVE: 'text-green-600',
  REJECT: 'text-red-600',
  STATUS: 'text-amber-600',
  SEND: 'text-teal-600',
};

const COLUMNS: DataColumn<AdminAuditLog>[] = [
  { key: 'timestamp', header: 'Time', render: (r) => <span className="whitespace-nowrap text-muted-foreground">{timeAgo(r.timestamp)}</span> },
  { key: 'actor', header: 'Actor', render: (r) => <span className="font-medium text-foreground">{r.actor}</span> },
  { key: 'action', header: 'Action', render: (r) => <span className={`font-mono text-xs font-semibold ${actionTone[r.action] ?? ''}`}>{r.action}</span> },
  { key: 'entity', header: 'Entity', render: (r) => (
      <div>
        <p className="text-foreground">{r.entity}</p>
        <p className="text-xs text-muted-foreground">{r.entityId}</p>
      </div>
    ) },
  { key: 'summary', header: 'Summary', className: 'hidden lg:table-cell', render: (r) => <span className="max-w-md text-muted-foreground">{r.summary}</span> },
];

const FILTERS: DataFilter[] = [
  {
    key: 'action',
    label: 'Action',
    options: (['CREATE', 'UPDATE', 'DELETE', 'BULK', 'LOGIN', 'LOGOUT', 'EXPORT', 'ASSIGN', 'APPROVE', 'REJECT', 'STATUS', 'SEND'] as AdminAuditAction[]).map((v) => ({ value: v, label: v })),
  },
];

export function AuditModule() {
  const state = useAdminStore();
  const logs = state.auditLogs;

  return (
    <div className="space-y-4">
      <PageHeader title="Audit Logs" subtitle={`${logs.length} recent admin & system actions (append-only, newest first)`} />
      <DataTable
        data={logs}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['actor', 'action', 'entity', 'entityId', 'summary']}
        searchPlaceholder="Search actor, entity, summary…"
        filters={FILTERS}
        exportName="audit-logs"
        onExport={(c) => logAdminExport('Audit Log', c)}
        pageSizeOptions={[10, 25, 50]}
        defaultPageSize={10}
      />
    </div>
  );
}
