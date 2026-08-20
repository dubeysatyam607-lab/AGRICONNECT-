export const SITE_CONFIG = {
  name: 'AgriConnect',
  url: 'https://agriconnect-navy-six.vercel.app',
  baseUrl: 'https://agriconnect-navy-six.vercel.app',
  legalName: 'AgriConnect Technologies Pvt. Ltd.',
  defaultTitle: 'AgriConnect — Smart Farming & Mandi Prices',
  defaultDescription: 'India\'s complete digital agriculture ecosystem — pay-per-acre AI advisory, live mandi prices, machinery rental, weather, IoT soil monitoring, laser fencing, government schemes, and crop disease detection for the new-age farmer.',
  description: 'India\'s complete digital agriculture ecosystem. Live mandi bhav, pay-per-acre AI advisory, machinery rental, AI crop disease detection, hyperlocal weather, IoT soil monitoring, laser fencing, government schemes & kisan advisory in 12 Indian languages.',
  defaultOgImage: 'https://agriconnect-navy-six.vercel.app/og-image-1200x630.png',
  ogImageAlt: 'AgriConnect — Smart Farming Platform for Indian Farmers',
  themeColor: '#2E7D32',
  twitterHandle: '@AgriConnectIN',
  locales: ['en', 'hi', 'mr', 'gu', 'pa', 'ta', 'te', 'kn', 'ml', 'bn', 'or', 'as'],
  email: 'hello.agriconnect@gmail.com',
  phone: '+91-7067820256',
  foundingDate: '2026-01-01',
  address: {
    streetAddress: 'Survey No. 42, Baner Road',
    addressLocality: 'Pune',
    addressRegion: 'Maharashtra',
    postalCode: '411045',
    addressCountry: 'IN',
  },
  socialProfiles: [
    'https://www.facebook.com/agriconnect',
    'https://www.instagram.com/agriconnect',
    'https://www.youtube.com/@agriconnect',
    'https://www.linkedin.com/company/agriconnect',
  ],
};

export const DEFAULT_FAQS = [
  {
    q: 'What is AgriConnect?',
    a: 'AgriConnect is India\'s smart farming super-app for farmers. It provides real-time mandi prices, AI crop disease scanning, weather forecasts, government scheme tracking, and tractor rentals.',
  },
  {
    q: 'Is AgriConnect free for farmers?',
    a: 'Yes, AgriConnect is 100% free for farmers. You can check live mandi rates, scan crop leaves for disease detection, and track government schemes at zero cost.',
  },
  {
    q: 'How does the AI Crop Doctor work?',
    a: 'Take a photo of an unhealthy leaf on your crop. AgriConnect\'s AI model analyzes the image instantly to identify pests or diseases and recommends organic and chemical treatments.',
  },
  {
    q: 'Which languages are supported?',
    a: 'AgriConnect supports 12 Indian languages including Hindi, English, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, Bengali, Odia, Malayalam, and Assamese.',
  },
];

export interface SeoPageMeta {
  title?: string;
  description?: string;
  canonical?: string;
  keywords?: string[];
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  ogImageAlt?: string;
  robots?: string;
  hreflang?: Record<string, string>;
  publishedTime?: string;
  modifiedTime?: string;
  articleSection?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

export const canonical = (path: string = ''): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_CONFIG.url}${cleanPath}`;
};

export const ogImage = (path: string = SITE_CONFIG.defaultOgImage): string => {
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_CONFIG.url}${cleanPath}`;
};
