import { Link, useLocation, useParams } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import { localBusinessSchema, breadcrumbSchema, faqSchema } from '@/lib/structured-data';
import { getStateBySlug, getCityBySlug, INDIAN_STATES, MANDI_CITIES } from '@/lib/states-data';
import NotFound from './NotFound';

type LandingType = 'mandi-prices' | 'schemes' | 'weather' | 'tractor-rental';

const LANDING_META: Record<LandingType, {
  noun: string;
  nounPlural: string;
  h1Template: (name: string) => string;
  descTemplate: (name: string) => string;
}> = {
  'mandi-prices': {
    noun: 'Mandi Prices',
    nounPlural: 'Mandi Bhav',
    h1Template: (name) => `Mandi Prices in ${name}: Today's Live Mandi Bhav Rates`,
    descTemplate: (name) =>
      `Check today's live mandi bhav rates in ${name}. Compare ${name} mandi prices for wheat, soybean, mustard, cotton and more — updated daily on AgriConnect.`,
  },
  schemes: {
    noun: 'Government Schemes',
    nounPlural: 'Kisan Schemes',
    h1Template: (name) => `Government Schemes for Farmers in ${name} (2026)`,
    descTemplate: (name) =>
      `List of active government schemes for farmers in ${name} — PM-KISAN, KCC, Fasal Bima, state-specific subsidies. Eligibility, benefits, and application steps.`,
  },
  weather: {
    noun: 'Weather',
    nounPlural: 'Weather Forecast',
    h1Template: (name) => `Weather in ${name} Today & 7-Day Forecast for Farmers`,
    descTemplate: (name) =>
      `Get hyperlocal ${name} weather forecast — hourly & 7-day temperature, rain probability, humidity, and wind speed. Farming advisories for ${name}.`,
  },
  'tractor-rental': {
    noun: 'Tractor Rental',
    nounPlural: 'Tractor Booking',
    h1Template: (name) => `Tractor Rental in ${name}: Book Tractors & Harvesters Online`,
    descTemplate: (name) =>
      `Book tractors, harvesters, rotavators, and tillers in ${name} at affordable hourly/acre rates. Verified owners, transparent pricing, instant booking on AgriConnect.`,
  },
};

