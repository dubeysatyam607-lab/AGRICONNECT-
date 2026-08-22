import { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { DataColumn, DataFilter } from '../components/DataTable';
import { logAdminExport } from '../hooks/useAdminCrud';
import { supabase } from '@/integrations/supabase/client';
import { timeAgo } from '../../domain/adminStore';
import type { AdminAuditAction } from '../../domain/adminTypes';

interface SupabaseAuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  timestamp: string;
}

function useSupabaseAuditLogs(): SupabaseAuditLog[] {
  const [logs, setLogs] = useState<SupabaseAuditLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (error || !data || cancelled) return;

        setLogs(
          data.map((r: any) => ({
            id: r.id,
            actor: r.user_id ? String(r.user_id).slice(0, 12) : 'system',
            action: (r.action || 'UPDATE') as string,
            entity: r.table_name || 'System',
            entityId: r.record_id || r.id,
            summary: r.description || `${r.action} on ${r.table_name}`,
            timestamp: r.created_at,
          })),
        );
      } catch {
        // keep empty
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return logs;
}

const actionTone: Record<string, string> = {
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
  INSERT: 'text-green-600',
  UPSERT: 'text-blue-600',
  SELECT: 'text-purple-600',
};

const COLUMNS: DataColumn<SupabaseAuditLog>[] = [
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

const ALL_ACTIONS = ['INSERT', 'UPDATE', 'DELETE', 'UPSERT', 'SELECT', 'LOGIN', 'LOGOUT', 'EXPORT', 'BULK', 'APPROVE', 'REJECT', 'SEND', 'STATUS', 'CREATE', 'ASSIGN'] as const;

const FILTERS: DataFilter[] = [
  {
    key: 'action',
    label: 'Action',
    options: ALL_ACTIONS.map((v) => ({ value: v, label: v })),
  },
];

export function AuditModule() {
  const logs = useSupabaseAuditLogs();

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
