import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';

const PLANS = [
  {
    id: 'free',
    name: 'Kisan Basic',
    tagline: 'Everything you need to start',
    monthlyPrice: 0,
    annualPrice: 0,
    period: 'forever',
    highlight: false,
    popular: false,
    features: [
      'Live mandi prices',
      '10 AI questions/month',
      'Basic weather',
      'Government scheme alerts',
      'Community Q&A',
      'Crop disease scanning',
    ],
    cta: 'Start Free',
    ctaLink: '/',
  },
  {
    id: 'pro',
    name: 'Kisan Pro',
    tagline: 'For serious farmers',
    monthlyPrice: 49,
    annualPrice: 490,
    period: '/month',
    highlight: true,
    popular: true,
    features: [
      'Everything in Kisan Basic',
      'Unlimited AI advisor',
      'Crop disease detection (unlimited scans)',
      'Price alerts & SMS notifications',
      'Farm analytics dashboard',
      'Crop calendar & farm ledger',
      'Priority support',
      'Reduced ads',
    ],
    cta: 'Upgrade to Pro',
    ctaLink: '/contact',
  },
  {
    id: 'enterprise',
    name: 'Agri Business',
    tagline: 'For mandis, traders & FPOs',
    monthlyPrice: -1,
    annualPrice: -1,
    period: '',
    highlight: false,
    popular: false,
    features: [
      'Everything in Kisan Pro',
      'API access for mandis/traders',
      'Custom integrations',
      'Marketplace storefront',
      'Analytics dashboard',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact',
  },
];

const Pricing: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'OfferCatalog',
      name: 'AgriConnect Plans',
      url: canonical('/pricing'),
      itemListElement: PLANS.map((p) => ({
        '@type': 'ListItem',
        position: PLANS.indexOf(p) + 1,
        item: {
          '@type': 'Offer',
          name: p.name,
          price: p.monthlyPrice === 0 ? '0' : p.monthlyPrice === -1 ? undefined : String(isAnnual ? p.annualPrice : p.monthlyPrice),
          priceCurrency: 'INR',
          description: p.features.join('. '),
          url: canonical('/pricing'),
          availability: 'https://schema.org/InStock',
          eligibleRegion: { '@type': 'Country', name: 'IN' },
        },
      })),
    },
  ];

  const formatPrice = (plan: typeof PLANS[number]) => {
    if (plan.monthlyPrice === -1) return 'Custom';
    if (plan.monthlyPrice === 0) return '₹0';
    return isAnnual ? `₹${plan.annualPrice}` : `₹${plan.monthlyPrice}`;
  };

  const formatPeriod = (plan: typeof PLANS[number]) => {
    if (plan.monthlyPrice === -1) return '';
    if (plan.monthlyPrice === 0) return 'forever';
    return isAnnual ? '/year' : '/month';
  };

  const annualSavings = PLANS[1].monthlyPrice * 12 - PLANS[1].annualPrice;

  return (
    <>
      <SeoHead
        title="Pricing — Free & Pro Plans | AgriConnect"
        description="AgriConnect is free for all farmers. Upgrade to Kisan Pro for unlimited AI advisor, price alerts, and farm analytics — just ₹99/month or ₹799/year."
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

            {/* Annual / Monthly toggle */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/20 px-2 py-1.5" role="group" aria-label="Billing period">
              <button
                onClick={() => setIsAnnual(false)}
                aria-pressed={!isAnnual}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${
                  !isAnnual ? 'bg-white text-emerald-900 shadow-md' : 'text-white/80 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                aria-pressed={isAnnual}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${
                  isAnnual ? 'bg-white text-emerald-900 shadow-md' : 'text-white/80 hover:text-white'
                }`}
              >
                Annual
                {isAnnual && (
                  <span className="ml-1.5 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-[10px] font-black">
                    Save ₹{annualSavings}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 -mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={
                plan.highlight
                  ? 'rounded-2xl border-2 border-primary bg-card p-6 shadow-glow relative md:-mt-4 md:mb-4'
                  : 'rounded-2xl border border-border bg-card p-6 shadow-card relative'
              }
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-hero text-primary-foreground px-4 py-1 text-xs font-black flex items-center gap-1">
                  <Sparkles size={12} /> Most Popular
                </span>
              )}
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{plan.tagline}</p>
              <h2 className="mt-1 text-lg font-black text-foreground">{plan.name}</h2>
              <p className="mt-4 text-4xl font-black text-foreground">
                {formatPrice(plan)}
                <span className="text-sm font-semibold text-muted-foreground"> {formatPeriod(plan)}</span>
              </p>
              {plan.id === 'pro' && isAnnual && (
                <p className="mt-1 text-[11px] font-bold text-emerald-600">That's just ₹{Math.round(plan.annualPrice / 12)}/month</p>
              )}
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={plan.ctaLink}
                className={
                  plan.highlight
                    ? 'mt-6 block text-center rounded-xl gradient-hero text-primary-foreground px-4 py-3 font-bold hover:brightness-110 transition shadow-colorful'
                    : 'mt-6 block text-center rounded-xl border border-border bg-background px-4 py-3 font-bold text-foreground hover:bg-muted transition'
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <section className="mx-auto max-w-3xl px-4 mt-16 text-center">
          <div className="rounded-2xl border border-border bg-muted/40 p-8">
            <h2 className="text-xl font-black text-foreground">100% Free for Farmers — Always</h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xl mx-auto">
              We believe every farmer should have access to mandi bhav, crop disease detection,
              weather, and scheme alerts. These core features will always remain free.
              Kisan Pro simply unlocks unlimited AI and premium analytics.
            </p>
          </div>
        </section>
      </main>
    </>
  );
};

export default Pricing;