const StateLanding: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  // Route shapes: /mandi-prices/:slug, /schemes/:slug, /weather/:slug, /tractor-rental/:slug
  const type = (location.pathname.split('/')[1] || '') as LandingType;
  const landingType = (type as LandingType) || 'mandi-prices';

  // Validate type
  if (!(landingType in LANDING_META)) {
    return <NotFound />;
  }

  const isCity = landingType === 'weather' || landingType === 'tractor-rental';
  const entity = isCity ? getCityBySlug(slug || '') : getStateBySlug(slug || '');
  const meta = LANDING_META[landingType];

  if (!entity) {
    return <NotFound />;
  }

  const name = isCity ? (entity as { name: string }).name : (entity as { name: string }).name;
  const state = isCity
    ? (entity as { state: string }).state
    : name;
  const region = isCity ? (entity as { state: string }).state : (entity as { region: string }).region;

  const path = `/${landingType}/${slug}`;
  const title = meta.h1Template(name);
  const description = meta.descTemplate(name);

  // Build keyword-rich bullets
  const crops = isCity
    ? (entity as { famousCrops: string[] }).famousCrops
    : (entity as { majorCrops: string[] }).majorCrops;

  const jsonLd = [
    localBusinessSchema({
      name: `AgriConnect ${meta.noun} — ${name}`,
      description,
      path,
      city: isCity ? name : undefined,
      state: isCity ? state : name,
      region,
      serviceType: meta.noun,
    }),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: meta.noun, path: `/${landingType}` },
      { name: name, path },
    ]),
    faqSchema([
      {
        q: `What are today's ${meta.noun.toLowerCase()} in ${name}?`,
        a: `Open the AgriConnect ${meta.noun.toLowerCase()} section for ${name} to see today's live rates, updated daily from APMC mandis and verified sources.`,
      },
      {
        q: `How can farmers in ${name} use AgriConnect?`,
        a: `Farmers in ${name} can use AgriConnect to check live mandi bhav, scan crops with AI Crop Doctor, get hyperlocal weather, find tractor rental, and receive government scheme alerts — free, in their language.`,
      },
    ]),
  ];

  const stateList = isCity
    ? MANDI_CITIES.filter((c) => c.state === state).slice(0, 6)
    : [];

  const allStates = INDIAN_STATES;
  const allCities = MANDI_CITIES;

  return (
    <>
      <SeoHead
        title={title}
        description={description}
        canonical={path}
        keywords={[
          meta.noun.toLowerCase(),
          `${meta.noun.toLowerCase()} ${name.toLowerCase()}`,
          'kisan app',
          'smart farming India',
          name.toLowerCase(),
          ...crops.map((c) => `${c.toLowerCase()} price`),
        ]}
        ogType="website"
        ogImage={ogImage()}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-background pb-20">
        <header className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white">
          <div className="responsive-container py-14 md:py-20">
            <nav aria-label="Breadcrumb" className="text-sm text-emerald-100/70 mb-4">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li><Link to="/" className="hover:underline">Home</Link></li>
                <li aria-hidden="true">›</li>
                <li><Link to={`/${landingType}`} className="hover:underline">{meta.noun}</Link></li>
                <li aria-hidden="true">›</li>
                <li className="text-emerald-50 font-medium">{name}</li>
              </ol>
            </nav>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-emerald-100/85 mt-4 text-lg max-w-3xl leading-relaxed">{description}</p>
            <div className="flex flex-wrap gap-2 mt-5">
              {crops.slice(0, 6).map((crop) => (
                <span key={crop} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-emerald-50">
                  {crop}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="responsive-container py-10">
          {/* Key stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10" aria-label={`${name} key highlights`}>
            {[
              { label: 'Live Updates', value: isCity ? 'Hourly' : 'Daily' },
              { label: 'Languages', value: '12' },
              { label: 'Coverage', value: isCity ? name : state },
              { label: 'Cost', value: 'Free' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-5 text-center shadow-card">
                <p className="text-xl font-black text-foreground">{s.value}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </section>

          {/* Main content */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card mb-10" aria-labelledby="content-heading">
            <h2 id="content-heading" className="text-2xl font-bold text-foreground mb-4">
              {meta.noun} in {name} — Everything You Need
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              AgriConnect brings {meta.noun.toLowerCase()} to every farmer in {name}. Whether you're
              a smallholder in {isCity ? `${state} state` : 'a rural block'} or a large commercial
              farmer, our platform gives you accurate, timely, and localized information in your
              mother tongue — {isCity ? `${state}'s regional language` : region}.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {[
                { icon: '📊', title: `Live ${meta.noun}`, desc: `Real-time ${meta.noun.toLowerCase()} data for ${name} updated daily.` },
                { icon: '🤖', title: 'AI Insights', desc: `Smart alerts and trend analysis for ${name} farmers.` },
                { icon: '🗣️', title: 'Local Language', desc: `Information in ${isCity ? `${state}'s language` : '12 Indian languages'}.` },
              ].map((f) => (
                <div key={f.title} className="rounded-xl bg-muted/40 p-4">
                  <span className="text-2xl" aria-hidden="true">{f.icon}</span>
                  <h3 className="font-bold text-foreground mt-2 text-sm">{f.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Popular crops / cities list */}
          {isCity ? (
            <section className="mb-10" aria-labelledby="other-cities-heading">
              <h2 id="other-cities-heading" className="text-2xl font-bold text-foreground mb-4">
                {meta.noun} in Other {state} Cities
              </h2>
              <div className="flex flex-wrap gap-2">
                {stateList.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/${landingType}/${c.slug}`}
                    className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition"
                  >
                    {meta.noun} {c.name}
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <section className="mb-10" aria-labelledby="all-states-heading">
              <h2 id="all-states-heading" className="text-2xl font-bold text-foreground mb-4">
                {meta.noun} in All Indian States
              </h2>
              <div className="flex flex-wrap gap-2">
                {allStates.map((s) => (
                  <Link
                    key={s.slug}
                    to={`/${landingType}/${s.slug}`}
                    className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="rounded-2xl gradient-hero text-primary-foreground p-8 text-center">
            <h2 className="text-2xl font-bold">
              Get Live {meta.noun} for {name} — Free
            </h2>
            <p className="text-primary-foreground/85 mt-2 max-w-2xl mx-auto">
              Open the AgriConnect app and get instant access to {meta.noun.toLowerCase()} for
              {name}, plus AI Crop Doctor, weather, and scheme alerts.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-5">
              <Link
                to="/"
                className="rounded-lg bg-white text-emerald-900 px-6 py-3 font-semibold hover:bg-emerald-50 transition"
              >
                Explore AgriConnect
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default StateLanding;

