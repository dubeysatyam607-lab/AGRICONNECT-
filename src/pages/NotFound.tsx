import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SeoHead } from "@/components/seo/SeoHead";
import { canonical, ogImage } from "@/lib/seo-config";

const NotFound = () => {
  const location = useLocation();
  const isGone = /^\/old-|\/deprecated\//.test(location.pathname);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': isGone ? 'ItemPage' : 'WebPage',
      name: isGone ? 'Page Removed (410)' : 'Page Not Found (404)',
      url: canonical(location.pathname),
      description: isGone
        ? 'This page has been permanently removed from AgriConnect.'
        : 'The page you are looking for could not be found. Explore AgriConnect\'s farming tools instead.',
    },
  ];

  return (
    <>
      <SeoHead
        title={isGone ? 'Page Removed — AgriConnect' : '404 — Page Not Found | AgriConnect'}
        description={
          isGone
            ? 'This page has been permanently removed. Explore live mandi bhav, AI crop doctor, weather, and tractor rental on AgriConnect.'
            : 'The page you are looking for could not be found. Explore live mandi bhav, AI crop doctor, weather forecasts, and tractor rental on AgriConnect instead.'
        }
        canonical={isGone ? undefined : location.pathname}
        ogImage={ogImage()}
        robots={isGone ? 'noindex, nofollow' : 'noindex, follow'}
        jsonLd={jsonLd}
      />

      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white flex flex-col items-center justify-center px-6 py-20">
        <p className="text-7xl md:text-8xl font-black text-emerald-400/60" aria-hidden="true">
          {isGone ? '410' : '404'}
        </p>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight mt-4 text-center">
          {isGone ? 'This Page Has Been Removed' : 'Page Not Found'}
        </h1>
        <p className="text-emerald-100/80 mt-3 max-w-xl text-center leading-relaxed">
          {isGone
            ? 'The page you tried to open has been permanently removed. But your farm tools are still here — find what you need below.'
            : 'The page you are looking for may have moved or never existed. But your farm tools are still here — find what you need below.'}
        </p>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl w-full">
          {[
            { to: '/', label: '🌾 Home' },
            { to: '/mandi-prices/rajasthan', label: '📊 Mandi Bhav' },
            { to: '/tractor-rental/jaipur', label: '🚜 Tractor Rental' },
            { to: '/weather/jaipur', label: '⛅ Weather' },
            { to: '/schemes/rajasthan', label: '🏛️ Schemes' },
            { to: '/faq', label: '❓ FAQ' },
          ].map((link) => (
            <Link
              key={link.to + link.label}
              to={link.to}
              className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 text-sm font-semibold text-center hover:bg-white/20 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Link
          to="/"
          className="mt-8 rounded-lg bg-white text-emerald-900 px-6 py-3 font-bold hover:bg-emerald-50 transition"
        >
          Go to Homepage
        </Link>

        <p className="text-emerald-100/50 text-sm mt-6">
          Requested path: <code className="text-emerald-300">{location.pathname}</code>
        </p>
      </div>
    </>
  );
};

export default NotFound;

