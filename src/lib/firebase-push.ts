/**
 * Web Push Notification Service
 * VAPID key comes from VITE_FIREBASE_VAPID_KEY (env var only).
 * No fake FCM tokens are ever minted — this subscribes through the real
 * PushManager API. See src/hooks/usePushNotifications.tsx for the full
 * subscribe/unsubscribe flow used by the app.
 */

export const FIREBASE_PUSH_CONFIG = {
  vapidKey: (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined) ?? "",
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Requests Notification permissions and returns the real PushSubscription
 * JSON (endpoint + p256dh + auth keys), or null when unsupported/denied.
 */
export async function requestAgriNotificationPermission(): Promise<PushSubscriptionJSON | null> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[Push] Browser does not support Web Notifications.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const vapidKey = FIREBASE_PUSH_CONFIG.vapidKey;
    if (!vapidKey) {
      console.warn('[Push] VITE_FIREBASE_VAPID_KEY is not set; cannot subscribe.');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    return subscription.toJSON();
  } catch (err) {
    console.error('[Push] Notification permission request error:', err);
    return null;
  }
}
