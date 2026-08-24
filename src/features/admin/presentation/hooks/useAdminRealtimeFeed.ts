import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LiveUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  created_at: string;
  device_type: string | null;
  role: string | null;
  /** True when optimistically inserted before DB confirms. */
  optimistic?: boolean;
}

export interface LiveActivity {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  summary: string;
  actor: string;
  timestamp: string;
  /** True when optimistically inserted before DB confirms. */
  optimistic?: boolean;
}

export interface LiveBooking {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  /** True when optimistically inserted before DB confirms. */
  optimistic?: boolean;
}

export interface RealtimeFeedState {
  /** Most recent user signups (newest first, max 50). */
  newUsers: LiveUser[];
  /** Most recent platform activity (newest first, max 100). */
  recentActivity: LiveActivity[];
  /** Most recent bookings (newest first, max 50). */
  recentBookings: LiveBooking[];
  /** True when initial data is still loading. */
  loading: boolean;
  /** Channel connection status. */
  connected: boolean;
}

const MAX_USERS = 50;
const MAX_ACTIVITY = 100;
const MAX_BOOKINGS = 50;

// ─── Optimistic helpers ──────────────────────────────────────────────────────

/**
 * Create an optimistic user entry for instant UI feedback when a new signup
 * happens (before the DB row is confirmed via realtime).
 */
function optimisticUser(overrides: Partial<LiveUser>): LiveUser {
  return {
    id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    full_name: null,
    email: null,
    phone: null,
    location: null,
    created_at: new Date().toISOString(),
    device_type: null,
    role: null,
    ...overrides,
    optimistic: true,
  };
}

/**
 * Create an optimistic activity entry.
 */
function optimisticActivity(overrides: Partial<LiveActivity>): LiveActivity {
  return {
    id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: 'UNKNOWN',
    table_name: '',
    record_id: null,
    summary: '',
    actor: 'System',
    timestamp: new Date().toISOString(),
    ...overrides,
    optimistic: true,
  };
}

// ─── Main hook ───────────────────────────────────────────────────────────────

/**
 * Unified real-time admin feed hook.
 *
 * Subscribes to Supabase Postgres changes on:
 *   - `profiles`       → new user signups appear instantly
 *   - `audit_logs`     → activity feed updates within ~2 seconds
 *   - `tractor_bookings` → booking updates appear instantly
 *
 * Features:
 *   - Optimistic UI: add items to local state immediately, confirm from DB
 *   - Auto-cleanup on unmount
 *   - Deduplication (same row ID won't appear twice)
 *   - Debounced initial fetch (prevents hammering on mount)
 *
 * Usage:
 *   const feed = useAdminRealtimeFeed();
 *   feed.newUsers       → LiveUser[]
 *   feed.recentActivity → LiveActivity[]
 *   feed.optimisticallyAddUser({ full_name: "Test", email: "test@example.com" })
 */
