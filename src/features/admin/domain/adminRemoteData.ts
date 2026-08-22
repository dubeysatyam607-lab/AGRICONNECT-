import { fetchDashboardKPIs, fetchDailySeries, fetchRecentAudit } from './adminDataService';

/**
 * Real production KPIs — all from Supabase tables.
 * No fallback fake data — returns null/error when queries fail.
 */

export interface AdminKpis {
  totalFarmers: number;
  totalUsers: number;
  newToday: number;
  new7d: number;
  new30d: number;
  aiConversations: number;
  cropScans: number;
  tractorBookings: number;
  bookingsToday: number;
  cattleListings: number;
  equipmentListings: number;
  marketplaceProducts: number;
  pushSubscribers: number;
  priceAlerts: number;
  contactMessages: number;
  transportBookings: number;
  laborRequests: number;
  laborers: number;
  livestock: number;
  storageFacilities: number;
  walletCount: number;
  auditLogs: number;
  successfulPayments: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  openSupportTickets: number;
  crashReports: number;
}

export interface AdminDailyPoint {
  date: string;
  label: string;
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
  new7d: 0,
  new30d: 0,
  aiConversations: 0,
  cropScans: 0,
  tractorBookings: 0,
  bookingsToday: 0,
  cattleListings: 0,
  equipmentListings: 0,
  marketplaceProducts: 0,
  pushSubscribers: 0,
  priceAlerts: 0,
  contactMessages: 0,
  transportBookings: 0,
  laborRequests: 0,
  laborers: 0,
  livestock: 0,
  storageFacilities: 0,
  walletCount: 0,
  auditLogs: 0,
  successfulPayments: 0,
  activeSubscriptions: 0,
  expiredSubscriptions: 0,
  cancelledSubscriptions: 0,
  openSupportTickets: 0,
  crashReports: 0,
};

export interface FetchKpisResult {
  data: AdminKpiSnapshot | null;
  error: string | null;
  timedOut: boolean;
}

/** True when the platform has literally no activity yet. */
export const isPlatformEmpty = (snapshot: AdminKpiSnapshot): boolean =>
  snapshot.kpis.totalUsers === 0 &&
  snapshot.kpis.tractorBookings === 0 &&
  snapshot.kpis.cattleListings === 0 &&
  snapshot.kpis.contactMessages === 0 &&
  snapshot.kpis.transportBookings === 0 &&
  snapshot.kpis.laborRequests === 0;

export async function fetchAdminKpis(): Promise<FetchKpisResult> {
  try {
    const [kpiResult, daily, recentAudit] = await Promise.all([
      fetchDashboardKPIs(),
      fetchDailySeries(14),
      fetchRecentAudit(10),
    ]);

    if (kpiResult.error) {
      return { data: null, error: kpiResult.error, timedOut: false };
    }

    const kpis: AdminKpis = {
      totalFarmers: kpiResult.kpis.totalUsers ?? 0,
      totalUsers: kpiResult.kpis.totalUsers ?? 0,
      newToday: kpiResult.kpis.newToday ?? 0,
      new7d: kpiResult.kpis.new7d ?? 0,
      new30d: kpiResult.kpis.new30d ?? 0,
      aiConversations: kpiResult.kpis.aiConversations ?? 0,
      cropScans: kpiResult.kpis.cropScans ?? 0,
      tractorBookings: kpiResult.kpis.tractorBookings ?? 0,
      bookingsToday: kpiResult.kpis.bookingsToday ?? 0,
      cattleListings: kpiResult.kpis.cattleListings ?? 0,
      equipmentListings: kpiResult.kpis.equipmentListings ?? 0,
      marketplaceProducts: kpiResult.kpis.marketplaceProducts ?? 0,
      pushSubscribers: kpiResult.kpis.pushSubscribers ?? 0,
      priceAlerts: kpiResult.kpis.priceAlerts ?? 0,
      contactMessages: kpiResult.kpis.contactMessages ?? 0,
      transportBookings: kpiResult.kpis.transportBookings ?? 0,
      laborRequests: kpiResult.kpis.laborRequests ?? 0,
      laborers: kpiResult.kpis.laborers ?? 0,
      livestock: kpiResult.kpis.livestock ?? 0,
      storageFacilities: kpiResult.kpis.storageFacilities ?? 0,
      walletCount: kpiResult.kpis.walletCount ?? 0,
      auditLogs: kpiResult.kpis.auditLogs ?? 0,
      successfulPayments: kpiResult.kpis.successfulPayments ?? 0,
      activeSubscriptions: kpiResult.kpis.activeSubscriptions ?? 0,
      expiredSubscriptions: kpiResult.kpis.expiredSubscriptions ?? 0,
      cancelledSubscriptions: kpiResult.kpis.cancelledSubscriptions ?? 0,
      openSupportTickets: kpiResult.kpis.openSupportTickets ?? 0,
      crashReports: kpiResult.kpis.crashReports ?? 0,
    };

    return {
      data: { generatedAt: new Date().toISOString(), kpis, daily, recentAudit },
      error: null,
      timedOut: false,
    };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error', timedOut: false };
  }
}
