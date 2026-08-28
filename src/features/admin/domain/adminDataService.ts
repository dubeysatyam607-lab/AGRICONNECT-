import { supabase } from '@/integrations/supabase/client';

// ============================================================
// ADMIN RBAC SERVICE
// ============================================================

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
}

export interface AdminUserRecord {
  id: string;
  user_id: string;
  role_id: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  created_at: string;
  updated_at: string;
  last_login: string | null;
  // Joined from profiles
  full_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
}

export interface SubscriptionPlanRecord {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface UserSubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'paused' | 'trial';
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  // Joined
  plan_name?: string;
  user_name?: string;
  user_email?: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  provider: string;
  provider_txn_id: string | null;
  purpose: string | null;
  status: 'pending' | 'success' | 'failed' | 'refunded' | 'cancelled';
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
  // Joined
  user_name?: string;
  user_email?: string;
}

export interface WalletRecord {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export interface WalletTransactionRecord {
  id: string;
  wallet_id: string;
  user_id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string | null;
  admin_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

// ============================================================
// PROFILES (Users / Farmers)
// ============================================================

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
  state: string | null;
  district: string | null;
  village: string | null;
  language: string | null;
  created_at: string;
  updated_at: string | null;
  last_sign_in_at: string | null;
}

export async function fetchAllProfiles(opts?: { limit?: number; offset?: number }): Promise<{ data: UserProfile[]; total: number; error: string | null }> {
  const limit = opts?.limit ?? 100;
  const offset = opts?.offset ?? 0;
  
  try {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return { data: [], total: 0, error: error.message };
    return { data: (data as UserProfile[]) ?? [], total: count ?? 0, error: null };
  } catch (err: unknown) {
    return { data: [], total: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function fetchProfileById(id: string): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) return { data: null, error: error.message };
    return { data: data as UserProfile, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function searchProfiles(query: string): Promise<{ data: UserProfile[]; error: string | null }> {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return getProfiles({ limit: 50 });
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQuery);
    let builder = supabase.from('profiles').select('*');
    if (isUuid) {
      builder = builder.or(`id.eq.${cleanQuery},full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`);
    } else {
      builder = builder.or(`full_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`);
    }
    const { data, error } = await builder
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return { data: [], error: error.message };
    return { data: (data as UserProfile[]) ?? [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================
// DASHBOARD SNAPSHOT — single authoritative RPC
// ============================================================

export interface AdminSnapshot {
  generatedAt: string;
  kpis: Record<string, number>;
  daily: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
    tractorBookings: number;
    cattleListings: number;
    requests: number;
  }>;
  recentAudit: Array<{
    id: string;
    actor: string;
    action: string;
    entity: string;
    summary: string;
    timestamp: string;
  }>;
}

/**
 * Single authoritative dashboard snapshot: one SECURITY DEFINER RPC that
 * returns every KPI + the 14-day daily series + recent audit in ONE
 * round-trip with database-local dates. No client-side count query soup,
 * no silent zeros — an error is surfaced, never masked.
 */
export async function fetchAdminSnapshot(timeoutMs = 15000): Promise<{
  data: AdminSnapshot | null;
  error: string | null;
  timedOut: boolean;
}> {
  let timedOut = false;
  try {
    const timer = setTimeout(() => { timedOut = true; }, timeoutMs);
    const { data, error } = await supabase.rpc('admin_get_dashboard_kpis');
    clearTimeout(timer);
    if (error) return { data: null, error: error.message, timedOut };
    if (typeof data !== 'object' || data === null) {
      return { data: null, error: 'Invalid response from server', timedOut };
    }
    const raw = data as Record<string, unknown>;
    const kpis = (raw.kpis ?? {}) as Record<string, number>;
    const daily = (raw.daily ?? []) as AdminSnapshot['daily'];
    const recentAudit = (raw.recentAudit ?? []) as AdminSnapshot['recentAudit'];
    return {
      data: {
        generatedAt: typeof raw.generated_at === 'string' ? raw.generated_at : new Date().toISOString(),
        kpis,
        daily,
        recentAudit,
      },
      error: null,
      timedOut,
    };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error', timedOut };
  }
}

export async function fetchRecentAudit(limit = 10): Promise<Array<{
  id: string;
  actor: string;
  action: string;
  entity: string;
  summary: string;
  timestamp: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, table_name, record_id, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      actor: String(r.user_id ?? 'System').slice(0, 8),
      action: String(r.action),
      entity: String(r.table_name),
      summary: `${String(r.action)} on ${String(r.table_name)}${r.record_id ? ` (${String(r.record_id).slice(0, 8)})` : ''}`,
      timestamp: String(r.created_at),
    }));
  } catch {
    return [];
  }
}

// ============================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================

export async function fetchSubscriptionPlans(): Promise<{ data: SubscriptionPlanRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase.from('subscription_plans').select('*').order('sort_order');
    if (error) return { data: [], error: error.message };
    return { data: (data as SubscriptionPlanRecord[]) ?? [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function fetchUserSubscriptions(): Promise<{ data: UserSubscriptionRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(name)')
      .order('created_at', { ascending: false });
    if (error) return { data: [], error: error.message };
    const rows = (data ?? []) as Array<Record<string, unknown> & { subscription_plans?: { name: string } }>;
    return {
      data: rows.map(r => ({
        ...(r as unknown as UserSubscriptionRecord),
        plan_name: r.subscription_plans?.name ?? 'Unknown',
      })),
      error: null,
    };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================
// PAYMENTS
// ============================================================

export async function fetchPayments(limit = 100): Promise<{ data: PaymentRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { data: [], error: error.message };
    return { data: (data as PaymentRecord[]) ?? [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================
// WALLET
// ============================================================

export async function fetchWallets(): Promise<{ data: WalletRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase.from('wallets').select('*').order('balance', { ascending: false });
    if (error) return { data: [], error: error.message };
    return { data: (data as WalletRecord[]) ?? [], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================
// GENERIC TABLE FETCHER
// ============================================================

export async function fetchTableRows<T extends Record<string, unknown>>(
  table: string,
  opts?: { limit?: number; order?: { column: string; ascending?: boolean }; filters?: Array<{ column: string; op: string; value: unknown }> },
): Promise<{ data: T[]; total: number; error: string | null }> {
  try {
    let q = supabase.from(table).select('*', { count: 'exact' });
    if (opts?.filters) {
      for (const f of opts.filters) {
        if (f.op === 'eq') q = q.eq(f.column, f.value as string);
        else if (f.op === 'neq') q = q.neq(f.column, f.value as string);
        else if (f.op === 'gte') q = q.gte(f.column, f.value as string);
        else if (f.op === 'ilike') q = q.ilike(f.column, f.value as string);
      }
    }
    if (opts?.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? false });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, count, error } = await q;
    if (error) return { data: [], total: 0, error: error.message };
    return { data: (data as T[]) ?? [], total: count ?? 0, error: null };
  } catch (err: unknown) {
    return { data: [], total: 0, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
