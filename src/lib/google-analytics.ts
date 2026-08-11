/**
 * Google Analytics Integration Service
 * Property: agric-62c00
 * Property ID: 548945014
 * Measurement ID: G-548945014
 */

export const GA_CONFIG = {
  property: import.meta.env.VITE_GA_PROPERTY || "agric-62c00",
  propertyId: import.meta.env.VITE_GA_PROPERTY_ID || "548945014",
  measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || "G-548945014",
};

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Initializes Google Analytics script tag dynamically
 */
export function initGoogleAnalytics(): void {
  if (typeof window === 'undefined') return;

  // Prevent duplicate script injection
  if (document.getElementById('ga-gtag-script')) return;

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA_CONFIG.measurementId, {
    page_path: window.location.pathname,
    send_page_view: true,
  });

  const script = document.createElement('script');
  script.id = 'ga-gtag-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_CONFIG.measurementId}`;
  document.head.appendChild(script);

  if (import.meta.env.DEV) {
    console.log(`[GoogleAnalytics] Initialized Property ${GA_CONFIG.property} (ID: ${GA_CONFIG.propertyId})`);
  }
}

/**
 * Tracks custom AgriConnect farmer events
 */
export function trackAgriEvent(
  eventName: string,
  eventParams: Record<string, any> = {}
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...eventParams,
      property_id: GA_CONFIG.propertyId,
      app_name: 'AgriConnect',
      client_timestamp: new Date().toISOString(),
    });
  }
}
