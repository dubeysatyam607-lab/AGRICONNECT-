import type {
  AdminAuditAction,
  AdminAuditLog,
  AdminCollectionKey,
  AdminState,
} from './adminTypes';
import { ADMIN_SESSION_KEY, ADMIN_STORAGE_KEY, ADMIN_SEED_VERSION } from './adminTypes';
import { buildSeedState } from './adminSeed';

/**
 * Local-first admin store.
 * - Single AdminState persisted to localStorage.
 * - Every mutation is versioned and writes an audit log entry.
 * - Components subscribe through useAdminStore (useSyncExternalStore).
 */

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

const STORAGE_VERSION_KEY = 'agri_admin_store_version';

const isBrowser = (): boolean => typeof window !== 'undefined';

const loadStoredState = (): AdminState | null => {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminState;
    if (!parsed || parsed.version !== ADMIN_SEED_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

let state: AdminState = loadStoredState() ?? buildSeedState();

const listeners = new Set<() => void>();

const persist = (next: AdminState): void => {
  state = next;
  if (isBrowser()) {
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(STORAGE_VERSION_KEY, String(ADMIN_SEED_VERSION));
    } catch {
      /* quota exceeded — keep in-memory state */
    }
  }
  listeners.forEach((l) => l());
};

const emit = (): void => listeners.forEach((l) => l());

/* ── Session ──────────────────────────────────────────────────────────── */

// No hardcoded demo administrator. The actor identity is only ever what was
// stored from a real authenticated session; an empty session means "unknown".
const defaultSession = (): AdminSession => ({
  userId: '',
  name: '',
  email: '',
  roleId: '',
  roleName: '',
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

const clearSession = (): void => {
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

/* ── Mutation core ────────────────────────────────────────────────────── */

const appendAudit = (current: AdminState, input: AuditInput): AdminAuditLog[] => {
  const session = getAdminSession();
  const entry: AdminAuditLog = {
    id: Math.random().toString(36).slice(2, 10),
    actor: session.name,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    summary: input.summary,
    timestamp: new Date().toISOString(),
  };
  return [entry, ...current.auditLogs].slice(0, 500);
};

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
    next.auditLogs = appendAudit(next, options.audit);
  }
  persist(next);
}

/** Append a standalone audit entry (login/logout/export). */
export const logAdminAudit = (input: AuditInput): void => {
  persist({ ...state, auditLogs: appendAudit(state, input) });
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

/** Bulk action helper — applies an updater to selected ids and audits once. */
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

/** Reset demo data back to the seed. */
export const resetAdminData = (): void => {
  persist(buildSeedState());
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
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
