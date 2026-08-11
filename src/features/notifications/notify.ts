import { pushNotification } from './domain/notificationStore';
import type { NotifCategory, NotifSeverity } from './domain/notificationTypes';

export interface NotifyEventInput {
  category: NotifCategory;
  severity?: NotifSeverity;
  titleKey: string;
  bodyKey?: string;
  params?: Record<string, string | number>;
  tab: string;
  dedupeKey?: string;
}

/**
 * Cross-feature convenience helper — lets other features (payments, store,
 * bookings, AI) emit an in-app notification with a single deep-link action.
 */
export function notifyEvent(input: NotifyEventInput): void {
  try {
    pushNotification({
      category: input.category,
      severity: input.severity,
      titleKey: input.titleKey,
      bodyKey: input.bodyKey,
      params: input.params,
      dedupeKey: input.dedupeKey,
      actions: [{ id: 'view', labelKey: 'notif.action.view', tab: input.tab, variant: 'primary' }],
    });
  } catch {
    /* never let a notification failure break the caller */
  }
}
