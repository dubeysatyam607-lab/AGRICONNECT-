// src/pages/FutureFarming.tsx
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import { blogSchema, breadcrumbSchema } from '@/lib/structured-data';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';
import { Link } from 'react-router-dom';

const FutureFarming: React.FC = () => {
  const jsonLd = [
    blogSchema({
      title: 'The Future of Farming Is Connected: How AgriConnect Is Building the Digital Infrastructure for Agriculture',
      description: 'Agriculture is entering a new technological era. AgriConnect is building a unified digital infrastructure to empower farmers.',
      path: '/blogs/future-of-farming',
    }),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Blogs', path: '/blogs' },
      { name: 'Future of Farming', path: '/blogs/future-of-farming' },
    ]),
  ];

  return (
    <>
      <SeoHead
        title="The Future of Farming Is Connected | AgriConnect"
        description="Agriculture is entering a new technological era. AgriConnect is building a unified digital infrastructure to empower farmers."
        canonical="/blogs/future-of-farming"
        keywords={['Agriculture technology', 'AgriConnect', 'digital farming', 'future of farming']}
        ogType="article"
        ogImage={ogImage()}
        jsonLd={jsonLd}
      />
      <main className="min-h-screen bg-background pb-20">
        {/* Hero */}
        <header className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white">
          <div className="responsive-container py-14 md:py-20">
            <MarketingBreadcrumb
              tone="light"
              items={[{ label: 'Home', path: '/' }, { label: 'Blogs', path: '/blogs' }, { label: 'Future of Farming' }]}
            />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              The Future of Farming Is Connected
            </h1>
            <p className="text-emerald-100/85 mt-4 max-w-3xl text-lg leading-relaxed">
              How AgriConnect Is Building the Digital Infrastructure for Agriculture
            </p>
          </div>
        </header>
        {/* Content */}
        <section className="responsive-container py-12 prose prose-invert max-w-4xl mx-auto">
          <p>
            Agriculture is entering a new technological era. For decades, farmers have had to manage weather
            uncertainty, fluctuating mandi prices, crop diseases, expensive machinery, limited access to government
            schemes, and fragmented financial services—often using completely separate sources of information.
          </p>
          <p>
            The problem isn't that agriculture lacks technology. The problem is that agricultural technology is
            fragmented. AgriConnect is built around a simple idea: Everything a farmer needs should work together
            in one intelligent ecosystem.
          </p>
          <p>
            A farmer shouldn't need one application for weather, another for mandi prices, another for machinery,
            another for government schemes, and another for crop disease identification. Information without
            context isn't enough.
          </p>
          <p>
            By unifying data streams, AI advisory, IoT soil monitoring, marketplace rentals, laser fencing, and
            government scheme alerts, AgriConnect creates a seamless digital infrastructure that empowers
            farmers to make smarter decisions every day.
          </p>
        </section>
      </main>
    </>
  );
};

export default FutureFarming;
