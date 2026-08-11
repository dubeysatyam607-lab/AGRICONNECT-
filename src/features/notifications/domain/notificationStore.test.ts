import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetNotificationData,
  pushNotification,
  getState,
  getUnreadCount,
  getPendingNotifications,
  getActiveNotifications,
  markRead,
  clearRead,
  setCategoryPref,
  setDnd,
} from './notificationStore';

const wrapNow = (deltaMin: number): string => {
  const d = new Date(Date.now() + deltaMin * 60_000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

describe('notificationStore', () => {
  beforeEach(() => {
    localStorage.clear();
    resetNotificationData();
  });

  it('deduplicates notifications with the same dedupeKey on the same day', () => {
    const first = pushNotification({
      category: 'weather',
      titleKey: 'notif.rain.title',
      dedupeKey: 'rain-x',
      actions: [{ id: 'v', labelKey: 'notif.action.view', tab: 'home' }],
    });
    const second = pushNotification({
      category: 'weather',
      titleKey: 'notif.rain.title',
      dedupeKey: 'rain-x',
      actions: [{ id: 'v', labelKey: 'notif.action.view', tab: 'home' }],
    });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('respects disabled categories', () => {
    setCategoryPref('mandi', false);
    const created = pushNotification({
      category: 'mandi',
      titleKey: 'notif.mandiUp.title',
      actions: [{ id: 'v', labelKey: 'notif.action.view', tab: 'mandi' }],
    });
    expect(created).toBeNull();
  });

  it('holds non-critical notifications during Do Not Disturb and delivers critical ones', () => {
    const start = wrapNow(-60);
    const end = wrapNow(60);
    setDnd({ enabled: true, start, end, allowCritical: true });

    const held = pushNotification({
      category: 'reminder',
      titleKey: 'notif.irrigation.title',
      actions: [{ id: 'v', labelKey: 'notif.action.view', tab: 'crop-calendar' }],
    });
    expect(held?.scheduledAt).toBeDefined();
    expect(getPendingNotifications().length).toBe(1);

    const critical = pushNotification({
      category: 'weather',
      severity: 'critical',
      titleKey: 'notif.frost.title',
      actions: [{ id: 'v', labelKey: 'notif.action.view', tab: 'home' }],
    });
    expect(critical?.scheduledAt).toBeUndefined();
    expect(getActiveNotifications().some((n) => n.id === critical?.id)).toBe(true);
  });

  it('markRead updates unread count and clearRead keeps only unread', () => {
    const n = pushNotification({
      category: 'task',
      titleKey: 'notif.taskDue.title',
      actions: [{ id: 'v', labelKey: 'notif.action.view', tab: 'crop-calendar' }],
    });
    expect(n).not.toBeNull();
    const before = getUnreadCount();
    markRead(n!.id);
    expect(getUnreadCount()).toBe(before - 1);
    clearRead();
    expect(getActiveNotifications().some((x) => x.id === n!.id)).toBe(false);
  });

  it('persists state to localStorage under the v1 key', () => {
    expect(localStorage.getItem('agri_notifications_v1')).not.toBeNull();
    expect(getState().version).toBe(1);
  });
});
