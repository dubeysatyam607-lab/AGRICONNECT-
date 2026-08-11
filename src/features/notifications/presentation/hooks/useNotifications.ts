import { useSyncExternalStore, useEffect, useMemo } from 'react';
import {
  subscribe,
  getState,
  getActiveNotifications,
  getPendingNotifications,
  getUnreadCount,
  getCategoryCounts,
} from '../../domain/notificationStore';
import { runNotificationScheduler } from '../../domain/scheduler';
import type { AppNotification, NotifCategory } from '../domain/notificationTypes';

export interface UseNotificationsResult {
  notifications: AppNotification[];
  pending: AppNotification[];
  unread: number;
  total: number;
  queue: number;
  categories: Record<NotifCategory, number>;
}

export function useNotifications(): UseNotificationsResult {
  const state = useSyncExternalStore(subscribe, getState, getState);

  useEffect(() => {
    runNotificationScheduler();
    const interval = window.setInterval(runNotificationScheduler, 60_000);
    const onOnline = () => runNotificationScheduler();
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return useMemo(
    () => ({
      notifications: getActiveNotifications(state),
      pending: getPendingNotifications(state),
      unread: getUnreadCount(state),
      total: getActiveNotifications(state).length,
      queue: state.queue.length,
      categories: getCategoryCounts(state),
    }),
    [state],
  );
}
