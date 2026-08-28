import { fetchAdminSnapshot } from './adminDataService';

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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const asNumber = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0) || 0);

export async function fetchAdminKpis(): Promise<FetchKpisResult> {
  try {
    const snapshot = await fetchAdminSnapshot();
    if (snapshot.error) {
      return { data: null, error: snapshot.error, timedOut: snapshot.timedOut };
    }

    const k = snapshot.data?.kpis ?? {};
    const kpis: AdminKpis = {
      totalFarmers: asNumber(k.totalFarmers),
      totalUsers: asNumber(k.totalUsers),
      newToday: asNumber(k.newToday),
      new7d: asNumber(k.new7d),
      new30d: asNumber(k.new30d),
      aiConversations: asNumber(k.aiConversations),
      cropScans: asNumber(k.cropScans),
      tractorBookings: asNumber(k.tractorBookings),
      bookingsToday: asNumber(k.bookingsToday),
      cattleListings: asNumber(k.cattleListings),
      equipmentListings: asNumber(k.equipmentListings),
      marketplaceProducts: asNumber(k.marketplaceProducts),
      pushSubscribers: asNumber(k.pushSubscribers),
      priceAlerts: asNumber(k.priceAlerts),
      contactMessages: asNumber(k.contactMessages),
      transportBookings: asNumber(k.transportBookings),
      laborRequests: asNumber(k.laborRequests),
      laborers: asNumber(k.laborers),
      livestock: asNumber(k.livestock),
      storageFacilities: asNumber(k.storageFacilities),
      walletCount: asNumber(k.walletCount),
      auditLogs: asNumber(k.auditLogs),
      successfulPayments: asNumber(k.successfulPayments),
      activeSubscriptions: asNumber(k.activeSubscriptions),
      expiredSubscriptions: asNumber(k.expiredSubscriptions),
      cancelledSubscriptions: asNumber(k.cancelledSubscriptions),
      openSupportTickets: asNumber(k.openSupportTickets),
      crashReports: asNumber(k.crashReports),
    };

    const daily: AdminDailyPoint[] = (snapshot.data?.daily ?? []).map((d) => {
      const dt = new Date(`${d.date}T00:00:00Z`);
      return {
        date: d.date,
        label: DAY_NAMES[Number.isNaN(dt.getTime()) ? 0 : dt.getUTCDay()] ?? '',
        newUsers: asNumber(d.newUsers),
        totalUsers: asNumber(d.totalUsers),
        tractorBookings: asNumber(d.tractorBookings),
        cattleListings: asNumber(d.cattleListings),
        requests: asNumber(d.requests),
      };
    });

    const recentAudit: AdminAuditEntry[] = (snapshot.data?.recentAudit ?? []).map((a) => ({
      id: String(a.id),
      actor: String(a.actor),
      action: String(a.action),
      entity: String(a.entity),
      summary: String(a.summary),
      timestamp: String(a.timestamp),
    }));

    return {
      data: { generatedAt: snapshot.data?.generatedAt ?? new Date().toISOString(), kpis, daily, recentAudit },
      error: null,
      timedOut: false,
    };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error', timedOut: false };
  }
}
