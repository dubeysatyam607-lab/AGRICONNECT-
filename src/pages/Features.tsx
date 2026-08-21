import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import { breadcrumbSchema } from '@/lib/structured-data';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';
import {
  Bot, Store, CloudSun, IndianRupee, ScanSearch, Landmark, BookOpen, Tractor,
  BadgeIndianRupee, Droplets, ShieldAlert, CalendarCheck, ArrowRight, Check,
} from 'lucide-react';

const FEATURES = [
  {
    id: 'ai-assistant',
    icon: Bot,
    title: 'Kisan AI Assistant',
    tag: 'Most Used',
    desc: 'Ask farming questions in Hindi or your mother tongue. Get verified advice on sowing depth, fertilizer doses, pest control, and mandi selling — with crop-aware context and offline support.',
    bullets: ['12 Indian languages', 'Crop & stage aware', 'Works offline'],
    link: { to: '/', label: 'Try the AI Assistant' },
  },
  {
    id: 'marketplace',
    icon: Store,
    title: 'Marketplace',
    tag: '',
    desc: 'Sell produce directly to verified buyers and buy certified seeds, fertilizer, and pesticides at fair prices — cutting out middlemen and improving margins by 15-30%.',
    bullets: ['Verified buyers & sellers', 'Fair price discovery', 'Direct farm-to-farm trade'],
    link: { to: '/', label: 'Explore Marketplace' },
  },
  {
    id: 'weather',
    icon: CloudSun,
    title: 'Hyperlocal Weather',
    tag: '',
    desc: 'Hourly and 7-day forecasts for your village with rain probability, wind speed, and humidity — plus crop-stage-specific advisories so you irrigate and spray at the right time.',
    bullets: ['Village-level accuracy', 'Rain & spraying windows', 'Monsoon alerts'],
    link: { to: '/weather/jaipur', label: 'Check Weather' },
  },
  {
    id: 'mandi',
    icon: IndianRupee,
    title: 'Live Mandi Bhav',
    tag: 'Free',
    desc: 'Real-time APMC mandi prices across 28 states — minimum, maximum, and modal rates with 30-day trends, top gainers/losers, and price alerts when rates hit your target.',
    bullets: ['Daily APMC updates', '30-day price trends', 'Set your own alerts'],
    link: { to: '/mandi-prices/rajasthan', label: 'See Mandi Prices' },
  },
  {
    id: 'crop-doctor',
    icon: ScanSearch,
    title: 'AI Crop Doctor',
    tag: '',
    desc: 'Photograph an unhealthy leaf and get an instant diagnosis with confidence score, plus organic and chemical treatments. Covers wheat, rice, soybean, cotton, tomato, chilli and more.',
    bullets: ['Instant leaf scan', 'Organic-first remedies', 'Disease outbreak alerts'],
    link: { to: '/', label: 'Scan a Crop' },
  },
  {
    id: 'schemes',
    icon: Landmark,
    title: 'Government Schemes',
    tag: '',
    desc: 'Track PM-KISAN, KCC, PMFBY, Soil Health Card and state schemes like Rythu Bandhu and KALIA — with eligibility, deadlines, and step-by-step application guidance.',
    bullets: ['Deadline reminders', 'Eligibility checker', 'State-wise coverage'],
    link: { to: '/schemes/rajasthan', label: 'Browse Schemes' },
  },
  {
    id: 'knowledge',
    icon: BookOpen,
    title: 'Knowledge Hub',
    tag: '',
    desc: 'Crop guides, farming blogs, and how-to articles written for Indian farmers — from crop rotation and soil pH to post-harvest storage and organic farming.',
    bullets: ['Step-by-step guides', 'Hindi + English', 'Practical field advice'],
    link: { to: '/knowledge-hub', label: 'Open Knowledge Hub' },
  },
  {
    id: 'tractor',
    icon: Tractor,
    title: 'Tractor & Machinery Rental',
    tag: '',
    desc: 'Book tractors, harvesters, rotavators, and threshers from verified owners near you with transparent hourly or per-acre rates and ratings from other farmers.',
    bullets: ['Verified owners', 'Transparent pricing', 'Instant booking'],
    link: { to: '/tractor-rental/jaipur', label: 'Book Machinery' },
  },
  {
    id: 'advisory',
    icon: BadgeIndianRupee,
    title: 'Pay-Per-Acre AI Advisory',
    tag: 'New',
    desc: 'Personalized AI farm advisory priced per acre. Based on your crop, soil, weather, and farming stage, get stage-wise guidance on sowing, fertilizer, irrigation, and pest control — affordable for every farmer.',
    bullets: ['Crop, soil & stage aware', 'Affordable per-acre pricing', 'Expert-grade guidance'],
    link: { to: '/', label: 'Get Personalized Advice' },
  },
  {
    id: 'iot-soil',
    icon: Droplets,
    title: 'IoT Soil Moisture Monitoring',
    tag: 'New',
    desc: 'Place IoT soil moisture sensors in your field and get real-time soil moisture and temperature readings. Irrigate only when your crop needs water — saving water, diesel, and labor while improving yield.',
    bullets: ['Real-time sensor data', 'Smarter irrigation', 'Water & energy savings'],
    link: { to: '/', label: 'Explore IoT Monitoring' },
  },
  {
    id: 'laser-fencing',
    icon: ShieldAlert,
    title: 'Digital Laser Fencing',
    tag: 'New',
    desc: 'Protect your farm boundary with digital laser beams that detect intrusions by animals or people and send instant alerts to your phone — 24×7 crop security without night guards.',
    bullets: ['Guard-free security', 'Instant intrusion alerts', 'Protects crops day & night'],
    link: { to: '/', label: 'Secure Your Farm' },
  },
  {
    id: 'tasks',
    icon: CalendarCheck,
    title: 'Farming Tasks & Planner',
    tag: '',
    desc: 'Plan and track daily farming tasks — sowing, spraying, irrigation, fertilizer application, and harvesting — with reminders so no critical farm operation is ever missed.',
    bullets: ['Daily task planner', 'Crop calendar & reminders', 'Never miss a farm operation'],
    link: { to: '/', label: 'Plan Your Farm' },
  },
];

