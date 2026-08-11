import {
  bulkMutate,
  getAdminSession,
  mutateCollection,
} from '../../domain/adminStore';
import type { AdminAuditAction, AdminCollectionKey, AdminState } from '../../domain/adminTypes';
import { uid } from '../../domain/adminSeed';
import { useAdminStore } from '../hooks/useAdminStore';

export interface CrudConfig<K extends AdminCollectionKey> {
  key: K;
  label: string;
  idKey: keyof AdminState[K][number];
}

type RowOf<K extends AdminCollectionKey> = AdminState[K][number];

/**
 * Tiny CRUD helper over the admin store that wires mutations + audit logging
 * for a single collection.
 */
export function useAdminCrud<K extends AdminCollectionKey>(config: CrudConfig<K>) {
  const state = useAdminStore();
  const rows = state[config.key] as unknown as RowOf<K>[];

  const audit = (action: AdminAuditAction, entityId: string, summary: string) => ({
    action,
    entity: config.label,
    entityId,
    summary,
  });

  const create = (values: Record<string, any>) => {
    const idKey = String(config.idKey);
    const newRow = { ...values, [idKey]: uid() } as unknown as RowOf<K>;
    mutateCollection(config.key, (r) => [newRow, ...(r as unknown as any[])] as AdminState[K], {
      audit: audit('CREATE', String((newRow as any)[idKey]), `Created ${config.label} — ${(newRow as any).name ?? (newRow as any).title ?? (newRow as any).id}`),
    });
  };

  const update = (row: RowOf<K>, values: Record<string, any>) => {
    const idKey = String(config.idKey);
    const id = String((row as any)[idKey]);
    mutateCollection(config.key, (r) =>
      (r as unknown as any[]).map((x) => (x[idKey] === id ? { ...x, ...values } : x)) as AdminState[K],
    );
    logUpdate(config.label, id, values);
  };

  const remove = (row: RowOf<K>) => {
    const idKey = String(config.idKey);
    const id = String((row as any)[idKey]);
    mutateCollection(config.key, (r) => (r as unknown as any[]).filter((x) => x[idKey] !== id) as AdminState[K], {
      audit: audit('DELETE', id, `Deleted ${config.label} record ${id}`),
    });
  };

  const removeMany = (items: RowOf<K>[]) => {
    const idKey = String(config.idKey);
    const idSet = new Set(items.map((r) => String((r as any)[idKey])));
    mutateCollection(config.key, (r) => (r as unknown as any[]).filter((x) => !idSet.has(String(x[idKey]))) as AdminState[K], {
      audit: audit('BULK', [...idSet].join(','), `Deleted ${items.length} ${config.label} records`),
    });
  };

  const setStatus = (items: RowOf<K>[], status: string) => {
    const idKey = String(config.idKey);
    const ids = items.map((r) => String((r as any)[idKey]));
    bulkMutate(
      config.key,
      ids,
      (r) => ({ ...r, status } as RowOf<K>),
      config.idKey,
      audit('STATUS', ids.join(','), `Set ${items.length} ${config.label} to ${status}`),
    );
  };

  return { rows, create, update, remove, removeMany, setStatus };
}

export const adminActorName = (): string => getAdminSession().name;

export function logAdminExport(label: string, count: number) {
  const session = getAdminSession();
  mutateCollection('auditLogs', (logs) => [
    {
      id: uid(),
      actor: session.name,
      action: 'EXPORT',
      entity: label,
      entityId: '-',
      summary: `Exported ${count} ${label} records to CSV`,
      timestamp: new Date().toISOString(),
    },
    ...logs,
  ].slice(0, 500) as AdminState['auditLogs']);
}

function logUpdate(label: string, id: string, values: Record<string, any>) {
  const session = getAdminSession();
  mutateCollection('auditLogs', (logs) => [
    {
      id: uid(),
      actor: session.name,
      action: 'UPDATE',
      entity: label,
      entityId: id,
      summary: `Updated ${label} — changed ${Object.keys(values).join(', ')}`,
      timestamp: new Date().toISOString(),
    },
    ...logs,
  ].slice(0, 500) as AdminState['auditLogs']);
}
