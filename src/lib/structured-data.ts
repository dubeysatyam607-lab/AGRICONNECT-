/**
 * JSON-LD Structured Data Builders for AgriConnect.
 * Each function returns a type-safe schema.org object for injection
 * via <script type="application/ld+json">.
 */
import { SITE_CONFIG, canonical, ogImage } from './seo-config';

type JsonLd = Record<string, unknown>;

/** Organization schema (homepage & sitewide). */
export function organizationSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_CONFIG.baseUrl}/#organization`,
    name: SITE_CONFIG.legalName,
    url: SITE_CONFIG.baseUrl,
    logo: ogImage(),
    description: SITE_CONFIG.description,
    email: SITE_CONFIG.email,
    telephone: SITE_CONFIG.phone,
    foundingDate: SITE_CONFIG.foundingDate,
    address: {
      '@type': 'PostalAddress',
      ...SITE_CONFIG.address,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: SITE_CONFIG.phone,
        email: SITE_CONFIG.email,
        availableLanguage: ['English', 'Hindi', 'Marathi', 'Gujarati', 'Punjabi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Odia', 'Assamese'],
        areaServed: 'IN',
      },
    ],
    sameAs: SITE_CONFIG.socialProfiles,
  };
}

/** WebSite schema with SearchAction (sitelinks searchbox). */
export function websiteSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_CONFIG.baseUrl}/#website`,
    url: SITE_CONFIG.baseUrl,
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    publisher: { '@id': `${SITE_CONFIG.baseUrl}/#organization` },
    inLanguage: 'en-IN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_CONFIG.baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** SoftwareApplication schema (for the PWA). */
export function softwareAppSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.baseUrl,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Agriculture / Farm Management',
    operatingSystem: 'Android, iOS, Web',
    availableOnDevice: 'Mobile, Tablet, Desktop',
    description: SITE_CONFIG.description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
      description: 'Free to use for all farmers in India',
    },
    publisher: { '@id': `${SITE_CONFIG.baseUrl}/#organization` },
  };
}

/** MobileApplication schema. */
export function mobileAppSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: `${SITE_CONFIG.name} App`,
    url: SITE_CONFIG.baseUrl,
    description: SITE_CONFIG.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Android, iOS',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    publisher: { '@id': `${SITE_CONFIG.baseUrl}/#organization` },
  };
}

/** FAQPage schema — highly valuable for AEO / AI search. */
export function faqSchema(faqs: { q: string; a: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };
}

/** BreadcrumbList schema. */
export function breadcrumbSchema(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}

/** Blog (index) schema. */
export function blogSchema(opts: {
  title: string;
  description: string;
  path: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: opts.title,
    description: opts.description,
    url: canonical(opts.path),
    publisher: { '@id': `${SITE_CONFIG.baseUrl}/#organization` },
    inLanguage: 'en-IN',
  };
}

/** Article schema for blog posts. */
export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  publishedTime: string;
  modifiedTime?: string;
  authorName?: string;
  image?: string;
  section?: string;
  keywords?: string[];
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    image: opts.image || ogImage(),
    author: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.baseUrl,
    },
    publisher: { '@id': `${SITE_CONFIG.baseUrl}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical(opts.path) },
    datePublished: opts.publishedTime,
    dateModified: opts.modifiedTime || opts.publishedTime,
    articleSection: opts.section || 'Farming Guides',
    keywords: (opts.keywords || []).join(', '),
    inLanguage: 'en-IN',
  };
}

/** Product schema for marketplace items. */
export function productSchema(opts: {
  name: string;
  description: string;
  path: string;
  price: number;
  image?: string;
  sku?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    image: opts.image || ogImage(),
    url: canonical(opts.path),
    sku: opts.sku,
    brand: { '@type': 'Brand', name: SITE_CONFIG.name },
    offers: {
      '@type': 'Offer',
      price: opts.price,
      priceCurrency: 'INR',
      availability: opts.availability || 'https://schema.org/InStock',
      url: canonical(opts.path),
      seller: { '@id': `${SITE_CONFIG.baseUrl}/#organization` },
    },
    ...(opts.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: opts.rating,
            reviewCount: opts.reviewCount || 1,
          },
        }
      : {}),
  };
}

/** LocalBusiness / AgriService schema for state & city landing pages. */
export function localBusinessSchema(opts: {
  name: string;
  description: string;
  path: string;
  city?: string;
  state?: string;
  region?: string;
  serviceType?: string;
}): JsonLd {
  const locality = opts.city || opts.state || 'India';
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': canonical(opts.path),
    name: opts.name,
    description: opts.description,
    url: canonical(opts.path),
    image: ogImage(),
    address: {
      '@type': 'PostalAddress',
      addressLocality: locality,
      addressRegion: opts.region || opts.state || 'IN',
      addressCountry: 'IN',
    },
    areaServed: opts.state ? { '@type': 'State', name: opts.state } : { '@type': 'City', name: opts.city },
    priceRange: '₹₹',
    ...(opts.serviceType ? { serviceType: opts.serviceType } : {}),
    parentOrganization: { '@id': `${SITE_CONFIG.baseUrl}/#organization` },
  };
}

/** HowTo schema for guides. */
export function howToSchema(opts: {
  name: string;
  description: string;
  path: string;
  steps: { name: string; text: string }[];
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    description: opts.description,
    url: canonical(opts.path),
    step: opts.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

/** VideoObject schema. */
export function videoObjectSchema(opts: {
  name: string;
  description: string;
  path: string;
  thumbnailUrl?: string;
  uploadDate?: string;
  duration?: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: opts.name,
    description: opts.description,
    thumbnailUrl: opts.thumbnailUrl || ogImage(),
    uploadDate: opts.uploadDate || new Date().toISOString(),
    contentUrl: canonical(opts.path),
    embedUrl: canonical(opts.path),
    duration: opts.duration,
    publisher: { '@id': `${SITE_CONFIG.baseUrl}/#organization` },
  };
}

/** Event schema. */
export function eventSchema(opts: {
  name: string;
  description: string;
  path: string;
  startDate: string;
  endDate?: string;
  location: string;
  city: string;
  state: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: opts.name,
    description: opts.description,
    url: canonical(opts.path),
    startDate: opts.startDate,
    ...(opts.endDate ? { endDate: opts.endDate } : {}),
    location: {
      '@type': 'Place',
      name: opts.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: opts.city,
        addressRegion: opts.state,
        addressCountry: 'IN',
      },
    },
    organizer: { '@id': `${SITE_CONFIG.baseUrl}/#organization` },
  };
}

/** Comprehensive JSON-LD bundle for the homepage. */
export function homepageStructuredData(): JsonLd[] {
  return [organizationSchema(), websiteSchema(), softwareAppSchema(), mobileAppSchema()];
}

