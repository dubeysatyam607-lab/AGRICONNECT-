import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Generic hook to fetch a Supabase table as an array of typed rows.
 * Returns { rows, loading, error, refresh }.
 * Falls back to empty array on error — never throws.
 */
export function useSupabaseCollection<T extends Record<string, unknown>>(
  table: string,
  opts?: {
    select?: string;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    filters?: Array<{ column: string; op: string; value: unknown }>;
    enabled?: boolean;
  },
): { rows: T[]; loading: boolean; error: string | null; refresh: () => void } {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const enabled = opts?.enabled ?? true;

  const fetchRows = useCallback(async () => {
    if (!enabled) { setRows([]); setLoading(false); return; }
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
  }, [table, opts?.select, opts?.order?.column, opts?.order?.ascending, opts?.limit, enabled, JSON.stringify(opts?.filters)]);

  useEffect(() => { fetchRows(); }, [fetchRows, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { rows, loading, error, refresh };
}

/**
 * Fetch a single count from a Supabase table.
 */
export function useSupabaseCount(
  table: string,
  opts?: {
    filters?: Array<{ column: string; op: string; value: unknown }>;
    enabled?: boolean;
  },
): { count: number; loading: boolean; refresh: () => void } {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const enabled = opts?.enabled ?? true;

  useEffect(() => {
    if (!enabled) { setCount(0); setLoading(false); return; }
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
    return () => { cancelled = true; };
  }, [table, enabled, tick, JSON.stringify(opts?.filters)]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { count, loading, refresh };
}
