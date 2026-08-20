import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://agriconnect-navy-six.vercel.app';

const STATES = [
  'maharashtra', 'uttar-pradesh', 'madhya-pradesh', 'rajasthan', 'karnataka',
  'gujarat', 'andhra-pradesh', 'tamil-nadu', 'west-bengal', 'bihar',
  'punjab', 'haryana', 'jharkhand', 'chhattisgarh', 'odisha', 'telangana',
  'assam', 'kerala', 'jammu-and-kashhimir', 'himachal-pradesh', 'uttarakhand',
  'goa', 'tripura', 'meghalaya', 'manipur', 'nagaland', 'mizoram',
  'arunachal-pradesh', 'sikkim', 'chandigarh', 'delhi',
];

const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/about', priority: '0.8', changefreq: 'monthly' },
  { path: '/features', priority: '0.8', changefreq: 'monthly' },
  { path: '/pricing', priority: '0.7', changefreq: 'monthly' },
  { path: '/blogs', priority: '0.7', changefreq: 'weekly' },
  { path: '/blogs/future-of-farming', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/faq', priority: '0.6', changefreq: 'monthly' },
  { path: '/help-center', priority: '0.5', changefreq: 'monthly' },
  { path: '/knowledge-hub', priority: '0.7', changefreq: 'weekly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
];

const dynamicSections = [
  { prefix: '/mandi-prices', priority: '0.7', changefreq: 'daily' },
  { prefix: '/schemes', priority: '0.7', changefreq: 'monthly' },
  { prefix: '/weather', priority: '0.6', changefreq: 'daily' },
  { prefix: '/tractor-rental', priority: '0.6', changefreq: 'weekly' },
];

const now = new Date().toISOString();

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

for (const page of staticPages) {
  xml += `  <url>\n`;
  xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
  xml += `    <priority>${page.priority}</priority>\n`;
  xml += `  </url>\n`;
}

for (const section of dynamicSections) {
  for (const state of STATES) {
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}${section.prefix}/${state}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>${section.changefreq}</changefreq>\n`;
    xml += `    <priority>${section.priority}</priority>\n`;
    xml += `  </url>\n`;
  }
}

xml += `</urlset>`;

const outputPath = path.resolve('public', 'sitemap.xml');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, xml, { encoding: 'utf8' });
console.log(`Sitemap generated: ${outputPath} (${staticPages.length + dynamicSections.length * STATES.length} URLs)`);
