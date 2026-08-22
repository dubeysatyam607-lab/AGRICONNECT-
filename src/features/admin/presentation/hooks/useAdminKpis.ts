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
 * Loads real production KPIs on mount, auto-refreshes periodically, and
 * SUBSCRIBES TO SUPABASE REALTIME EVENTS on `profiles`, `audit_logs`,
 * `payments`, `wallets`, `user_subscriptions`, and `tractor_bookings`.
 * When a user registers or logs in, metrics automatically update live!
 */
export function useAdminKpis() {
  const [state, setState] = useState<KpiState>({ status: 'loading', data: null, error: null, isRefreshing: false });
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setState((s) => (s.data ? { ...s, isRefreshing: true } : { ...s, status: 'loading' }));
      const result = await fetchAdminKpis();
      if (cancelled || !mounted.current) return;
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
    };
    run();
    const interval = setInterval(run, 60000);

    // Supabase Realtime Channel for Instant KPI updates
    const channelId = `admin-kpi-realtime-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => setTick((t) => t + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => setTick((t) => t + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => setTick((t) => t + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => setTick((t) => t + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions' }, () => setTick((t) => t + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tractor_bookings' }, () => setTick((t) => t + 1))
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, refresh };
}
