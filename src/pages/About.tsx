import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import { organizationSchema } from '@/lib/structured-data';
import { Logo } from '@/components/ui/Logo';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';

const About: React.FC = () => {
  const jsonLd = [
    organizationSchema(),
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About AgriConnect',
      url: canonical('/about'),
      description:
        'AgriConnect is India\'s complete digital agriculture ecosystem — AI advisory, machinery rental, live mandi bhav, weather, IoT soil monitoring, laser fencing, and government schemes on one platform.',
      mainEntity: { '@id': `${canonical('/')}#organization` },
    },
  ];

  return (
    <>
      <SeoHead
        title="About Us — AgriConnect | India's Complete Digital Agriculture Ecosystem"
        description="AgriConnect is on a mission to digitize Indian agriculture and empower every farmer — especially small and marginal farmers — with affordable AI technology. Live mandi bhav, pay-per-acre AI advisory, machinery rental, IoT soil monitoring, laser fencing, and government schemes in 12 Indian languages."
        canonical="/about"
        keywords={['about AgriConnect', 'digital agriculture ecosystem India', 'smart farming platform', 'agritech company India', 'new-age farmer', 'IoT farming']}
        ogType="profile"
        ogImage={ogImage()}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-background pb-20">
        {/* Hero */}
        <header className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white">
          <div className="responsive-container py-16 md:py-24">
            <MarketingBreadcrumb
              tone="light"
              items={[{ label: 'Home', path: '/' }, { label: 'About Us' }]}
            />
            <div className="flex items-center gap-3 mb-6">
              <Logo size={48} />
              <div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  About AgriConnect
                </h1>
                <p className="text-emerald-100/80 mt-2 font-medium">
                  Creating the "new-age farmer" — India's complete digital agriculture ecosystem
                </p>
              </div>
            </div>
            <p className="max-w-3xl text-emerald-50/90 text-lg leading-relaxed">
              AgriConnect is an AI-powered digital agriculture ecosystem built to transform
              traditional farming into smart farming. We connect <strong>farmers, service
              providers, buyers, and agricultural experts</strong> on a single intelligent
              platform — live mandi bhav, personalized AI advisory, machinery rental, hyperlocal
              weather, crop disease detection, IoT soil monitoring, and government scheme alerts,
              available in <strong>12 Indian languages</strong>.
            </p>
          </div>
        </header>

        {/* Mission */}
        <section className="responsive-container py-12" aria-labelledby="mission-heading">
          <h2 id="mission-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Our Mission: Digitize Indian Agriculture
          </h2>
          <p className="text-muted-foreground leading-relaxed text-lg mb-6">
            Indian farmers lose an estimated <strong>₹3.5 lakh crore annually</strong> to lack of
            timely information — market prices, weather risk, crop diseases, and scheme awareness.
            AgriConnect exists to close that information gap with technology that is free, simple,
            and available in every farmer's native language. Our goal is not just another farming
            app — it is India's complete digital agriculture ecosystem that connects{" "}
            <strong>technology, services, machinery, data, and farmers</strong> on one platform,
            helping them reduce costs, increase productivity, improve profitability, and make
            smarter farming decisions every day.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[
              { icon: '🌾', title: 'Free for All', desc: 'Every core feature — mandi bhav, crop doctor, weather — is completely free for farmers.' },
              { icon: '📱', title: '12 Languages', desc: 'Hindi, Marathi, Punjabi, Tamil, Telugu and 7 more — technology in your mother tongue.' },
              { icon: '🤖', title: 'AI-Powered', desc: 'From disease scanning to price intelligence, AI works behind the scenes for you.' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <span className="text-3xl" aria-hidden="true">{f.icon}</span>
                <h3 className="font-bold text-foreground mt-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Digital Bridge */}
        <section className="bg-muted/40 border-y border-border" aria-labelledby="bridge-heading">
          <div className="responsive-container py-12">
            <h2 id="bridge-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              A Digital Bridge for Indian Agriculture
            </h2>
            <p className="text-muted-foreground max-w-3xl leading-relaxed">
              AgriConnect acts as a digital bridge connecting the four pillars of the agricultural
              economy — so every transaction, advisory, and service happens on one trusted platform.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-8">
              {[
                { icon: '👨‍🌾', title: 'Farmers', desc: 'Personalized AI advisory, live mandi bhav, affordable machinery rental, and fair market access.' },
                { icon: '🚜', title: 'Service Providers', desc: 'Equipment owners earn extra income by renting out idle tractors, harvesters, threshers, seed drills, and rotavators.' },
                { icon: '🤝', title: 'Buyers', desc: 'Direct access to fresh produce and verified sellers — cutting middlemen and improving farmer margins by 15-30%.' },
                { icon: '🧑‍🔬', title: 'Agri Experts', desc: 'AI plus real expertise — crop, soil, weather, and stage-aware guidance that helps farmers decide better, every day.' },
              ].map((p) => (
                <div key={p.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <span className="text-3xl" aria-hidden="true">{p.icon}</span>
                  <h3 className="font-bold text-foreground mt-3">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Journey */}
        <section className="responsive-container py-12" aria-labelledby="journey-heading">
          <h2 id="journey-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-8">
            Our Journey
          </h2>
          <div className="space-y-6">
            {[
              { year: '2024', title: 'The Idea', desc: 'Started after field visits to Shivpuri and Jaipur districts, where farmers struggled to get fair mandi prices and disease diagnosis.' },
              { year: '2025', title: 'The Platform', desc: 'Launched the AgriConnect app with mandi bhav, AI Crop Doctor, weather, and tractor rental — serving 10,000+ farmers in pilot districts.' },
              { year: '2026', title: 'The Ecosystem', desc: 'Expanded to 28 states with 12 Indian languages, pay-per-acre AI advisory, IoT soil monitoring, laser fencing, and a farmer-first marketplace. Now empowering farmers across India.' },
            ].map((item) => (
              <div key={item.year} className="flex gap-4">
                <span className="shrink-0 rounded-xl gradient-hero text-primary-foreground px-3 py-1.5 text-sm font-black h-fit">
                  {item.year}
                </span>
                <div>
                  <h3 className="font-bold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="responsive-container py-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Start Your Smart Farming Journey
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Check live mandi bhav, rent machinery, scan your crops with AI, and get government
            scheme alerts — free.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg gradient-hero text-primary-foreground px-6 py-3 font-semibold shadow-md hover:brightness-110 transition"
            >
              Explore the App
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground hover:bg-muted transition"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </main>
    </>
  );
};

export default About;
