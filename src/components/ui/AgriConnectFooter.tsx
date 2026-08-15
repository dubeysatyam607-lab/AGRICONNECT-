import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Phone, Instagram, Linkedin, Youtube, Twitter, Sun, Moon, Languages,
  Heart, Check, ArrowRight, Sparkles,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useThemeManager } from '@/core/theme/ThemeManager';
import { useLanguage, LANGUAGE_NAMES } from '@/contexts/LanguageContext';
import { submitWeb3Form } from '@/config/web3forms';

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
];

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/agriconnect', icon: Instagram },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/agriconnect', icon: Linkedin },
  { label: 'YouTube', href: 'https://www.youtube.com/@agriconnect', icon: Youtube },
  { label: 'X (Twitter)', href: 'https://x.com/agriconnect', icon: Twitter },
];

const Column = ({ title, links }: { title: string; links: { to: string; label: string }[] }) => (
  <nav aria-label={title} className="min-w-0">
    <h3 className="text-[13px] font-black uppercase tracking-[0.14em] text-foreground">{title}</h3>
    <ul className="mt-5 space-y-3">
      {links.map((l) => (
        <li key={l.label}>
          <Link
            to={l.to}
            className="group inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
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

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const submitNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      setSubscribed(false);
      return;
    }
    setError(null);
    setSubscribing(true);
    try {
      await submitWeb3Form({
        subject: 'Newsletter subscription from AgriConnect website',
        from_name: trimmed,
        email: trimmed,
      });
      try {
        localStorage.setItem('agri_newsletter', trimmed);
      } catch {
        // storage unavailable — ignore
      }
      setSubscribed(true);
      setEmail('');
      window.setTimeout(() => setSubscribed(false), 6000);
    } catch (err) {
      console.error('[Newsletter] subscription failed:', err);
      setError('Subscription failed. Please check your connection and try again.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes footerFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes footerPop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
        .footer-fade-up { animation: footerFadeUp .6s cubic-bezier(.22,1,.36,1) both; }
        .footer-pop { animation: footerPop .45s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      <footer className="border-t border-border bg-card/40 relative overflow-hidden" aria-label="Footer">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* ── Newsletter ─────────────────────────────────── */}
          <section aria-labelledby="newsletter-heading" className="pt-10">
            <div className="relative overflow-hidden rounded-[28px] gradient-hero text-primary-foreground px-6 py-8 sm:px-10 sm:py-9 shadow-glow">
              <span className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-secondary/25 blur-3xl" aria-hidden="true" />
              <span className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
              <div className="relative grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" /> Farmer First
                  </div>
                  <h2 id="newsletter-heading" className="mt-3 font-display text-2xl sm:text-3xl font-semibold tracking-tight">
                    Stay Updated
                  </h2>
                  <p className="mt-2 max-w-md text-[14px] leading-relaxed text-primary-foreground/85">
                    Get farming tips, government schemes, mandi updates and AI recommendations
                    directly in your inbox.
                  </p>
                </div>

                <form onSubmit={submitNewsletter} noValidate className="w-full" aria-label="Newsletter subscription">
                  {subscribed ? (
                    <div className="footer-pop flex items-center gap-3 rounded-2xl bg-white/10 border border-white/20 px-5 py-4 backdrop-blur" role="status" aria-live="polite">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-emerald-950">
                        <Check className="h-5 w-5" strokeWidth={3} />
                      </span>
                      <div>
                        <p className="text-sm font-bold">You&apos;re subscribed! 🎉</p>
                        <p className="text-xs text-primary-foreground/75">Kisan updates will reach your inbox soon.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <label htmlFor="footer-email" className="sr-only">
                          Email address
                        </label>
                        <input
                          id="footer-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                          placeholder="Enter your email address"
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? 'newsletter-error' : undefined}
                          className="h-12 w-full flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-medium text-white placeholder:text-white/50 outline-none backdrop-blur focus:border-white/50 focus:ring-2 focus:ring-white/30 transition"
                        />
                        <button
                          type="submit"
                          disabled={subscribing}
                          className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-emerald-900 px-6 text-sm font-bold shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {subscribing ? 'Subscribing…' : 'Subscribe'}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                      {error && (
                        <p id="newsletter-error" role="alert" className="mt-2 text-xs font-semibold text-amber-200">
                          {error}
                        </p>
                      )}
                    </>
                  )}
                </form>
              </div>
            </div>
          </section>

          {/* ── Main grid ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-3 lg:flex lg:items-start lg:justify-between lg:gap-16 lg:py-16">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-3 lg:flex-1 lg:max-w-sm footer-fade-up">
              <Link to="/" className="inline-flex items-center gap-2.5" aria-label="AgriConnect Home">
                <Logo size={40} />
                <span className="font-display text-xl font-black tracking-tight text-foreground">
                  Agri<span className="text-emerald-700 dark:text-emerald-400">Connect</span>
                </span>
              </Link>
              <p className="mt-4 font-display text-[17px] font-semibold leading-snug text-foreground">
                Empowering Farmers with AI, Smart Technology &amp; Better Decisions.
              </p>
              <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
                Live mandi bhav, AI crop assistance, hyperlocal weather, government schemes and a
                farmer-first marketplace — free in 12 Indian languages.
              </p>

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl gradient-hero text-primary-foreground px-5 py-2.5 text-sm font-bold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-glow"
                >
                  Open the App
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/features#ai-assistant"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
                >
                  Ask Kisan AI
                </Link>
              </div>

              {/* Contact */}
              <div className="mt-6 space-y-2.5 text-[13px]">
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
            <div className="footer-fade-up" style={{ animationDelay: '80ms' }}>
              <Column title="Quick Links" links={QUICK_LINKS} />
            </div>
            <div className="footer-fade-up" style={{ animationDelay: '160ms' }}>
              <Column title="Resources" links={RESOURCES} />
            </div>
            <div className="footer-fade-up" style={{ animationDelay: '240ms' }}>
              <Column title="Company" links={COMPANY} />
            </div>
          </div>

          {/* ── Social + Download band ──────────────────────── */}
          <div className="flex flex-col gap-6 border-t border-border/70 py-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <s.icon className="h-[18px] w-[18px]" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/"
                aria-label="Download AgriConnect on Google Play"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-foreground text-background px-4 py-2.5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
              >
                <PlayBadge />
                <span className="text-left leading-tight">
                  <span className="block text-[9.5px] font-semibold uppercase tracking-wider opacity-70">Get it on</span>
                  <span className="block text-[13px] font-bold">Google Play</span>
                </span>
              </a>
              <a
                href="/"
                aria-label="AgriConnect on the App Store — coming soon"
                className="relative inline-flex items-center gap-2.5 rounded-2xl bg-foreground text-background px-4 py-2.5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
              >
                <AppleBadge />
                <span className="text-left leading-tight">
                  <span className="block text-[9.5px] font-semibold uppercase tracking-wider opacity-70">Download on</span>
                  <span className="block text-[13px] font-bold">App Store</span>
                </span>
                <span className="absolute -top-2 right-2 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-950">
                  Coming Soon
                </span>
              </a>
            </div>
          </div>

          {/* ── Bottom bar ─────────────────────────────────── */}
          <div className="flex flex-col gap-4 border-t border-border/70 py-6 lg:flex-row lg:items-center lg:justify-between">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
              © 2026 AgriConnect Technologies Pvt. Ltd. All rights reserved.
              <span className="hidden text-muted-foreground/40 sm:inline" aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1">
                Made with <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" aria-hidden="true" /> for Indian Farmers
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
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
                  <span className="pointer-events-none absolute right-2 text-muted-foreground" aria-hidden="true">▾</span>
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
    </>
  );
};

export default AgriConnectFooter;
