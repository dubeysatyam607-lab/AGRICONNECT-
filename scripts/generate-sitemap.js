// scripts/generate-sitemap.js
// Simple sitemap generator for AgriConnect static routes
// Run with: npm run gen:sitemap

const fs = require('fs');
const path = require('path');

// Base URL – should match the public site URL
const BASE_URL = process.env.BASE_URL || 'https://agriconnect.in';

// List of canonical paths (no trailing slash unless root)
const routes = [
  '/',
  '/about',
  '/contact',
  '/faq',
  '/pricing',
  '/privacy-policy',
  '/terms',
  '/features',
  '/knowledge-hub',
  '/blogs',
  '/help-center',
  // Core app tabs (from TAB_SEO_META)
  '/mandi',
  '/tractors',
  '/kisan-ai',
  '/crop-doctor',
  '/store',
  '/schemes',
  '/loans',
  '/labor',
  '/cattle-market',
  '/auth',
  '/notification-settings',
  '/transport',
  '/news',
  '/soil-test',
  '/mandi-finder',
  '/cold-storage',
  '/community',
  '/krishi-shorts',
  '/farm-ledger',
  '/crop-insurance',
  '/crop-calendar',
  '/profit-calculator',
  '/price-alerts',
  '/services',
  // Additional static landing pages (state-specific placeholders)
  '/mandi-prices',
  '/schemes',
  '/weather',
  '/tractor-rental',
];

// Build XML entries
const urlEntries = routes
  .map((route) => {
    const loc = `${BASE_URL}${route}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`;
  })
  .join('\n');

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

// Ensure public directory exists
const publicDir = path.resolve(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const sitemapPath = path.join(publicDir, 'sitemap.xml');
fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');
console.log('Sitemap generated at', sitemapPath);