const Features: React.FC = () => {
  const jsonLd = [
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Features', path: '/features' },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'AgriConnect Features',
      url: canonical('/features'),
      description:
        'Explore AgriConnect features — pay-per-acre AI advisory, Kisan AI assistant, machinery rental marketplace, hyperlocal weather, live mandi bhav, AI crop doctor, IoT soil monitoring, laser fencing, government schemes and knowledge hub.',
      mainEntity: { '@id': `${canonical('/')}#organization` },
    },
  ];

  return (
    <>
      <SeoHead
        title="Features — AI Farming Tools for Indian Farmers | AgriConnect"
        description="Explore AgriConnect's features: pay-per-acre AI advisory, Kisan AI assistant in 12 languages, live mandi bhav, AI crop doctor, hyperlocal weather, machinery rental marketplace, IoT soil monitoring, laser fencing, government schemes and knowledge hub — free for farmers."
        canonical="/features"
        keywords={['AgriConnect features', 'AI farming tools', 'kisan app features', 'mandi bhav app', 'crop disease detection', 'tractor rental app India', 'IoT soil monitoring', 'laser fencing farm', 'pay per acre advisory']}
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
              items={[{ label: 'Home', path: '/' }, { label: 'Features' }]}
            />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Everything a Farmer Needs, in One App
            </h1>
            <p className="text-emerald-100/85 mt-4 max-w-3xl text-lg leading-relaxed">
              From live mandi bhav to AI crop diagnosis, pay-per-acre advisory, machinery rental,
              IoT soil monitoring, and laser fencing — AgriConnect is India's complete digital
              agriculture ecosystem, in 12 Indian languages.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-lg bg-white text-emerald-900 px-6 py-3 font-semibold shadow-md hover:bg-emerald-50 transition"
              >
                Open the App
              </Link>
              <Link
                to="/knowledge-hub"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 font-semibold hover:bg-white/20 transition"
              >
                Browse Knowledge Hub
              </Link>
            </div>
          </div>
        </header>

        {/* Anchor quick-nav */}
        <nav aria-label="Feature categories" className="sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="responsive-container py-3 overflow-x-auto">
            <ul className="flex gap-2 min-w-max">
              {FEATURES.map((f) => (
                <li key={f.id}>
                  <a
                    href={`#${f.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                  >
                    <f.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {f.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Feature cards */}
        <section className="responsive-container py-12" aria-label="Features list">
          <div className="grid gap-5 md:grid-cols-2">
            {FEATURES.map((f) => (
              <article
                key={f.id}
                id={f.id}
                className="scroll-mt-32 rounded-2xl border border-border bg-card p-6 shadow-card flex flex-col"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl gradient-hero text-primary-foreground">
                    <f.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{f.title}</h2>
                    {f.tag && (
                      <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-secondary">
                        {f.tag}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                <ul className="mt-4 space-y-1.5">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-[13px] font-medium text-foreground/80">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-5">
                  <Link
                    to={f.link.to}
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                  >
                    {f.link.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="responsive-container text-center">
          <div className="rounded-3xl gradient-hero text-primary-foreground px-6 py-12 shadow-glow">
            <h2 className="text-2xl md:text-3xl font-black">Start Using AgriConnect Today</h2>
            <p className="mx-auto mt-3 max-w-2xl text-primary-foreground/85">
              Live mandi bhav, AI crop doctor, hyperlocal weather, and government scheme alerts —
              100% free for farmers in 12 Indian languages.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Link to="/" className="rounded-lg bg-white text-emerald-900 px-6 py-3 font-semibold shadow-md hover:bg-emerald-50 transition">
                Open the App
              </Link>
              <Link to="/faq" className="rounded-lg border border-white/30 bg-white/10 px-6 py-3 font-semibold hover:bg-white/20 transition">
                Read the FAQ
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Features;
