import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import SeoHead from './src/components/seo/SeoHead';
import { SITE_CONFIG } from './src/lib/seo-config';

const meta = (attr: 'name' | 'property', key: string) =>
  document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)?.content ?? null;

const canonicalLink = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null;

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta, link').forEach((el) => el.remove());
  window.history.replaceState({}, '', '/');
});

describe('SeoHead — title handling', () => {
  it('appends the brand when the title has no brand suffix', () => {
    render(<SeoHead title="About Us" description="d" />);
    expect(document.title).toBe(`About Us | ${SITE_CONFIG.name}`);
  });

  it('does not double the brand when the title already ends with it', () => {
    render(<SeoHead title={`Features — AI Tools | ${SITE_CONFIG.name}`} description="d" />);
    expect(document.title).toBe(`Features — AI Tools | ${SITE_CONFIG.name}`);
    expect(document.title.split(SITE_CONFIG.name).length).toBe(2);
  });

  it('uses the brand alone as title when title equals it', () => {
    render(<SeoHead title={SITE_CONFIG.name} description="d" />);
    expect(document.title).toBe(SITE_CONFIG.name);
  });
});

describe('SeoHead — canonical handling', () => {
  it('honours an explicit canonical path', () => {
    render(<SeoHead title="Pricing" description="d" canonical="/pricing" />);
    expect(canonicalLink()).toBe('https://agriconnect-navy-six.vercel.app/pricing');
  });

  it('auto-derives the canonical from the current pathname', () => {
    window.history.replaceState({}, '', '/about');
    render(<SeoHead title="About" description="d" />);
    expect(canonicalLink()).toBe('https://agriconnect-navy-six.vercel.app/about');
  });

  it('replaces a stale static canonical instead of appending a second one', () => {
    const stale = document.createElement('link');
    stale.rel = 'canonical';
    stale.href = 'https://agriconnect-navy-six.vercel.app/';
    document.head.appendChild(stale);

    render(<SeoHead title="Contact" description="d" canonical="/contact" />);
    const links = document.head.querySelectorAll('link[rel="canonical"]');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('https://agriconnect-navy-six.vercel.app/contact');
  });
});

describe('SeoHead — meta directives', () => {
  it('writes theme-color and og:image:alt from SITE_CONFIG defaults', () => {
    render(<SeoHead title="Home" description="d" />);
    expect(meta('name', 'theme-color')).toBe(SITE_CONFIG.themeColor);
    expect(meta('property', 'og:image:alt')).toBe(SITE_CONFIG.ogImageAlt);
    expect(meta('property', 'og:url')).toBe('https://agriconnect-navy-six.vercel.app/');
  });

  it('defaults robots to index, follow', () => {
    render(<SeoHead title="Home" description="d" />);
    expect(meta('name', 'robots')).toContain('index');
    expect(meta('name', 'robots')).toContain('follow');
  });

  it('emits noindex, nofollow when noindex is set', () => {
    render(<SeoHead title="Profile" description="d" noindex />);
    expect(meta('name', 'robots')).toBe('noindex, nofollow');
  });

  it('uses the canonical URL for og:url so the two never diverge', () => {
    render(<SeoHead title="Faq" description="d" canonical="/faq" />);
    expect(meta('property', 'og:url')).toBe('https://agriconnect-navy-six.vercel.app/faq');
  });
});

describe('SeoHead — cleanup', () => {
  it('removes injected canonical/OG/JSON-LD tags on unmount', () => {
    const { unmount } = render(
      <SeoHead title="Blog" description="d" canonical="/blogs" jsonLd={[{ '@type': 'FAQPage' }]} />
    );
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.head.querySelectorAll('script[data-seo-jsonld]').length).toBe(1);

    unmount();
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(0);
    expect(document.head.querySelectorAll('meta[property^="og:"]').length).toBe(0);
    expect(document.head.querySelectorAll('script[data-seo-jsonld]').length).toBe(0);
  });
});
