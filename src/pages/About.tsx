import { Link } from 'react-router-dom';
import { Mail, Phone, Download, Users, Award, ShieldCheck, HeartHandshake } from 'lucide-react';
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
        'AgriConnect is on a mission to make AI work for every Indian farmer, in their language, for free. Built in India for India\'s 150 million farming families.',
      mainEntity: { '@id': `${canonical('/')}#organization` },
    },
  ];

  return (
    <>
      <SeoHead
        title="About Us : AgriConnect | Making AI Work for Every Indian Farmer"
        description="AgriConnect is on a mission to make AI work for every Indian farmer, in their language, for free. Built in India for India's 150 million farming families."
        canonical="/about"
        keywords={['about AgriConnect', 'AI farming India', 'digital agriculture ecosystem India', 'smart farming platform', 'agritech company India', 'Kisan AI']}
        ogType="website"
        ogImage={ogImage()}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-background pb-20">
        {/* Hero */}
        <header className="bg-card border-b border-border">
          <div className="responsive-container py-16 md:py-24">
            <MarketingBreadcrumb              items={[{ label: 'Home', path: '/' }, { label: 'About Us' }]}
            />
            <div className="flex items-center gap-3 mb-6">
              <Logo size={48} />
              <div>
                <h1 className="type-display leading-tight">
                  About AgriConnect
                </h1>
                <p className="type-body text-muted-foreground mt-2">
                  "Making AI work for every Indian farmer, in their language, for free"
                </p>
              </div>
            </div>
            <p className="max-w-3xl type-body text-muted-foreground leading-relaxed">
              Built in India for <strong>India's 150 million farming families</strong>. We connect
              farmers, service providers, buyers, and agricultural experts on a single intuitive
              platform, live mandi bhav, personalized AI advisory, machinery rental, hyperlocal
              weather, crop disease detection, and government scheme alerts in <strong>12 Indian languages</strong>.
            </p>

            <div className="mt-8 flex flex-wrap gap-4 items-center">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 type-small font-semibold hover:bg-primary/90 transition-colors"
              >
                Contact Team
              </Link>
              <a
                href="mailto:hello.agriconnect@gmail.com"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card text-foreground px-5 py-3 type-small font-semibold hover:bg-muted transition-colors"
              >
                <Mail size={16} /> hello.agriconnect@gmail.com
              </a>
            </div>
          </div>
        </header>

        {/* Mission Statement Banner */}
        <section className="responsive-container py-12" aria-labelledby="mission-heading">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 md:p-12 text-center">
            <span className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary text-primary-foreground mb-4">
              <Award size={24} />
            </span>
            <h2 id="mission-heading" className="type-h1 text-foreground max-w-2xl mx-auto leading-tight">
              Making AI work for every Indian farmer, in their language, for free.
            </h2>
            <p className="type-body text-muted-foreground leading-relaxed mt-4 max-w-3xl mx-auto">
              Indian farmers lose an estimated ₹3.5 lakh crore annually due to information gaps.
              AgriConnect provides free, instant, and stage-aware advisory directly in regional languages
              so no farmer is left behind.
            </p>
          </div>
        </section>

        {/* Team & Leadership */}
        <section className="bg-muted/30 border-y border-border py-12" aria-labelledby="team-heading">
          <div className="responsive-container">
            <h2 id="team-heading" className="type-h1 text-foreground mb-3 text-center">
              Our Leadership & Founders
            </h2>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-8">
              A dedicated team of technologists, agronomists, and grassroots innovators passionate about rural empowerment.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
              {[
                { name: 'Satyam Dubey', role: 'Founder & CEO / Product Lead', bio: 'Passionate technologist driving AI adoption across India\'s agricultural heartlands.' },
                { name: 'Core Agritech Team', role: 'AI & Agronomy Engineers', bio: 'Specializing in computer vision models for crop pest detection and multimodal Indic voice models.' },
                { name: 'Field Operations', role: 'Kisan Outreach & Network', bio: 'Working directly with FPOs, APMC mandis, and tractor owners across states.' },
              ].map((member) => (
                <div key={member.name} className="rounded-xl border border-border bg-card p-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl font-semibold mb-3">
                    <Users size={28} />
                  </div>
                  <h3 className="font-semibold text-foreground type-body">{member.name}</h3>
                  <p className="type-small font-semibold text-primary mt-0.5">{member.role}</p>
                  <p className="type-small text-muted-foreground mt-2 leading-relaxed">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="responsive-container py-12" aria-labelledby="journey-heading">
          <h2 id="journey-heading" className="type-h1 text-foreground mb-8 text-center">
            Company Timeline
          </h2>
          <div className="max-w-2xl mx-auto space-y-6">
            {[
              { year: '2026', title: 'Founded & Conceived', desc: 'AgriConnect established to build India\'s complete farmer-first digital super-app.' },
              { year: 'Aug 2026', title: 'v1 Official Launch', desc: 'Released AgriConnect v1 across 28 states in 12 languages with Live Mandi Bhav, AI Crop Doctor, Weather, and Tractor Market.' },
            ].map((item) => (
              <div key={item.year} className="flex gap-4 items-start rounded-xl border border-border bg-card p-5">
                <span className="shrink-0 rounded bg-primary text-primary-foreground px-3 py-1.5 type-small font-semibold h-fit">
                  {item.year}
                </span>
                <div>
                  <h3 className="type-h3 text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact & Support Section */}
        <section className="responsive-container py-8 text-center border-t border-border mt-6">
          <h2 className="type-h2 text-foreground mb-3">Get in Touch</h2>
          <p className="type-small text-muted-foreground max-w-xl mx-auto mb-6">
            Have questions, partnership inquiries, or press requests? Reach out directly.
          </p>
          <div className="flex flex-wrap justify-center gap-6 type-small font-semibold">
            <a href="mailto:hello.agriconnect@gmail.com" className="flex items-center gap-2 text-foreground hover:text-primary transition">
              <Mail size={18} className="text-primary" /> hello.agriconnect@gmail.com
            </a>
            <a href="tel:+917067820256" className="flex items-center gap-2 text-foreground hover:text-primary transition">
              <Phone size={18} className="text-primary" /> +91-7067820256
            </a>
          </div>
        </section>
      </main>
    </>
  );
};

export default About;

