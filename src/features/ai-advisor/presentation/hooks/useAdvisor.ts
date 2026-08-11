import { useSyncExternalStore, useEffect, useMemo, useState } from 'react';
import {
  subscribe,
  getState,
  getTopInsights,
  buildDailyBrief,
  ensureWeeklyReport,
} from '../../domain/advisorStore';
import type { AdvisorState } from '../../domain/advisorTypes';

export interface UseAdvisorResult {
  state: AdvisorState;
  topInsights: ReturnType<typeof getTopInsights>;
  regenerating: boolean;
}

export function useAdvisor(): UseAdvisorResult {
  const state = useSyncExternalStore(subscribe, getState, getState);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const brief = getState().brief;
    if (!brief || brief.id !== new Date().toISOString().slice(0, 10)) {
      setRegenerating(true);
      // Small delay keeps the first paint instant; data is local.
      const t = window.setTimeout(() => {
        try {
          buildDailyBrief();
          ensureWeeklyReport();
        } finally {
          setRegenerating(false);
        }
      }, 250);
      return () => window.clearTimeout(t);
    }
    ensureWeeklyReport();
  }, []);

  return useMemo(
    () => ({ state, topInsights: getTopInsights(4), regenerating }),
    [state, regenerating],
  );
}
