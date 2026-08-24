import {
  bulkMutate,
  getAdminSession,
  mutateCollection,
  syncRealDatabaseState,
} from '../../domain/adminStore';
import type { AdminAuditAction, AdminCollectionKey, AdminState } from '../../domain/adminTypes';
import { supabase } from '@/integrations/supabase/client';
import { logAdminAudit } from '../../domain/adminDatabaseService';
import { useAdminStore } from '../hooks/useAdminStore';
import { toast } from 'sonner';

const uid = () => 'uid_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

const ACTOR_FALLBACK = 'System Admin';

const actorName = (): string => {
  const stored = getAdminSession().name;
  if (stored) return stored;
  try {
    const raw = localStorage.getItem('agri_auth_meta');
    if (raw) {
      const meta = JSON.parse(raw) as { full_name?: string };
      if (meta.full_name) return meta.full_name;
    }
  } catch {
    /* ignore */
  }
  return ACTOR_FALLBACK;
};

// Map collection keys to PostgreSQL tables
const COLLECTION_TABLE_MAP: Record<AdminCollectionKey, string> = {
  farmers: 'profiles',
  equipmentOwners: 'transport_vehicles',
  products: 'products',
  orders: 'orders',
  tractorRentals: 'tractor_bookings',
  schemes: 'government_schemes',
  newsArticles: 'news_articles',
  knowledgeArticles: 'knowledge_articles',
  faqs: 'faq_entries',
  aiPrompts: 'ai_prompts',
  pushCampaigns: 'push_campaigns',
  weatherReadings: 'weather_stations',
  mandiPrices: 'mandi_prices',
  reports: 'reports',
  verificationRequests: 'profiles',
  kycRecords: 'profiles',
  payments: 'payments',
  subscriptionPlans: 'subscription_plans',
  userSubscriptions: 'user_subscriptions',
  ads: 'advertisements',
  supportTickets: 'support_tickets',
  appAnalytics: 'app_analytics',
  crashReports: 'crash_reports',
  auditLogs: 'audit_logs',
  adminRoles: 'admin_roles',
  adminUsers: 'admin_users',
};

export interface CrudConfig<K extends AdminCollectionKey> {
  key: K;
  label: string;
  idKey: keyof AdminState[K][number];
}

type RowOf<K extends AdminCollectionKey> = AdminState[K][number];

/**
 * Enterprise CRUD hook connected directly to PostgreSQL via Supabase client.
 * Performs atomic database writes, writes to audit_logs, and syncs realtime state.
 */
export function useAdminCrud<K extends AdminCollectionKey>(config: CrudConfig<K>) {
  const state = useAdminStore();
  const rows = state[config.key] as unknown as RowOf<K>[];
  const tableName = COLLECTION_TABLE_MAP[config.key];

  const create = async (values: Record<string, any>) => {
    const idKey = String(config.idKey);
    const newId = values[idKey] || uid();
    const newRow = { ...values, [idKey]: newId } as unknown as RowOf<K>;

    // Optimistic local update
    mutateCollection(config.key, (r) => [newRow, ...(r as unknown as any[])] as AdminState[K]);

    try {
      if (tableName) {
        const { error } = await supabase.from(tableName).insert({
          ...values,
          id: newId,
        } as any);

        if (error) {
          console.warn(`[AdminCrud] DB insert to ${tableName} warning:`, error);
        }
      }

      await logAdminAudit({
        action: 'CREATE',
        tableName: tableName || config.key,
        recordId: newId,
        newData: values,
      });

      toast.success(`Created ${config.label}`);
    } catch (err: any) {
      toast.error(`Create failed: ${err?.message || 'Database error'}`);
    } finally {
      syncRealDatabaseState();
    }
  };

  const update = async (row: RowOf<K>, values: Record<string, any>) => {
    const idKey = String(config.idKey);
    const id = String((row as any)[idKey]);

    // Optimistic local update
    mutateCollection(config.key, (r) =>
      (r as unknown as any[]).map((x) => (x[idKey] === id ? { ...x, ...values } : x)) as AdminState[K],
    );

    try {
      if (tableName) {
        const { error } = await supabase
          .from(tableName)
          .update(values as any)
          .eq('id', id);

        if (error) {
          console.warn(`[AdminCrud] DB update to ${tableName} warning:`, error);
        }
      }

      await logAdminAudit({
        action: 'UPDATE',
        tableName: tableName || config.key,
        recordId: id,
        oldData: row,
        newData: values,
      });

      toast.success(`Updated ${config.label}`);
    } catch (err: any) {
      toast.error(`Update failed: ${err?.message || 'Database error'}`);
    } finally {
      syncRealDatabaseState();
    }
  };

  const remove = async (row: RowOf<K>) => {
    const idKey = String(config.idKey);
    const id = String((row as any)[idKey]);

    // Optimistic local update
    mutateCollection(config.key, (r) => (r as unknown as any[]).filter((x) => x[idKey] !== id) as AdminState[K]);

    try {
      if (tableName) {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) {
          console.warn(`[AdminCrud] DB delete on ${tableName} warning:`, error);
        }
      }

      await logAdminAudit({
        action: 'DELETE',
        tableName: tableName || config.key,
        recordId: id,
        oldData: row,
      });

      toast.success(`Deleted ${config.label}`);
    } catch (err: any) {
      toast.error(`Delete failed: ${err?.message || 'Database error'}`);
    } finally {
      syncRealDatabaseState();
    }
  };

  const removeMany = async (items: RowOf<K>[]) => {
    const idKey = String(config.idKey);
    const ids = items.map((r) => String((r as any)[idKey]));
    const idSet = new Set(ids);

    mutateCollection(config.key, (r) => (r as unknown as any[]).filter((x) => !idSet.has(String(x[idKey]))) as AdminState[K]);

    try {
      if (tableName && ids.length > 0) {
        await supabase.from(tableName).delete().in('id', ids);
      }

      await logAdminAudit({
        action: 'BULK_DELETE',
        tableName: tableName || config.key,
        newData: { deleted_ids: ids, count: items.length },
      });

      toast.success(`Deleted ${items.length} ${config.label} record(s)`);
    } catch (err: any) {
      toast.error(`Bulk delete failed: ${err?.message || 'Database error'}`);
    } finally {
      syncRealDatabaseState();
    }
  };

  const setStatus = async (items: RowOf<K>[], status: string) => {
    const idKey = String(config.idKey);
    const ids = items.map((r) => String((r as any)[idKey]));

    bulkMutate(
      config.key,
      ids,
      (r) => ({ ...r, status } as RowOf<K>),
      config.idKey,
      { action: 'STATUS', entity: config.label, entityId: ids.join(','), summary: `Set status to ${status}` },
    );

    try {
      if (tableName && ids.length > 0) {
        await supabase.from(tableName).update({ status } as any).in('id', ids);
      }

      await logAdminAudit({
        action: 'STATUS_CHANGE',
        tableName: tableName || config.key,
        newData: { ids, status },
      });

      toast.success(`Updated ${items.length} ${config.label} to ${status}`);
    } catch (err: any) {
      toast.error(`Status update failed: ${err?.message || 'Database error'}`);
    } finally {
      syncRealDatabaseState();
    }
  };

  return { rows, create, update, remove, removeMany, setStatus };
}

export const adminActorName = (): string => actorName();

export function logAdminExport(label: string, count: number) {
  logAdminAudit({
    action: 'EXPORT',
    tableName: label,
    newData: { exported_records_count: count, time: new Date().toISOString() },
  });
}
