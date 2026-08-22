import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Generic hook to fetch a Supabase table as an array of typed rows with
 * AUTOMATIC REALTIME AUTO-UPDATE (WebSocket subscriptions).
 * Whenever a user registers, logs in, or updates data in this table,
 * the hook automatically re-fetches and updates the UI instantly.
 */
export function useSupabaseCollection<T extends Record<string, unknown>>(
  table: string,
  opts?: {
    select?: string;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    filters?: Array<{ column: string; op: string; value: unknown }>;
    enabled?: boolean;
    realtime?: boolean;
  },
): { rows: T[]; loading: boolean; error: string | null; refresh: () => void } {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const enabled = opts?.enabled ?? true;
  const isRealtime = opts?.realtime ?? true;
  const channelRef = useRef<any>(null);

  const fetchRows = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const select = opts?.select ?? '*';
      let q = supabase.from(table).select(select);
      if (opts?.filters) {
        for (const f of opts.filters) {
          if (f.op === 'eq') q = q.eq(f.column, f.value as string);
          else if (f.op === 'neq') q = q.neq(f.column, f.value as string);
          else if (f.op === 'gte') q = q.gte(f.column, f.value as string);
          else if (f.op === 'lte') q = q.lte(f.column, f.value as string);
          else if (f.op === 'like') q = q.like(f.column, f.value as string);
          else if (f.op === 'ilike') q = q.ilike(f.column, f.value as string);
        }
      }
      if (opts?.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? false });
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error: qErr } = await q;
      if (qErr) {
        setError(qErr.message);
        setRows([]);
      } else {
        setRows((data as T[]) ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    table,
    opts?.select,
    opts?.order?.column,
    opts?.order?.ascending,
    opts?.limit,
    enabled,
    JSON.stringify(opts?.filters),
  ]);

  // Initial and tick fetch
  useEffect(() => {
    fetchRows();
  }, [fetchRows, tick]);

  // Realtime WebSocket Subscription
  useEffect(() => {
    if (!enabled || !isRealtime) return;

    try {
      const channelId = `admin-realtime-${table}-${Math.random().toString(36).slice(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          () => {
            // Auto-refresh instantly upon any database insertion/update/deletion
            setTick((t) => t + 1);
          },
        )
        .subscribe();

      channelRef.current = channel;

      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      };
    } catch {
      // Realtime fallback to polling
    }
  }, [table, enabled, isRealtime]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { rows, loading, error, refresh };
}

/**
 * Fetch a single count from a Supabase table with Realtime auto-update.
 */
export function useSupabaseCount(
  table: string,
  opts?: {
    filters?: Array<{ column: string; op: string; value: unknown }>;
    enabled?: boolean;
    realtime?: boolean;
  },
): { count: number; loading: boolean; refresh: () => void } {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const enabled = opts?.enabled ?? true;
  const isRealtime = opts?.realtime ?? true;

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let q = supabase.from(table).select('id', { count: 'exact', head: true });
        if (opts?.filters) {
          for (const f of opts.filters) {
            if (f.op === 'eq') q = q.eq(f.column, f.value as string);
          }
        }
        const { count: c } = await q;
        if (!cancelled) setCount(c ?? 0);
      } catch {
        if (!cancelled) setCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [table, enabled, tick, JSON.stringify(opts?.filters)]);

  // Realtime subscription for count changes
  useEffect(() => {
    if (!enabled || !isRealtime) return;

    try {
      const channelId = `admin-count-${table}-${Math.random().toString(36).slice(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          () => {
            setTick((t) => t + 1);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Fallback
    }
  }, [table, enabled, isRealtime]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { count, loading, refresh };
}
