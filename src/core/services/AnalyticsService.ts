/**
 * Enterprise Analytics & Telemetry Service.
 * Centralizes event tracking, user identification, and funnel analytics (ready for GA4 / Amplitude / Mixpanel).
 */

export interface IAnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export class AnalyticsService {
  private isEnabled: boolean = true;
  private userId: string | null = null;
  private userProperties: Record<string, any> = {};

  constructor() {
    this.isEnabled = import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
  }

  /**
   * Identify current logged-in farmer/user for segmentation
   */
  public identify(userId: string, traits?: Record<string, any>): void {
    this.userId = userId;
    if (traits) {
      this.userProperties = { ...this.userProperties, ...traits };
    }
    if (import.meta.env.DEV) {
      console.log(`[AnalyticsService] Identified user: ${userId}`, traits);
      // Forward to window.gtag / amplitude.identify in production setup
    }
  }

  /**
   * Track navigation screen views
   */
  public trackScreen(screenName: string, properties?: Record<string, any>): void {
    this.track('Screen_View', {
      screen_name: screenName,
      ...properties,
    });
  }

  /**
   * Track specific user action or funnel event
   */
  public track(eventName: string, properties?: Record<string, any>): void {
    const eventPayload: IAnalyticsEvent = {
      eventName,
      properties: {
        ...this.userProperties,
        ...properties,
        client_time: new Date().toISOString(),
      },
      timestamp: Date.now(),
    };

    if (import.meta.env.DEV) {
      console.log(`[AnalyticsService] Event: ${eventName}`, eventPayload.properties);
    }

    if (this.isEnabled) {
      // Dispatch to telemetry providers (e.g., Supabase analytics / Amplitude / GA4)
      try {
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', eventName, properties);
        }
      } catch (e) {
        console.error('[AnalyticsService] Error dispatching event', e);
      }
    }
  }

  /**
   * Log telemetry event (alias for track for backwards compatibility)
   */
  public logEvent(eventName: string, properties?: Record<string, any>): void {
    this.track(eventName, properties);
  }

  /**
   * Clear user identity on logout
   */
  public reset(): void {
    this.userId = null;
    this.userProperties = {};
  }
}

export const analyticsService = new AnalyticsService();
