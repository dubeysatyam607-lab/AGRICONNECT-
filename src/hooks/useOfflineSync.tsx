import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast'; // Or '@/components/ui/use-toast' depending on your setup

const OFFLINE_QUEUE_KEY = 'offline_queue';

// Corrupt or partial JSON in localStorage must never crash the app.
const readQueue = (): Array<{ id: string; table: string; payload: Record<string, unknown>; timestamp: string }> => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: unknown[]): void => {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full / private mode — keep the in-memory count so the UI badge
    // still reflects pending work for this session.
  }
};

export const useOfflineSync = () => {
  const { toast } = useToast();
  const [queueCount, setQueueCount] = useState(0);

  // Initialize count on mount
  useEffect(() => {
    setQueueCount(readQueue().length);
  }, []);

  const saveToQueue = useCallback((table: string, payload: Record<string, unknown>) => {
    const queue = readQueue();
    const id = (crypto as Crypto | undefined)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    queue.push({ id, table, payload, timestamp: new Date().toISOString() });
    writeQueue(queue);
    setQueueCount(queue.length);
    
    toast({ title: 'Saved Offline', description: 'Your update will sync when you reconnect to the internet.' });
  }, [toast]);

  const syncQueue = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0) return;

    toast({ title: 'Back Online', description: `Syncing ${queue.length} offline updates...` });

    // Only dequeue items that actually sync. Failures (offline, 4xx, schema
    // drift) stay queued so data is never silently dropped.
    const remaining: typeof queue = [];
    for (const item of queue) {
      try {
        const { data, error } = await supabase.from(item.table).insert([item.payload]);
        if (error) throw error;
        if (data === null && !error) {
          // Supabase returns { data: null } on successful insert — keep item.
        }
      } catch (error) {
        console.error('[OfflineSync] Failed to sync item, keeping it queued:', item.table, item.id, error);
        remaining.push(item);
      }
    }

    writeQueue(remaining);
    setQueueCount(remaining.length);

    toast({
      title: remaining.length === 0 ? 'All updates synced' : `${remaining.length} update(s) will retry`,
      description: remaining.length === 0
        ? 'Your offline changes are now saved to the cloud.'
        : 'Some changes could not sync and will retry automatically.',
    });
  }, [toast]);

  useEffect(() => {
    // Sync immediately if already online (e.g., page load after reconnect)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncQueue();
    }
    window.addEventListener('online', syncQueue);
    return () => window.removeEventListener('online', syncQueue);
  }, [syncQueue]);

  return { saveToQueue, syncQueue, queueCount };
};