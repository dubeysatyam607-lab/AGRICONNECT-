import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Guarantees every route change opens from the top.
 * Without this, SPA navigation keeps the previous page's scroll offset
 * (so a long page like the home feed can make the next screen open at the
 * bottom). Hash-only changes (anchor links) are ignored on purpose.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const restore = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    // Scroll immediately on route change and again after the first paint so
    // short-then-tall content (lazy sections) never re-anchors the viewport.
    restore();
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
