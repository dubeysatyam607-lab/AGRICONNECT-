import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAdminKpis, type AdminKpiSnapshot } from '../../domain/adminRemoteData';

export type KpiStatus = 'loading' | 'ready' | 'error';

export interface KpiState {
  status: KpiStatus;
  data: AdminKpiSnapshot | null;
  error: string | null;
  isRefreshing: boolean;
}

/**
 * Loads real production KPIs on mount and refreshes every 60s.
 * Never blocks the shell — the OverviewModule renders skeletons/zeros.
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
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, refresh };
}
