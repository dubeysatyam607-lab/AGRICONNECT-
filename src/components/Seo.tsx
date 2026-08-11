import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title: string;
  description: string;
  pathname?: string;
  ogImage?: string;
}

export const Seo: React.FC<SeoProps> = ({ title, description, pathname = '/', ogImage }) => {
  const baseUrl = process.env.VITE_BASE_URL?.replace(/\/*$/, '') || '';
  const canonical = `${baseUrl}${pathname}`;
  const ogImg = ogImage ? `${baseUrl}${ogImage}` : `${baseUrl}/og-image.png`;
  const siteName = 'AgriConnect';
  const brandTagline = 'AI‑Powered Agriculture Platform for Indian Farmers';

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content="index, follow" />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImg} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImg} />
    </Helmet>
  );
};
