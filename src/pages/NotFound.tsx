import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, LineChartIcon, Truck, CloudSun, Landmark, CircleHelp } from "lucide-react";
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

      <div className="min-h-screen bg-emerald-900 text-white flex flex-col items-center justify-center px-6 py-20">
        <p className="text-7xl md:text-8xl font-semibold text-emerald-400/60" aria-hidden="true">
          {isGone ? '410' : '404'}
        </p>
        <h1 className="text-2xl md:text-4xl font-semibold tracking-tight mt-4 text-center">
          {isGone ? 'This Page Has Been Removed' : 'Page Not Found'}
        </h1>
        <p className="text-emerald-100/80 mt-3 max-w-xl text-center leading-relaxed">
          {isGone
            ? 'The page you tried to open has been permanently removed. But your farm tools are still here — find what you need below.'
            : 'The page you are looking for may have moved or never existed. But your farm tools are still here — find what you need below.'}
        </p>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl w-full">
          {[
            { to: '/', label: 'Home', icon: <Home className="h-4 w-4" /> },
            { to: '/mandi-prices/rajasthan', label: 'Mandi Bhav', icon: <LineChartIcon className="h-4 w-4" /> },
            { to: '/tractor-rental/jaipur', label: 'Tractor Rental', icon: <Truck className="h-4 w-4" /> },
            { to: '/weather/jaipur', label: 'Weather', icon: <CloudSun className="h-4 w-4" /> },
            { to: '/schemes/rajasthan', label: 'Schemes', icon: <Landmark className="h-4 w-4" /> },
            { to: '/faq', label: 'FAQ', icon: <CircleHelp className="h-4 w-4" /> },
          ].map((link) => (
            <Link
              key={link.to + link.label}
              to={link.to}
              className="rounded-xl bg-white/10  border border-white/15 px-4 py-3 text-sm font-semibold text-center hover:bg-white/20 transition-colors"
            >
              <span className="inline-flex items-center justify-center gap-2">
                {link.icon} {link.label}
              </span>
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

