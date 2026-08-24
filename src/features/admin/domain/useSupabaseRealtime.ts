import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type PostgresChangesFilter = {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table: string;
  filter?: string;
};

/**
 * Reusable hook: subscribes to Supabase Postgres Realtime changes on one or
 * more tables and calls `onChanges` when any matching row changes.
 *
 * - Creates the subscription on mount.
 * - Removes it on unmount.
 * - Avoids duplicate subscriptions via ref tracking.
 * - No stale closures: callback ref is always current.
 *
 * Usage:
 *   useSupabaseRealtime(
 *     [{ event: '*', table: 'profiles' }],
 *     () => refetchKpis(),
 *   );
 */
export function useSupabaseRealtime(
  filters: PostgresChangesFilter[],
  onChanges: () => void,
  enabled = true,
): void {
  const callbackRef = useRef(onChanges);
  callbackRef.current = onChanges;

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || filters.length === 0) return;

    const channel = supabase.channel(`admin-rt-${Date.now()}`);

    for (const f of filters) {
      channel.on(
        'postgres_changes' as any,
        {
          event: f.event,
          schema: f.schema ?? 'public',
          table: f.table,
          ...(f.filter ? { filter: f.filter } : {}),
        } as any,
        () => {
          callbackRef.current();
        },
      );
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, filters.map((f) => `${f.event}:${f.table}:${f.filter ?? ''}`).join('|')]);
}

/**
 * Convenience hook: subscribe to multiple tables and call `refetch` on any change.
 * Deduplicates table names automatically.
 */
export function useAdminRealtime(
  tables: string[],
  refetch: () => void,
  enabled = true,
): void {
  const filters: PostgresChangesFilter[] = tables.map((table) => ({
    event: '*',
    table,
  }));
  useSupabaseRealtime(filters, refetch, enabled);
}

/** Tables that power the admin KPI dashboard. */
export const ADMIN_KPI_TABLES = [
  'profiles',
  'tractor_bookings',
  'cattle_listings',
  'crop_scans',
  'ai_conversations',
  'push_subscriptions',
  'price_alerts',
  'contact_messages',
  'transport_bookings',
  'labor_requests',
  'laborers',
  'store_inventory',
  'payments',
  'wallets',
  'wallet_transactions',
  'subscription_plans',
  'user_subscriptions',
  'support_tickets',
  'crash_reports',
  'audit_logs',
] as const;
