import type {
  AdminAuditAction,
  AdminAuditLog,
  AdminCollectionKey,
  AdminState,
} from './adminTypes';
import { ADMIN_SESSION_KEY, ADMIN_STORAGE_KEY, ADMIN_SEED_VERSION } from './adminTypes';
import {
  fetchRealFarmers,
  fetchRealEquipmentOwners,
  fetchRealProducts,
  fetchRealOrders,
  fetchRealTractorRentals,
  fetchRealSchemes,
  fetchRealNews,
  fetchRealKnowledge,
  fetchRealFaqs,
  fetchRealAiPrompts,
  fetchRealPushCampaigns,
  fetchRealReports,
  fetchRealKycRecords,
  fetchRealPayments,
  fetchRealSubscriptionPlans,
  fetchRealUserSubscriptions,
  fetchRealAds,
  fetchRealSupportTickets,
  fetchRealCrashReports,
  fetchRealAdminRoles,
  fetchRealAdminUsers,
  logAdminAudit as logAuditToSupabase,
} from './adminDatabaseService';

export interface AdminSession {
  userId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
}

export interface AuditInput {
  action: AdminAuditAction;
  entity: string;
  entityId: string;
  summary: string;
}

const isBrowser = (): boolean => typeof window !== 'undefined';

const buildEmptyState = (): AdminState => ({
  version: ADMIN_SEED_VERSION,
  seededAt: new Date().toISOString(),
  farmers: [],
  equipmentOwners: [],
  products: [],
  orders: [],
  tractorRentals: [],
  schemes: [],
  newsArticles: [],
  knowledgeArticles: [],
  faqs: [],
  aiPrompts: [],
  pushCampaigns: [],
  weatherReadings: [],
  mandiPrices: [],
  reports: [],
  verificationRequests: [],
  kycRecords: [],
  payments: [],
  subscriptionPlans: [],
  userSubscriptions: [],
  ads: [],
  supportTickets: [],
  appAnalytics: [],
  crashReports: [],
  auditLogs: [],
  adminRoles: [],
  adminUsers: [],
});

let state: AdminState = buildEmptyState();
let isSyncing = false;

const listeners = new Set<() => void>();

const emit = (): void => listeners.forEach((l) => l());

/**
 * Fetch fresh data directly from PostgreSQL / Supabase tables.
 */
export async function syncRealDatabaseState(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const [
      farmers,
      equipmentOwners,
      products,
      orders,
      tractorRentals,
      schemes,
      newsArticles,
      knowledgeArticles,
      faqs,
      aiPrompts,
      pushCampaigns,
      reports,
      kycRecords,
      payments,
      subscriptionPlans,
      userSubscriptions,
      ads,
      supportTickets,
      crashReports,
      adminRoles,
      adminUsers,
    ] = await Promise.all([
      fetchRealFarmers(),
      fetchRealEquipmentOwners(),
      fetchRealProducts(),
      fetchRealOrders(),
      fetchRealTractorRentals(),
      fetchRealSchemes(),
      fetchRealNews(),
      fetchRealKnowledge(),
      fetchRealFaqs(),
      fetchRealAiPrompts(),
      fetchRealPushCampaigns(),
      fetchRealReports(),
      fetchRealKycRecords(),
      fetchRealPayments(),
      fetchRealSubscriptionPlans(),
      fetchRealUserSubscriptions(),
      fetchRealAds(),
      fetchRealSupportTickets(),
      fetchRealCrashReports(),
      fetchRealAdminRoles(),
      fetchRealAdminUsers(),
    ]);

    state = {
      ...state,
      farmers,
      equipmentOwners,
      products,
      orders,
      tractorRentals,
      schemes,
      newsArticles,
      knowledgeArticles,
      faqs,
      aiPrompts,
      pushCampaigns,
      reports,
      kycRecords,
      payments,
      subscriptionPlans,
      userSubscriptions,
      ads,
      supportTickets,
      crashReports,
      adminRoles,
      adminUsers,
    };
    emit();
  } catch (err) {
    console.error('[AdminStore] Error syncing real database state:', err);
  } finally {
    isSyncing = false;
  }
}

