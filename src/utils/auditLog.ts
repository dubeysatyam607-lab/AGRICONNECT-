export interface AuthAuditEntry {
  action: string;
  identifier: string;
  ip?: string;
  outcome: 'success' | 'failure';
}

const AUDIT_STORAGE_KEY = 'agri_auth_audit_log';
const MAX_ENTRIES = 200;

/**
 * Lightweight client-side audit trail for authentication events.
 * Persists recent entries to localStorage so security-relevant actions can be
 * reviewed by the user. Never throws — audit failures must not block auth.
 */
export async function auditLog(entry: AuthAuditEntry): Promise<void> {
  try {
    if (typeof console !== 'undefined') {
      console.info('[auth-audit]', entry);
    }
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(AUDIT_STORAGE_KEY);
    const log: AuthAuditEntry[] = stored ? JSON.parse(stored) : [];
    log.unshift(entry);
    window.localStorage.setItem(
      AUDIT_STORAGE_KEY,
      JSON.stringify(log.slice(0, MAX_ENTRIES)),
    );
  } catch {
    /* audit must never break authentication */
  }
}

export function getAuthAuditLog(): AuthAuditEntry[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = window.localStorage.getItem(AUDIT_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AuthAuditEntry[]) : [];
  } catch {
    return [];
  }
}