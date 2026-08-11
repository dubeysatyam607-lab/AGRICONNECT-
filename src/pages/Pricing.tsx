import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';

const PLANS = [
  {
    name: 'Kisan (Free)',
    price: '₹0',
    period: 'forever',
    highlight: true,
    features: [
      'Live mandi bhav prices',
      'AI Crop Doctor (unlimited scans)',
      'Hyperlocal weather forecasts',
      'Government scheme alerts',
      'Kisan AI chat (limited)',
      'Community Q&A',
    ],
    cta: 'Start Free',
  },
  {
    name: 'Kisan Plus',
    price: '₹299',
    period: '/year',
    highlight: false,
    features: [
      'Everything in Kisan (Free)',
      'Unlimited Kisan AI chat',
      'Advanced mandi price alerts',
      'Crop calendar & farm ledger',
      'Priority support',
      'Offline sync & backup',
    ],
    cta: 'Upgrade',
  },
  {
    name: 'Sahayak (Business)',
    price: 'Custom',
    period: '',
    highlight: false,
    features: [
      'Everything in Kisan Plus',
      'Tractor/machinery listing',
      'Marketplace storefront',
      'Analytics dashboard',
      'API access',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
  },
];

const Pricing: React.FC = () => {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'OfferCatalog',
      name: 'AgriConnect Plans',
      url: canonical('/pricing'),
      itemListElement: PLANS.map((p) => ({
        '@type': 'Offer',
        name: p.name,
        price: p.price === 'Custom' ? undefined : Number(p.price.replace(/[^\d]/g, '')),
        priceCurrency: 'INR',
        description: p.features.join('. '),
      })),
    },
  ];

  return (
    <>
      <SeoHead
        title="Pricing — Free & Premium Plans | AgriConnect"
        description="AgriConnect is free for all farmers. Explore the free Kisan plan or upgrade to Kisan Plus for unlimited AI chat, advanced mandi alerts, and farm ledger — from just ₹299/year."
        canonical="/pricing"
        keywords={['AgriConnect pricing', 'free farming app', 'kisan app cost', 'farm management app price', 'agritech pricing India']}
        ogType="website"
        ogImage={ogImage()}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-background pb-20">
        <header className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white">
          <div className="mx-auto max-w-5xl px-4 py-14 md:py-20 text-center">
            <MarketingBreadcrumb
              tone="light"
              items={[{ label: 'Home', path: '/' }, { label: 'Pricing' }]}
              className="justify-center"
            />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">Simple, Farmer-Friendly Pricing</h1>
            <p className="text-emerald-100/80 mt-3 max-w-2xl mx-auto text-lg">
              Start free. Upgrade only if you need more. No hidden charges — ever.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.highlight
                  ? 'rounded-2xl border-2 border-primary bg-card p-6 shadow-glow relative'
                  : 'rounded-2xl border border-border bg-card p-6 shadow-card'
              }
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-hero text-primary-foreground px-3 py-1 text-xs font-bold">
                  Most Popular
                </span>
              )}
              <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
              <p className="mt-3 text-4xl font-black text-foreground">
                {plan.price}
                <span className="text-sm font-semibold text-muted-foreground"> {plan.period}</span>
              </p>
              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-emerald-600 font-bold mt-0.5" aria-hidden="true">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className={
                  plan.highlight
                    ? 'mt-6 block text-center rounded-lg gradient-hero text-primary-foreground px-4 py-2.5 font-semibold hover:brightness-110 transition'
                    : 'mt-6 block text-center rounded-lg border border-border bg-background px-4 py-2.5 font-semibold text-foreground hover:bg-muted transition'
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <section className="mx-auto max-w-3xl px-4 text-center">
          <div className="rounded-2xl border border-border bg-muted/40 p-6">
            <h2 className="font-bold text-foreground">100% Free for Farmers — Always</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              We believe every farmer should have access to mandi bhav, crop disease detection,
              weather, and scheme alerts. These core features will always remain free.
            </p>
          </div>
        </section>
      </main>
    </>
  );
};

export default Pricing;

