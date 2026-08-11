import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import { blogSchema, breadcrumbSchema } from '@/lib/structured-data';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';
import { ArrowRight, BookOpen } from 'lucide-react';

const ARTICLES = [
  {
    title: 'What Is AgriConnect? Inside India\'s Complete Digital Agriculture Ecosystem',
    category: 'About AgriConnect',
    readTime: '5 min read',
    date: '2026-08-01',
    excerpt: 'AI advisory, machinery rental, IoT soil sensors, laser fencing, live mandi bhav — how one platform is digitizing Indian agriculture for the new-age farmer.',
    to: '/about',
  },
  {
    title: 'Pay-Per-Acre AI Advisory: Expert Guidance for Every Farmer',
    category: 'AI Advisory',
    readTime: '4 min read',
    date: '2026-07-29',
    excerpt: 'How crop, soil, weather, and stage-aware AI advice priced per acre makes expert guidance affordable for small and marginal farmers.',
    to: '/features#advisory',
  },
  {
    title: 'Rent Out Your Idle Tractor & Earn Extra Income',
    category: 'Marketplace',
    readTime: '4 min read',
    date: '2026-07-25',
    excerpt: 'Your tractor, harvester, seed drill, or rotavator sits idle most of the year. Here is how to turn it into steady rental income.',
    to: '/features#marketplace',
  },
  {
    title: 'IoT Soil Moisture Monitoring: Water Only When Your Crop Needs It',
    category: 'IoT & Smart Farming',
    readTime: '4 min read',
    date: '2026-07-18',
    excerpt: 'Real-time soil moisture sensors cut water and diesel use while improving yield — a simple IoT upgrade for any farm.',
    to: '/features#iot-soil',
  },
  {
    title: 'Digital Laser Fencing: Protect Your Farm 24×7 Without Guards',
    category: 'Farm Security',
    readTime: '3 min read',
    date: '2026-07-12',
    excerpt: 'Laser beams along your field boundary send instant intrusion alerts to your phone — crop security without night guards.',
    to: '/features#laser-fencing',
  },
  {
    title: 'How to Get a Better Price for Your Wheat Crop',
    category: 'Mandi Bhav',
    readTime: '4 min read',
    date: '2026-07-28',
    excerpt: 'Grading, timing, and mandi selection tips that can lift your wheat sale price by 10-20% this season.',
    to: '/mandi-prices/rajasthan',
  },
  {
    title: 'AI Crop Doctor: A 2-Minute Guide to Leaf Scanning',
    category: 'AI Tools',
    readTime: '3 min read',
    date: '2026-07-22',
    excerpt: 'How to photograph a diseased leaf the right way and read the AI diagnosis with its confidence score.',
    to: '/features#crop-doctor',
  },
  {
    title: 'PM-KISAN 2026: Check Your Installment Status Online',
    category: 'Government Schemes',
    readTime: '4 min read',
    date: '2026-07-15',
    excerpt: 'Step-by-step walkthrough for checking PM-KISAN beneficiary status and next installment dates.',
    to: '/schemes/rajasthan',
  },
  {
    title: '5 Ways Hyperlocal Weather Saves Water This Kharif',
    category: 'Weather',
    readTime: '3 min read',
    date: '2026-07-08',
    excerpt: 'Rain probability, spraying windows, and irrigation timing — how village-level forecasts cut water use.',
    to: '/weather/jaipur',
  },
  {
    title: 'Organic Farming for Beginners: From Compost to Certification',
    category: 'Smart Farming',
    readTime: '6 min read',
    date: '2026-06-30',
    excerpt: 'How to start organic farming — building compost, choosing crops, and getting PGS or NPOP certification.',
    to: '/knowledge-hub',
  },
  {
    title: 'How to Talk to Kisan AI in Hindi: Real Examples',
    category: 'AI Tools',
    readTime: '3 min read',
    date: '2026-06-24',
    excerpt: 'Real questions farmers ask the Kisan AI assistant — and the verified, crop-aware answers it gives.',
    to: '/features#ai-assistant',
  },
];

const Blog: React.FC = () => {
  const jsonLd = [
    blogSchema({
      title: 'AgriConnect Farming Blog',
      description: 'Practical farming articles for Indian farmers — mandi bhav, crop guides, government schemes, weather, and AI farming tips.',
      path: '/blogs',
    }),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Blogs', path: '/blogs' },
    ]),
  ];

  return (
    <>
      <SeoHead
        title="Farming Blog — Crop Tips & Market News | AgriConnect"
        description="Read AgriConnect's farming blog — mandi bhav tips, crop guides, AI farming how-tos, government scheme walkthroughs, and weather advisories for Indian farmers."
        canonical="/blogs"
        keywords={['farming blog India', 'kisan blog', 'crop tips', 'mandi bhav news', 'smart farming articles']}
        ogType="website"
        ogImage={ogImage()}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-background pb-20">
        {/* Hero */}
        <header className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white">
          <div className="responsive-container py-14 md:py-20">
            <MarketingBreadcrumb
              tone="light"
              items={[{ label: 'Home', path: '/' }, { label: 'Blogs' }]}
            />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Farming Blog
            </h1>
            <p className="text-emerald-100/85 mt-4 max-w-3xl text-lg leading-relaxed">
              Practical articles on mandi bhav, crop care, government schemes, and smart farming —
              written for Indian farmers in simple language.
            </p>
          </div>
        </header>

        {/* Article cards */}
        <section className="responsive-container py-12" aria-label="Blog articles">
          <div className="grid gap-5 md:grid-cols-2">
            {ARTICLES.map((a) => (
              <Link
                key={a.title}
                to={a.to}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    {a.category}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {a.date} · {a.readTime}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold leading-snug text-foreground group-hover:text-emerald-700 dark:text-emerald-400 transition-colors">
                  {a.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.excerpt}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Read article
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-2xl bg-muted/40 border border-border p-6 text-center">
            <BookOpen className="mx-auto h-6 w-6 text-emerald-600" aria-hidden="true" />
            <h2 className="mt-2 font-bold text-foreground">Want deeper guides?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Visit the Knowledge Hub for structured, step-by-step farming guides.
            </p>
            <Link
              to="/knowledge-hub"
              className="inline-flex items-center gap-1.5 mt-4 rounded-lg gradient-hero text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-md hover:brightness-110 transition"
            >
              Open Knowledge Hub
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
};

export default Blog;
