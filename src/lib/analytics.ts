/**
 * Analytics bootstrap (Google Analytics 4 + Google Tag Manager).
 * Only loads when the corresponding VITE_* env vars are configured, so
 * development/local previews never emit tracking requests.
 *
 *   VITE_GA4_ID=G-XXXXXXXXXX  → loads GA4 gtag.js
 *   VITE_GTM_ID=GTM-XXXXXX    → loads GTM container
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;

  const ga4Id = import.meta.env.VITE_GA4_ID as string | undefined;
  const gtmId = import.meta.env.VITE_GTM_ID as string | undefined;

  if (gtmId) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    document.head.appendChild(s);

    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  }

  if (ga4Id) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
    document.head.appendChild(s);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: unknown[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', ga4Id, { send_page_view: true });
  }

  // Declarative tracking events for analytics (fire-and-forget)
  if ((ga4Id || gtmId) && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-analytics]');
      if (!el) return;
      const eventName = el.getAttribute('data-analytics') || 'ui_click';
      const payload = {
        label: el.getAttribute('data-analytics-label') || el.getAttribute('aria-label') || '',
        href: (el as HTMLAnchorElement).href || '',
      };
      try {
        (window as any).gtag?.('event', eventName, payload);
        (window as any).dataLayer?.push({ event: eventName, ...payload });
      } catch {
        // analytics must never break the app
      }
    });
  }
}