// Auto sync on initial load
if (isBrowser()) {
  setTimeout(() => {
    syncRealDatabaseState();
  }, 100);
}

/* ── Session ──────────────────────────────────────────────────────────── */

const defaultSession = (): AdminSession => ({
  userId: '',
  name: '',
  email: '',
  roleId: 'role-super',
  roleName: 'Super Admin',
});

export const getAdminSession = (): AdminSession => {
  if (!isBrowser()) return defaultSession();
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return defaultSession();
    const parsed = JSON.parse(raw) as AdminSession;
    return parsed.userId ? parsed : defaultSession();
  } catch {
    return defaultSession();
  }
};

export const setAdminSession = (session: AdminSession): void => {
  if (isBrowser()) {
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }
  }
  emit();
};

export const clearSession = (): void => {
  if (isBrowser()) {
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
  emit();
};

/* ── Read API ─────────────────────────────────────────────────────────── */

export const getAdminState = (): AdminState => state;

export const subscribeAdminStore = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/* ── Mutation Core ────────────────────────────────────────────────────── */

export interface MutateOptions {
  audit?: AuditInput;
}

export function mutateCollection<K extends AdminCollectionKey>(
  key: K,
  updater: (rows: AdminState[K]) => AdminState[K],
  options?: MutateOptions,
): void {
  const next: AdminState = {
    ...state,
    [key]: updater(state[key]),
  };
  if (options?.audit) {
    const entry: AdminAuditLog = {
      id: Math.random().toString(36).slice(2, 10),
      actor: getAdminSession().name,
      action: options.audit.action,
      entity: options.audit.entity,
      entityId: options.audit.entityId,
      summary: options.audit.summary,
      timestamp: new Date().toISOString(),
    };
    next.auditLogs = [entry, ...state.auditLogs].slice(0, 500);
    logAuditToSupabase({
      action: options.audit.action,
      tableName: String(key),
      recordId: options.audit.entityId,
      newData: { summary: options.audit.summary },
    });
  }
  state = next;
  emit();
}

export const logAdminAudit = (input: AuditInput): void => {
  const entry: AdminAuditLog = {
    id: Math.random().toString(36).slice(2, 10),
    actor: getAdminSession().name,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    summary: input.summary,
    timestamp: new Date().toISOString(),
  };
  state = {
    ...state,
    auditLogs: [entry, ...state.auditLogs].slice(0, 500),
  };
  logAuditToSupabase({
    action: input.action,
    tableName: input.entity,
    recordId: input.entityId,
    newData: { summary: input.summary },
  });
  emit();
};

export const loginAdmin = (session: AdminSession): void => {
  setAdminSession(session);
  logAdminAudit({
    action: 'LOGIN',
    entity: 'adminUsers',
    entityId: session.userId,
    summary: `${session.name} signed in to admin console`,
  });
};

export const logoutAdmin = (): void => {
  const session = getAdminSession();
  logAdminAudit({
    action: 'LOGOUT',
    entity: 'adminUsers',
    entityId: session.userId,
    summary: `${session.name} signed out of admin console`,
  });
  clearSession();
};

export function bulkMutate<K extends AdminCollectionKey>(
  key: K,
  ids: string[],
  updater: (row: AdminState[K][number]) => AdminState[K][number],
  idKey: keyof AdminState[K][number],
  audit: AuditInput,
): void {
  const idSet = new Set(ids);
  mutateCollection(key, (rows) => rows.map((r) => (idSet.has(r[idKey] as unknown as string) ? updater(r) : r)), {
    audit,
  });
}

export const resetAdminData = (): void => {
  syncRealDatabaseState();
};

/* ── Formatting helpers shared by admin modules ───────────────────────── */

export const fmtINR = (value: number): string =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);

export const fmtCompact = (value: number): string => {
  if (value >= 10000000) return (value / 10000000).toFixed(1) + ' Cr';
  if (value >= 100000) return (value / 100000).toFixed(1) + ' L';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
  return String(value);
};

export const fmtNumber = (value: number): string =>
  new Intl.NumberFormat('en-IN').format(value);

export const timeAgo = (iso: string): string => {
  if (!iso) return 'Not available';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const shortDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
