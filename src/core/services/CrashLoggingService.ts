/**
 * Enterprise Crash Logging & Diagnostics Service.
 * Captures unhandled exceptions, promise rejections, and ErrorBoundary failures (ready for Sentry / Crashlytics).
 */

export interface ICrashReport {
  message: string;
  stack?: string;
  timestamp: string;
  context?: string;
  breadcrumbs: string[];
}

export class CrashLoggingService {
  private breadcrumbs: string[] = [];
  private readonly maxBreadcrumbs = 30;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event: ErrorEvent) => {
        this.logCrash(event.error || new Error(event.message), 'Unhandled_Window_Error');
      });

      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        this.logCrash(event.reason || new Error('Unhandled Promise Rejection'), 'Unhandled_Promise_Rejection');
      });
    }
  }

  /**
   * Add a navigation or user action breadcrumb trail to assist debugging
   */
  public addBreadcrumb(action: string, metadata?: Record<string, any>): void {
    const entry = `[${new Date().toLocaleTimeString()}] ${action}${metadata ? ` - ${JSON.stringify(metadata)}` : ''}`;
    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Record exception and transmit to crash collector
   */
  public logCrash(error: any, context: string = 'General'): void {
    const report: ICrashReport = {
      message: error?.message || typeof error === 'string' ? error : 'Unknown exception',
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      context,
      breadcrumbs: [...this.breadcrumbs],
    };

    if (process.env.NODE_ENV !== 'production') {
      console.group(`🚨 [CrashLoggingService] Crash Captured in [${context}]`);
      console.error('Message:', report.message);
      if (report.stack) console.error('Stack:', report.stack);
      console.log('Recent Breadcrumbs:', report.breadcrumbs);
      console.groupEnd();
    }

    // Dispatch to Sentry / Bugsnag / Firebase in production
    try {
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: { context },
          extra: { breadcrumbs: report.breadcrumbs },
        });
      }

      // GA4 exception event (best-effort; gtag is only present when analytics
      // is configured via VITE_GA4_ID/VITE_GTM_ID).
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: `${context}: ${report.message}`.slice(0, 150),
          fatal: false,
        });
      }

      // Self-hosted crash collector (optional, e.g. a logging endpoint).
      const endpoint = import.meta.env.VITE_CRASH_ENDPOINT as string | undefined;
      if (endpoint && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, JSON.stringify(report));
      }
    } catch (e) {
      console.error('[CrashLoggingService] Failed to transmit crash report', e);
    }
  }
}

export const crashLoggingService = new CrashLoggingService();
