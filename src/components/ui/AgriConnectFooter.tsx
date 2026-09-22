import React from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Phone, Instagram, Sun, Moon, Languages,
  Heart, ArrowRight, Cookie, ChevronDown,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useThemeManager } from '@/core/theme/ThemeManager';
import { useLanguage, LANGUAGE_NAMES } from '@/contexts/LanguageContext';

const APP_VERSION = '1.2.0';
const LAST_UPDATED = 'August 2026';

/* ── Single source of truth: every link points to a real route ── */
const QUICK_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/features#ai-assistant', label: 'AI Assistant' },
  { to: '/weather/jaipur', label: 'Weather' },
  { to: '/mandi-prices/rajasthan', label: 'Mandi Prices' },
  { to: '/features#marketplace', label: 'Marketplace' },
  { to: '/knowledge-hub', label: 'Knowledge Hub' },
];

const RESOURCES = [
  { to: '/blogs', label: 'Blogs' },
  { to: '/faq', label: 'FAQ' },
  { to: '/schemes/rajasthan', label: 'Government Schemes' },
  { to: '/help-center', label: 'Help Center' },
  { to: '/contact', label: 'Contact' },
];

const COMPANY = [
  { to: '/about', label: 'About Us' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/data-declaration', label: 'Data Declaration' },
  { to: '/contact', label: 'Grievance Officer' },
];

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/hello_agriconnect', icon: Instagram },
];

const Column = ({ title, links }: { title: string; links: { to: string; label: string }[] }) => (
  <nav aria-label={title} className="min-w-0">
    <h3 className="type-small font-semibold uppercase  text-foreground">{title}</h3>
    <ul className="mt-5 space-y-3">
      {links.map((l) => (
        <li key={l.label}>
          <Link
            to={l.to}
            className="group inline-flex items-center gap-1.5 type-small font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
          >
            <span className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-3" aria-hidden="true" />
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

const PlayBadge = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M3 2.9c0-.7.7-1.2 1.4-.9l17 8.5c.7.4.7 1.4 0 1.8l-17 8.5c-.7.3-1.4-.2-1.4-.9V2.9z" opacity=".95" />
    <path d="M7 6l8 6-8 6V6z" fill="#111" />
  </svg>
);

const AppleBadge = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M16.4 12.8c0-2.2 1.8-3.3 1.9-3.4-1-.4-2.4-1.5-3.3-1.5-1.4 0-2.6.8-3.4.8-.8 0-1.9-.8-3.2-.8-1.6 0-3.1.9-4 2.4-1.7 2.9-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.9-3.5zm-2.9-8.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.1 1.8-1 2.9 1.1.1 2.2-.6 2.8-1.4z" />
  </svg>
);

const AgriConnectFooter: React.FC = () => {
  const theme = useThemeManager();
  const lang = useLanguage();

  return (
    <footer className="border-t border-border bg-card/40 relative overflow-hidden" aria-label="Footer">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* ── Main grid ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-3 lg:flex lg:items-start lg:justify-between lg:gap-16 lg:py-16">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-3 lg:flex-1 lg:max-w-sm ">
              <Link to="/" className="inline-flex items-center gap-2.5" aria-label="AgriConnect Home">
                <Logo size={40} />
                <span className=" text-xl font-semibold tracking-tight text-foreground">
                  Agri<span className="text-emerald-700 dark:text-emerald-400">Connect</span>
                </span>
              </Link>
              <p className="mt-4  type-h3 font-semibold leading-snug text-foreground">
                Empowering Farmers with AI, Smart Technology &amp; Better Decisions.
              </p>
              <p className="mt-3 max-w-sm type-small leading-relaxed text-muted-foreground">
                Live mandi bhav, AI crop assistance, hyperlocal weather, government schemes and a
                farmer-first marketplace — free in 12 Indian languages.
              </p>

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:"
                >
                  Open the App
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/features#ai-assistant"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:"
                >
                  Ask Kisan AI
                </Link>
              </div>

              {/* Contact */}
              <div className="mt-6 space-y-2.5 type-small">
                <a href="mailto:hello.agriconnect@gmail.com" className="group inline-flex items-center gap-2.5 font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="h-4 w-4" /></span>
                  <span>hello.agriconnect@gmail.com</span>
                </a>
                <a href="tel:+917067820256" className="group inline-flex items-center gap-2.5 font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Phone className="h-4 w-4" /></span>
                  <span>+91-7067820256</span>
                </a>
              </div>
            </div>

            {/* Link columns */}
            <div className="" style={{ animationDelay: '80ms' }}>
              <Column title="Quick Links" links={QUICK_LINKS} />
            </div>
            <div className="" style={{ animationDelay: '160ms' }}>
              <Column title="Resources" links={RESOURCES} />
            </div>
            <div className="" style={{ animationDelay: '240ms' }}>
              <Column title="Company" links={COMPANY} />
            </div>
          </div>

          {/* ── Social + Download band ──────────────────────── */}
          <div className="flex flex-col gap-6 border-t border-border/70 py-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase  text-muted-foreground">
                Follow AgriConnect
              </p>
              <ul className="mt-3 flex flex-wrap items-center gap-2.5" aria-label="Social media">
                {SOCIALS.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <s.icon className="h-[18px] w-[18px]" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 select-none">
                <PlayBadge />
                <span className="text-left leading-tight">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Google Play</span>
                  <span className="block type-small font-semibold">Android App</span>
                </span>
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">Soon</span>
              </div>
              <div className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 select-none">
                <AppleBadge />
                <span className="text-left leading-tight">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">App Store</span>
                  <span className="block type-small font-semibold">iOS App</span>
                </span>
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">Soon</span>
              </div>
            </div>
          </div>

          {/* ── Bottom bar ─────────────────────────────────── */}
          <div className="flex flex-col gap-4 border-t border-border/70 py-6 lg:flex-row lg:items-center lg:justify-between">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
              © 2026 AgriConnect. All rights reserved.
              <span className="hidden text-muted-foreground/40 sm:inline" aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1">
                Made with <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" aria-hidden="true" /> for Indian Farmers
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('agri_open_cookie_settings'))}
                aria-label="Manage cookie and privacy preferences"
                className="rounded-full border border-border bg-card px-2.5 py-1 hover:border-primary/40 hover:text-foreground transition-colors cursor-pointer"
              >
                <Cookie className="h-3.5 w-3.5" aria-hidden="true" /> Privacy & Cookie Settings
              </button>
              <span className="rounded-full border border-border bg-card px-2.5 py-1">v{APP_VERSION}</span>
              <span className="rounded-full border border-border bg-card px-2.5 py-1">Updated {LAST_UPDATED}</span>

              {/* Language selector */}
              {lang && (
                <label className="relative inline-flex items-center">
                  <Languages className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <select
                    value={lang.language}
                    onChange={(e) => lang.setLanguage(e.target.value as any)}
                    aria-label="Select language"
                    className="h-8 cursor-pointer appearance-none rounded-full border border-border bg-card pl-8 pr-6 text-xs font-medium outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                </label>
              )}

              {/* Dark mode toggle */}
              {theme && (
                <button
                  type="button"
                  onClick={theme.toggleTheme}
                  aria-label={theme.resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {theme.resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  {theme.resolvedTheme === 'dark' ? 'Light' : 'Dark'}
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
  );
};

export default AgriConnectFooter;
