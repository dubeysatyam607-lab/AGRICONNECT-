import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAdminKpis, type AdminKpiSnapshot } from '../../domain/adminRemoteData';

export type KpiStatus = 'loading' | 'ready' | 'error';

export interface KpiState {
  status: KpiStatus;
  data: AdminKpiSnapshot | null;
  error: string | null;
  isRefreshing: boolean;
}

/**
 * Loads real production KPIs on mount, auto-refreshes every 30s, and
 * SUBSCRIBES TO SUPABASE REALTIME on all tables that feed KPI cards.
 * When any table changes, KPIs automatically refetch — no manual refresh.
 *
 * The subscription is created ONCE on mount and cleaned up on unmount.
 * A debounced refetch prevents hammering the DB on burst inserts.
 */
export function useAdminKpis() {
  const [state, setState] = useState<KpiState>({ status: 'loading', data: null, error: null, isRefreshing: false });
  const mounted = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const fetchKpis = useCallback(async (isInitial = false) => {
    if (!mounted.current) return;
    setState((s) => (s.data ? { ...s, isRefreshing: true } : { ...s, status: isInitial ? 'loading' : s.status }));
    const result = await fetchAdminKpis();
    if (!mounted.current) return;
    if (result.data) {
      setState({ status: 'ready', data: result.data, error: null, isRefreshing: false });
    } else {
      setState((s) => ({
        status: s.data ? 'ready' : 'error',
        data: s.data,
        error: result.error,
        isRefreshing: false,
      }));
    }
  }, []);

  // Debounced refetch — prevents hammering on burst inserts
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchKpis(false), 500);
  }, [fetchKpis]);

  useEffect(() => {
    fetchKpis(true);

    // Auto-refresh every 30 seconds as a safety net
    const interval = setInterval(() => fetchKpis(false), 30000);

    // Single Supabase Realtime channel for ALL KPI-fed tables
    const channel = supabase
      .channel('admin-kpi-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tractor_bookings' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cattle_listings' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crop_scans' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_conversations' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'push_subscriptions' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'price_alerts' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_bookings' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labor_requests' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crash_reports' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, debouncedRefetch)
      .subscribe();

    return () => {
      clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, []); // Empty deps — subscription created ONCE

  const refresh = useCallback(() => fetchKpis(false), [fetchKpis]);

  return { ...state, refresh };
}
