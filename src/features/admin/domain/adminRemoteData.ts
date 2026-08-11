import { supabase } from '@/integrations/supabase/client';

/**
 * Real production KPIs streamed from Supabase via a single admin RPC.
 * The RPC is SECURITY DEFINER + admin-gated, so the client only ever needs
 * one round-trip and never touches RLS-sensitive tables directly.
 */

export interface AdminKpis {
  totalFarmers: number;
  totalUsers: number;
  newToday: number;
  new30d: number;
  tractorBookings: number;
  bookingsToday: number;
  cattleListings: number;
  activeCattleListings: number;
  pushSubscribers: number;
  priceAlerts: number;
  contactMessages: number;
  transportBookings: number;
  laborRequests: number;
  laborers: number;
  vehicles: number;
  livestock: number;
  storageFacilities: number;
  auditLogs: number;
}

export interface AdminDailyPoint {
  date: string;
  newUsers: number;
  totalUsers: number;
  tractorBookings: number;
  cattleListings: number;
  requests: number;
}

export interface AdminAuditEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  summary: string;
  timestamp: string;
}

export interface AdminKpiSnapshot {
  generatedAt: string;
  kpis: AdminKpis;
  daily: AdminDailyPoint[];
  recentAudit: AdminAuditEntry[];
}

export const EMPTY_KPIS: AdminKpis = {
  totalFarmers: 0,
  totalUsers: 0,
  newToday: 0,
  new30d: 0,
  tractorBookings: 0,
  bookingsToday: 0,
  cattleListings: 0,
  activeCattleListings: 0,
  pushSubscribers: 0,
  priceAlerts: 0,
  contactMessages: 0,
  transportBookings: 0,
  laborRequests: 0,
  laborers: 0,
  vehicles: 0,
  livestock: 0,
  storageFacilities: 0,
  auditLogs: 0,
};

export interface FetchKpisResult {
  data: AdminKpiSnapshot | null;
  error: string | null;
  timedOut: boolean;
}

/**
 * Calls admin_get_dashboard_kpis() with an AbortController timeout so the
 * dashboard never hangs on a slow/unreachable edge.
 */
export async function fetchAdminKpis(timeoutMs = 15000): Promise<FetchKpisResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { data, error } = await supabase.rpc('admin_get_dashboard_kpis', {}, { signal: controller.signal });
    if (error) {
      const isForbidden =
        error.code === 'P0001' ||
        error.message.includes('admin role required') ||
        error.message.includes('Forbidden');
      return {
        data: null,
        error: isForbidden ? 'ADMIN_ROLE_REQUIRED' : error.message || 'Failed to load metrics',
        timedOut: false,
      };
    }
    return { data: (data as AdminKpiSnapshot | null) ?? null, error: null, timedOut: false };
  } catch (err: any) {
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      return { data: null, error: 'Request timed out', timedOut: true };
    }
    return { data: null, error: err?.message || 'Unexpected error', timedOut: false };
  } finally {
    clearTimeout(timer);
  }
}

/** True when the platform has literally no activity yet. */
export const isPlatformEmpty = (snapshot: AdminKpiSnapshot): boolean =>
  snapshot.kpis.totalUsers === 0 &&
  snapshot.kpis.tractorBookings === 0 &&
  snapshot.kpis.cattleListings === 0 &&
  snapshot.kpis.contactMessages === 0 &&
  snapshot.kpis.transportBookings === 0 &&
  snapshot.kpis.laborRequests === 0;
