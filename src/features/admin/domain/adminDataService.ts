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
// COUNT QUERIES (for KPIs)
// ============================================================

async function count(table: string, filters?: Array<{ column: string; op: string; value: unknown }>): Promise<number> {
  try {
    let q = supabase.from(table).select('id', { count: 'exact', head: true });
    if (filters) {
      for (const f of filters) {
        if (f.op === 'eq') q = q.eq(f.column, f.value as string);
        else if (f.op === 'neq') q = q.neq(f.column, f.value as string);
        else if (f.op === 'gte') q = q.gte(f.column, f.value as string);
        else if (f.op === 'lt') q = q.lt(f.column, f.value as string);
      }
    }
    const { data, error } = await q;
    return error ? 0 : (data as unknown as { count: number }[] | null)?.length ?? 0;
  } catch { return 0; }
}

// Fix: use count from supabase response properly
async function countRows(table: string, filters?: Array<{ column: string; op: string; value: unknown }>): Promise<number> {
  try {
    let q = supabase.from(table).select('id', { count: 'exact', head: true });
    if (filters) {
      for (const f of filters) {
        if (f.op === 'eq') q = q.eq(f.column, f.value as string);
        else if (f.op === 'neq') q = q.neq(f.column, f.value as string);
        else if (f.op === 'gte') q = q.gte(f.column, f.value as string);
        else if (f.op === 'lt') q = q.lt(f.column, f.value as string);
      }
    }
    const { count, error } = await q;
    return error ? 0 : (count ?? 0);
  } catch { return 0; }
}

export async function fetchDashboardKPIs(): Promise<{
  kpis: Record<string, number>;
  error: string | null;
}> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const d7Ago = new Date(Date.now() - 7 * 86400000).toISOString();
  const d30Ago = new Date(Date.now() - 30 * 86400000).toISOString();

  try {
    const results = await Promise.all([
      countRows('profiles'),
      countRows('profiles', [{ column: 'created_at', op: 'gte', value: todayStart }]),
      countRows('profiles', [{ column: 'created_at', op: 'gte', value: d7Ago }]),
      countRows('profiles', [{ column: 'created_at', op: 'gte', value: d30Ago }]),
      countRows('ai_conversations'),
      countRows('crop_scans'),
      countRows('tractor_bookings'),
      countRows('tractor_bookings', [{ column: 'created_at', op: 'gte', value: todayStart }]),
      countRows('cattle_listings'),
      countRows('tractor_listings'),
      countRows('store_inventory'),
      countRows('push_subscriptions'),
      countRows('price_alerts'),
      countRows('contact_messages'),
      countRows('transport_bookings'),
      countRows('labor_requests'),
      countRows('laborers'),
      countRows('livestock'),
      countRows('storage_facilities'),
      countRows('wallets'),
      countRows('audit_logs'),
      countRows('payments', [{ column: 'status', op: 'eq', value: 'success' }]),
      countRows('user_subscriptions', [{ column: 'status', op: 'eq', value: 'active' }]),
      countRows('user_subscriptions', [{ column: 'status', op: 'eq', value: 'expired' }]),
      countRows('user_subscriptions', [{ column: 'status', op: 'eq', value: 'cancelled' }]),
      countRows('support_tickets', [{ column: 'status', op: 'eq', value: 'open' }]),
      countRows('crash_reports'),
    ]);

    const kpis = {
      totalUsers: results[0],
      newToday: results[1],
      new7d: results[2],
      new30d: results[3],
      aiConversations: results[4],
      cropScans: results[5],
      tractorBookings: results[6],
      bookingsToday: results[7],
      cattleListings: results[8],
      equipmentListings: results[9],
      marketplaceProducts: results[10],
      pushSubscribers: results[11],
      priceAlerts: results[12],
      contactMessages: results[13],
      transportBookings: results[14],
      laborRequests: results[15],
      laborers: results[16],
      livestock: results[17],
      storageFacilities: results[18],
      walletCount: results[19],
      auditLogs: results[20],
      successfulPayments: results[21],
      activeSubscriptions: results[22],
      expiredSubscriptions: results[23],
      cancelledSubscriptions: results[24],
      openSupportTickets: results[25],
      crashReports: results[26],
    };

    return { kpis, error: null };
  } catch (err: unknown) {
    return { kpis: {}, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================
// DAILY SERIES (for charts)
// ============================================================

export async function fetchDailySeries(days: number): Promise<Array<{
  date: string;
  label: string;
  newUsers: number;
  totalUsers: number;
  tractorBookings: number;
  cattleListings: number;
  requests: number;
}>> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [profiles, bookings, cattle, messages, transports, labors, allProfiles] = await Promise.all([
      supabase.from('profiles').select('created_at').gte('created_at', since),
      supabase.from('tractor_bookings').select('created_at').gte('created_at', since),
      supabase.from('cattle_listings').select('created_at').gte('created_at', since),
      supabase.from('contact_messages').select('created_at').gte('created_at', since),
      supabase.from('transport_bookings').select('created_at').gte('created_at', since),
      supabase.from('labor_requests').select('created_at').gte('created_at', since),
      supabase.from('profiles').select('created_at'),
    ]);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const profilesByDay = new Map<string, number>();
    const allProfData = (allProfiles.data ?? []) as Array<{ created_at: string }>;
    const beforeWindow = allProfData.filter(p => new Date(p.created_at) < new Date(Date.now() - (days - 1) * 86400000)).length;
    let cumUsers = beforeWindow;

    for (const p of ((profiles.data ?? []) as Array<{ created_at: string }>)) {
      const d = new Date(p.created_at).toISOString().slice(0, 10);
      profilesByDay.set(d, (profilesByDay.get(d) ?? 0) + 1);
    }

    const bookingsByDay = new Map<string, number>();
    for (const b of ((bookings.data ?? []) as Array<{ created_at: string }>)) {
      const d = new Date(b.created_at).toISOString().slice(0, 10);
      bookingsByDay.set(d, (bookingsByDay.get(d) ?? 0) + 1);
    }

    const cattleByDay = new Map<string, number>();
    for (const c of ((cattle.data ?? []) as Array<{ created_at: string }>)) {
      const d = new Date(c.created_at).toISOString().slice(0, 10);
      cattleByDay.set(d, (cattleByDay.get(d) ?? 0) + 1);
    }

    const reqsByDay = new Map<string, number>();
    for (const r of [...((messages.data ?? []) as Array<{ created_at: string }>), ...((transports.data ?? []) as Array<{ created_at: string }>), ...((labors.data ?? []) as Array<{ created_at: string }>)]) {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      reqsByDay.set(d, (reqsByDay.get(d) ?? 0) + 1);
    }

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    return Array.from({ length: days }, (_, i) => {
      const d = new Date(todayDate.getTime() - (days - 1 - i) * 86400000);
      const ds = d.toISOString().slice(0, 10);
      const newUsers = profilesByDay.get(ds) ?? 0;
      cumUsers += newUsers;
      return {
        date: ds,
        label: dayNames[d.getDay()],
        newUsers,
        totalUsers: cumUsers,
        tractorBookings: bookingsByDay.get(ds) ?? 0,
        cattleListings: cattleByDay.get(ds) ?? 0,
        requests: reqsByDay.get(ds) ?? 0,
      };
    });
  } catch {
    return [];
  }
}

// ============================================================
// AUDIT LOG
// ============================================================

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
