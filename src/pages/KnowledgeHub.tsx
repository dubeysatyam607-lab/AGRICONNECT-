import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import { breadcrumbSchema, howToSchema } from '@/lib/structured-data';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';
import {
  BookOpen, IndianRupee, Landmark, CloudSun, Bot, ScanSearch, MessageCircle, FileText,
  ArrowRight,
} from 'lucide-react';

const HUB_SECTIONS = [
  {
    title: 'Crop Guides',
    desc: 'Sowing, fertilizer, irrigation, and harvest guides for wheat, soybean, cotton, tomato, and more.',
    icon: BookOpen,
    links: [
      { to: '/blogs', label: 'Read farming blogs' },
      { to: '/features#knowledge', label: 'Knowledge Hub feature' },
    ],
  },
  {
    title: 'Mandi Bhav',
    desc: 'Understand modal prices, MSP, and 30-day price trends before you sell your produce.',
    icon: IndianRupee,
    links: [
      { to: '/mandi-prices/rajasthan', label: 'Check live mandi prices' },
      { to: '/faq', label: 'Mandi FAQs' },
    ],
  },
  {
    title: 'Government Schemes',
    desc: 'PM-KISAN, KCC, PMFBY, Soil Health Card — eligibility, deadlines, and application steps.',
    icon: Landmark,
    links: [
      { to: '/schemes/rajasthan', label: 'Browse schemes' },
      { to: '/faq', label: 'Scheme FAQs' },
    ],
  },
  {
    title: 'Weather & Irrigation',
    desc: 'Hyperlocal forecasts, rain probability, and water-smart irrigation planning.',
    icon: CloudSun,
    links: [
      { to: '/weather/jaipur', label: 'Weather forecast' },
      { to: '/faq', label: 'Weather FAQs' },
    ],
  },
  {
    title: 'AI Tools',
    desc: 'Use the Kisan AI assistant and AI Crop Doctor for instant, verified farm advice.',
    icon: Bot,
    links: [
      { to: '/features#ai-assistant', label: 'Kisan AI assistant' },
      { to: '/features#crop-doctor', label: 'AI Crop Doctor' },
    ],
  },
  {
    title: 'Help & Support',
    desc: 'Get answers, report issues, or reach the kisan helpdesk directly.',
    icon: MessageCircle,
    links: [
      { to: '/help-center', label: 'Visit Help Center' },
      { to: '/contact', label: 'Contact us' },
    ],
  },
];

const POPULAR_GUIDES = [
  { title: 'When to sow wheat in India', path: '/faq', time: '3 min read' },
  { title: 'How to take a leaf photo for AI Crop Doctor', path: '/faq', time: '2 min read' },
  { title: 'PM-KISAN: check installment status', path: '/schemes/rajasthan', time: '4 min read' },
  { title: 'Understand modal price vs MSP', path: '/faq', time: '3 min read' },
];

const KnowledgeHub: React.FC = () => {
  const jsonLd = [
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Knowledge Hub', path: '/knowledge-hub' },
    ]),
    howToSchema({
      name: 'Check today\'s mandi bhav for your crop',
      description: 'Step-by-step guide to checking live mandi prices for any crop on AgriConnect.',
      path: '/knowledge-hub',
      steps: [
        { name: 'Open Mandi Prices', text: 'Go to the Mandi section in the app or website and choose your state and mandi.' },
        { name: 'Search your crop', text: 'Search for your crop — wheat, soybean, onion, tomato — and see today\'s minimum, maximum and modal rates.' },
        { name: 'Set a price alert', text: 'Star the crop and set your target rate to get notified when prices hit your selling point.' },
      ],
    }),
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'AgriConnect Knowledge Hub',
      url: canonical('/knowledge-hub'),
      description:
        'Crop guides, mandi bhav tips, government scheme guides, weather advisories and AI farming help for Indian farmers.',
      mainEntity: { '@id': `${canonical('/')}#organization` },
    },
  ];

  return (
    <>
      <SeoHead
        title="Knowledge Hub — Crop Guides & Farming Tips | AgriConnect"
        description="AgriConnect Knowledge Hub — crop guides, mandi bhav tips, government scheme guides, weather advisories, and AI farming help. Practical, step-by-step knowledge for Indian farmers."
        canonical="/knowledge-hub"
        keywords={['knowledge hub', 'crop guides India', 'farming tips Hindi', 'mandi bhav guide', 'government schemes guide', 'kisan learning']}
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
              items={[{ label: 'Home', path: '/' }, { label: 'Knowledge Hub' }]}
            />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Knowledge Hub
            </h1>
            <p className="text-emerald-100/85 mt-4 max-w-3xl text-lg leading-relaxed">
              Practical farming knowledge in simple language — crop guides, mandi bhav tips,
              government scheme walkthroughs, weather advisories, and AI tools for Indian farmers.
            </p>
          </div>
        </header>

        {/* Hub sections */}
        <section className="responsive-container py-12" aria-label="Knowledge categories">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HUB_SECTIONS.map((s) => (
              <article key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-card flex flex-col">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl gradient-hero text-primary-foreground">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-foreground">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                <ul className="mt-auto pt-4 space-y-2">
                  {s.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                      >
                        {l.label}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Popular guides */}
        <section className="bg-muted/40 border-y border-border" aria-labelledby="popular-guides-heading">
          <div className="responsive-container py-12">
            <h2 id="popular-guides-heading" className="text-2xl md:text-3xl font-bold text-foreground">
              Popular Guides
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {POPULAR_GUIDES.map((g) => (
                <Link
                  key={g.title}
                  to={g.path}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-card hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    {g.time}
                  </div>
                  <h3 className="mt-2 font-bold text-foreground group-hover:text-emerald-700 transition-colors">
                    {g.title}
                  </h3>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link to="/blogs" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition">
                Browse all blogs
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="responsive-container py-14 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Still looking for an answer?
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Ask the Kisan AI assistant in Hindi or your mother tongue — it gives instant,
            verified advice on crops, pests, and mandi prices.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link to="/" className="inline-flex items-center gap-2 rounded-lg gradient-hero text-primary-foreground px-6 py-3 font-semibold shadow-md hover:brightness-110 transition">
              <Bot className="h-5 w-5" aria-hidden="true" />
              Ask Kisan AI
            </Link>
            <Link to="/faq" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground hover:bg-muted transition">
              <ScanSearch className="h-5 w-5" aria-hidden="true" />
              Browse FAQs
            </Link>
          </div>
        </section>
      </main>
    </>
  );
};

export default KnowledgeHub;
