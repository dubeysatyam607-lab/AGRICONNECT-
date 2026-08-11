import fs from 'fs';
import path from 'path';

// Base URL of the site – adjust if different
const BASE_URL = 'https://agriconnect.in';

// List of routes to include in the sitemap. Add more as needed.
const routes = [
  '/',
  '/about',
  '/features',
  '/pricing',
  '/blog',
  '/contact',
  '/faq',
  '/help-center',
  '/knowledge-hub',
  '/terms',
  '/privacy-policy',
];

function formatDate(date) {
  return date.toISOString();
}

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n`;
xml += `        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`;

const now = new Date();
for (const route of routes) {
  xml += `  <url>\n`;
  xml += `    <loc>${BASE_URL}${route}</loc>\n`;
  xml += `    <lastmod>${formatDate(now)}</lastmod>\n`;
  xml += `    <changefreq>weekly</changefreq>\n`;
  xml += `    <priority>0.8</priority>\n`;
  xml += `  </url>\n`;
}
xml += `</urlset>`;

const outputPath = path.resolve('public', 'sitemap.xml');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, xml, { encoding: 'utf8' });
console.log('Sitemap generated at', outputPath);
