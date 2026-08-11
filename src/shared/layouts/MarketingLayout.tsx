import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import AgriConnectFooter from '@/components/ui/AgriConnectFooter';

/**
 * MarketingLayout — shared header/footer for public SEO pages.
 * Provides consistent internal linking and breadcrumb-friendly
 * navigation across all indexable content pages.
 */
const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/features', label: 'Features' },
  { to: '/features#ai-assistant', label: 'AI Assistant' },
  { to: '/features#marketplace', label: 'Marketplace' },
  { to: '/weather/jaipur', label: 'Weather' },
  { to: '/mandi-prices/rajasthan', label: 'Mandi Prices' },
  { to: '/knowledge-hub', label: 'Knowledge Hub' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/faq', label: 'FAQ' },
];

const MarketingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path.split('#')[0]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="AgriConnect Home">
            <Logo size={36} />
            <span className="font-display font-black text-lg tracking-tight text-foreground">
              Agri<span className="text-emerald-700 dark:text-emerald-400">Connect</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={`${link.to}-${link.label}`}
                to={link.to}
                className={
                  isActive(link.to)
                    ? 'px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-emerald-700 bg-emerald-50'
                    : 'px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden sm:inline-flex rounded-lg gradient-hero text-primary-foreground px-4 py-2 text-sm font-semibold shadow-md hover:brightness-110 transition shrink-0"
            >
              Open App
            </Link>
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav aria-label="Mobile navigation" className="lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
            <ul className="mx-auto max-w-6xl px-4 py-4 grid grid-cols-2 gap-1">
              {NAV_LINKS.map((link) => (
                <li key={`${link.to}-${link.label}`}>
                  <Link
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={
                      isActive(link.to)
                        ? 'block px-3 py-2.5 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50'
                        : 'block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main id="main-content" className="flex-1">{children}</main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <AgriConnectFooter />
    </div>
  );
};

export default MarketingLayout;
