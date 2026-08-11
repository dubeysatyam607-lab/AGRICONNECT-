import { describe, it, expect } from 'vitest';
import { canonical, ogImage, SITE_CONFIG } from './src/lib/seo-config';

describe('seo-config canonical()', () => {
  it('returns baseUrl for the root path', () => {
    expect(canonical('/')).toBe('https://agriconnect.in/');
    expect(canonical()).toBe('https://agriconnect.in/');
  });

  it('appends a leading slash when missing', () => {
    expect(canonical('about')).toBe('https://agriconnect.in/about');
  });

  it('builds nested paths unchanged', () => {
    expect(canonical('/mandi-prices/maharashtra')).toBe('https://agriconnect.in/mandi-prices/maharashtra');
  });

  it('does not double the site base', () => {
    expect(canonical('/about')).toBe('https://agriconnect.in/about');
  });
});

describe('seo-config ogImage()', () => {
  it('returns the default og image when called without args', () => {
    expect(ogImage()).toBe(SITE_CONFIG.defaultOgImage);
  });

  it('passes through absolute URLs', () => {
    expect(ogImage('https://cdn.example.com/leaf.jpg')).toBe('https://cdn.example.com/leaf.jpg');
  });

  it('prefixes relative paths with the site base', () => {
    expect(ogImage('/og-image-1200x630.png')).toBe('https://agriconnect.in/og-image-1200x630.png');
    expect(ogImage('og-image-1200x630.png')).toBe('https://agriconnect.in/og-image-1200x630.png');
  });
});

describe('SITE_CONFIG integrity', () => {
  it('defines themeColor and ogImageAlt used by SeoHead', () => {
    expect(SITE_CONFIG.themeColor).toBe('#2E7D32');
    expect(SITE_CONFIG.ogImageAlt).toContain('AgriConnect');
  });

  it('uses a consistent, https base URL', () => {
    expect(SITE_CONFIG.url).toMatch(/^https:\/\//);
    expect(SITE_CONFIG.baseUrl).toBe(SITE_CONFIG.url);
  });
});
