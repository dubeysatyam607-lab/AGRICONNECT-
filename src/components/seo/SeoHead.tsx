import { useEffect, useMemo, type ReactNode } from 'react';
import { SITE_CONFIG, canonical as buildCanonical, ogImage as buildOgImage, type SeoPageMeta } from '@/lib/seo-config';

/**
 * SeoHead — Enterprise SEO head manager.
 * Injects per-page title, meta description, keywords, canonical URL,
 * Open Graph, Twitter Cards, robots directives, hreflang alternates,
 * and JSON-LD structured data. Cleans up on unmount to avoid leakage.
 */
interface SeoHeadProps extends SeoPageMeta {
  children?: ReactNode;
}

const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertLink = (rel: string, href: string, extra?: Record<string, string>) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"][href="${href}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute('href', href);
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => el?.setAttribute(k, v));
    }
    document.head.appendChild(el);
  }
};

const removeByAttr = (attr: 'name' | 'property' | 'rel', prefix: string) => {
  document.head.querySelectorAll(`[${attr}^="${prefix}"]`).forEach((el) => el.remove());
};

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  canonical,
  keywords,
  ogType = 'website',
  ogImage,
  ogImageAlt,
  robots,
  publishedTime,
  modifiedTime,
  articleSection,
  jsonLd,
  hreflang,
  noindex,
  children,
}) => {
  const resolvedCanonical = useMemo(
    () => buildCanonical(canonical || (typeof window !== 'undefined' ? window.location.pathname : '/')),
    [canonical]
  );
  const resolvedOgImage = useMemo(() => buildOgImage(ogImage), [ogImage]);
  const fullTitle = useMemo(() => {
    if (title === SITE_CONFIG.name) return title;
    const trimmed = title?.trim() ?? '';
    const alreadyBranded = trimmed.toLowerCase().endsWith(SITE_CONFIG.name.toLowerCase());
    return alreadyBranded ? trimmed : `${trimmed} | ${SITE_CONFIG.name}`;
  }, [title]);

  useEffect(() => {
    // ── Core meta ───────────────────────────────────────────
    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    if (keywords?.length) {
      upsertMeta('name', 'keywords', keywords.join(', '));
    }
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : robots || 'index, follow, max-image-preview:large');
    upsertMeta('name', 'author', SITE_CONFIG.name);
    upsertMeta('name', 'theme-color', SITE_CONFIG.themeColor);

    // ── Canonical (replace any static/index canonical) ──────
    document.head.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
    upsertLink('canonical', resolvedCanonical);

    // ── Open Graph ──────────────────────────────────────────
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', resolvedCanonical);
    upsertMeta('property', 'og:image', resolvedOgImage);
    upsertMeta('property', 'og:image:alt', ogImageAlt || SITE_CONFIG.ogImageAlt);
    upsertMeta('property', 'og:site_name', SITE_CONFIG.name);
    upsertMeta('property', 'og:locale', 'en_IN');
    upsertMeta('property', 'og:locale:alternate', 'hi_IN');

    // ── Twitter Cards ───────────────────────────────────────
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:site', SITE_CONFIG.twitterHandle);
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', resolvedOgImage);
    upsertMeta('name', 'twitter:image:alt', ogImageAlt || SITE_CONFIG.ogImageAlt);

    // ── Article timing (when applicable) ────────────────────
    if (publishedTime) upsertMeta('property', 'article:published_time', publishedTime);
    if (modifiedTime) upsertMeta('property', 'article:modified_time', modifiedTime);
    if (articleSection) upsertMeta('property', 'article:section', articleSection);

    // ── hreflang alternates ─────────────────────────────────
    document.head.querySelectorAll('link[data-seo-hreflang]').forEach((el) => el.remove());
    if (hreflang) {
      Object.entries(hreflang).forEach(([lang, path]) => {
        upsertLink('alternate', buildCanonical(path), {
          hreflang: lang,
          'data-seo-hreflang': 'true',
        });
      });
      // x-default
      upsertLink('alternate', resolvedCanonical, {
        hreflang: 'x-default',
        'data-seo-hreflang': 'true',
      });
    }

    // ── JSON-LD structured data ─────────────────────────────
    document.head.querySelectorAll('script[data-seo-jsonld]').forEach((el) => el.remove());
    if (jsonLd?.length) {
      jsonLd.forEach((schema) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-jsonld', 'true');
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      });
    }

    // Cleanup on unmount
    return () => {
      removeByAttr('property', 'og:');
      removeByAttr('name', 'twitter:');
      document.head.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
      document.head.querySelectorAll('link[data-seo-hreflang]').forEach((el) => el.remove());
      document.head.querySelectorAll('script[data-seo-jsonld]').forEach((el) => el.remove());
    };
  }, [
    fullTitle,
    description,
    keywords,
    resolvedCanonical,
    resolvedOgImage,
    ogImageAlt,
    ogType,
    robots,
    noindex,
    publishedTime,
    modifiedTime,
    articleSection,
    jsonLd,
    hreflang,
  ]);

  return <>{children}</>;
};

export default SeoHead;