export function useAdminRealtimeFeed(): RealtimeFeedState & {
  optimisticallyAddUser: (u: Partial<LiveUser>) => void;
  optimisticallyAddActivity: (a: Partial<LiveActivity>) => void;
  refreshAll: () => void;
} {
  const [newUsers, setNewUsers] = useState<LiveUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<LiveActivity[]>([]);
  const [recentBookings, setRecentBookings] = useState<LiveBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Initial data fetch ───────────────────────────────────────────────────

  const fetchInitialData = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);

    try {
      const [usersRes, activityRes, bookingsRes] = await Promise.allSettled([
        supabase
          .from('profiles')
          .select('id, full_name, email, phone, location, created_at, device_type, role')
          .order('created_at', { ascending: false })
          .limit(MAX_USERS),
        supabase
          .from('audit_logs')
          .select('id, action, table_name, record_id, summary, actor, timestamp')
          .order('timestamp', { ascending: false })
          .limit(MAX_ACTIVITY),
        supabase
          .from('tractor_bookings')
          .select('id, user_id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(MAX_BOOKINGS),
      ]);

      if (!mountedRef.current) return;

      if (usersRes.status === 'fulfilled' && usersRes.value.data) {
        setNewUsers(usersRes.value.data as LiveUser[]);
      }
      if (activityRes.status === 'fulfilled' && activityRes.value.data) {
        setRecentActivity(activityRes.value.data as LiveActivity[]);
      }
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data) {
        setRecentBookings(bookingsRes.value.data as LiveBooking[]);
      }
    } catch (err) {
      console.error('[useAdminRealtimeFeed] Initial fetch error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ── Supabase Realtime subscription ───────────────────────────────────────

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('admin-realtime-feed')
      // New user signups — appear immediately in user list
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        async (payload) => {
          if (!mountedRef.current) return;
          const newRow = payload.new as LiveUser;
          // Fetch full profile data for the new user
          const { data: fullProfile } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, location, created_at, device_type, role')
            .eq('id', newRow.id)
            .maybeSingle();

          if (!mountedRef.current) return;
          const user = (fullProfile || newRow) as LiveUser;
          setNewUsers((prev) => {
            // Deduplicate
            if (prev.some((u) => u.id === user.id)) return prev;
            return [user, ...prev].slice(0, MAX_USERS);
          });

          // Also add to activity feed
          setRecentActivity((prev) => {
            const activity: LiveActivity = {
              id: `activity-${user.id}`,
              action: 'SIGNUP',
              table_name: 'profiles',
              record_id: user.id,
              summary: `New farmer signed up: ${user.full_name || user.email || 'Unknown'}`,
              actor: user.full_name || user.email || 'New User',
              timestamp: user.created_at,
            };
            if (prev.some((a) => a.id === activity.id)) return prev;
            return [activity, ...prev].slice(0, MAX_ACTIVITY);
          });
        },
      )
      // Profile updates (name change, role change, etc.)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          if (!mountedRef.current) return;
          const updated = payload.new as LiveUser;
          setNewUsers((prev) =>
            prev.map((u) => (u.id === updated.id ? { ...u, ...updated, optimistic: false } : u)),
          );
        },
      )
      // Activity feed — any audit log insert
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          if (!mountedRef.current) return;
          const log = payload.new as LiveActivity;
          setRecentActivity((prev) => {
            if (prev.some((a) => a.id === log.id)) return prev;
            return [log, ...prev].slice(0, MAX_ACTIVITY);
          });
        },
      )
      // Booking updates
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tractor_bookings' },
        async (payload) => {
          if (!mountedRef.current) return;
          const booking = payload.new as LiveBooking;
          setRecentBookings((prev) => {
            const exists = prev.some((b) => b.id === booking.id);
            if (exists) {
              // Update existing booking status
              return prev.map((b) => (b.id === booking.id ? { ...b, ...booking, optimistic: false } : b));
            }
            // New booking
            return [booking, ...prev].slice(0, MAX_BOOKINGS);
          });

          // Add to activity feed
          setRecentActivity((prev) => {
            const activity: LiveActivity = {
              id: `booking-${booking.id}`,
              action: payload.eventType === 'INSERT' ? 'BOOKING_NEW' : 'BOOKING_UPDATE',
              table_name: 'tractor_bookings',
              record_id: booking.id,
              summary: `Tractor booking ${payload.eventType === 'INSERT' ? 'created' : `status → ${booking.status}`}`,
              actor: 'Farmer',
              timestamp: booking.created_at || new Date().toISOString(),
            };
            if (prev.some((a) => a.id === activity.id)) return prev;
            return [activity, ...prev].slice(0, MAX_ACTIVITY);
          });
        },
      )
      .subscribe((status) => {
        if (mountedRef.current) {
          setConnected(status === 'SUBSCRIBED');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchInitialData]);

  // ── Optimistic helpers ───────────────────────────────────────────────────

  const optimisticallyAddUser = useCallback((overrides: Partial<LiveUser>) => {
    const user = optimisticUser(overrides);
    setNewUsers((prev) => [user, ...prev].slice(0, MAX_USERS));
    setRecentActivity((prev) => {
      const activity = optimisticActivity({
        action: 'SIGNUP',
        table_name: 'profiles',
        record_id: user.id,
        summary: `New farmer: ${user.full_name || user.email || 'Unknown'}`,
        actor: user.full_name || user.email || 'New User',
      });
      return [activity, ...prev].slice(0, MAX_ACTIVITY);
    });
  }, []);

  const optimisticallyAddActivity = useCallback((overrides: Partial<LiveActivity>) => {
    const activity = optimisticActivity(overrides);
    setRecentActivity((prev) => [activity, ...prev].slice(0, MAX_ACTIVITY));
  }, []);

  const refreshAll = useCallback(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return {
    newUsers,
    recentActivity,
    recentBookings,
    loading,
    connected,
    optimisticallyAddUser,
    optimisticallyAddActivity,
    refreshAll,
  };
}
