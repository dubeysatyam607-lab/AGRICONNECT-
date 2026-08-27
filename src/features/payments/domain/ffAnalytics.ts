import { supabase } from '@/integrations/supabase/client';

export type FfEventName =
  | 'ff_offer_viewed'
  | 'ff_offer_dismissed'
  | 'ff_plan_selected'
  | 'ff_payment_initiated'
  | 'ff_payment_success'
  | 'ff_payment_failed'
  | 'ff_activated';

let _sessionId: string | null = null;

function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
  return _sessionId;
}

/**
 * Track a Founding Farmer analytics event.
 * Non-blocking — fire-and-forget, never throws.
 */
export async function trackFfEvent(
  eventName: FfEventName,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ff_analytics_events').insert({
      event_name: eventName,
      user_id: user?.id || null,
      session_id: getSessionId(),
      metadata: metadata || {},
    });
  } catch {
    // silent — analytics should never block UX
  }
}
