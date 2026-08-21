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
        title="About Us — AgriConnect | Making AI Work for Every Indian Farmer"
        description="AgriConnect is on a mission to make AI work for every Indian farmer, in their language, for free. Built in India for India's 150 million farming families."
        canonical="/about"
        keywords={['about AgriConnect', 'AI farming India', 'digital agriculture ecosystem India', 'smart farming platform', 'agritech company India', 'Kisan AI']}
        ogType="website"
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
                <p className="text-emerald-100/90 mt-2 text-lg font-semibold">
                  "Making AI work for every Indian farmer, in their language, for free"
                </p>
              </div>
            </div>
            <p className="max-w-3xl text-emerald-50/90 text-lg leading-relaxed">
              Built in India for <strong>India's 150 million farming families</strong>. We connect
              farmers, service providers, buyers, and agricultural experts on a single intuitive
              platform — live mandi bhav, personalized AI advisory, machinery rental, hyperlocal
              weather, crop disease detection, and government scheme alerts in <strong>12 Indian languages</strong>.
            </p>

            <div className="mt-8 flex flex-wrap gap-4 items-center">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-white text-emerald-900 px-5 py-3 font-bold text-sm shadow-md hover:bg-emerald-50 transition"
              >
                Contact Team
              </Link>
              <a
                href="mailto:hello.agriconnect@gmail.com"
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 text-white px-5 py-3 font-bold text-sm hover:bg-white/25 transition"
              >
                <Mail size={16} /> hello.agriconnect@gmail.com
              </a>
            </div>
          </div>
        </header>

        {/* Mission Statement Banner */}
        <section className="responsive-container py-12" aria-labelledby="mission-heading">
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-8 md:p-12 text-center shadow-card">
            <span className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-600 text-white mb-4">
              <Award size={24} />
            </span>
            <h2 id="mission-heading" className="text-2xl md:text-4xl font-black text-foreground max-w-2xl mx-auto leading-tight">
              Making AI work for every Indian farmer, in their language, for free.
            </h2>
            <p className="text-muted-foreground leading-relaxed text-base md:text-lg mt-4 max-w-3xl mx-auto">
              Indian farmers lose an estimated ₹3.5 lakh crore annually due to information gaps.
              AgriConnect provides free, instant, and stage-aware advisory directly in regional languages
              so no farmer is left behind.
            </p>
          </div>
        </section>

        {/* Team & Leadership */}
        <section className="bg-muted/30 border-y border-border py-12" aria-labelledby="team-heading">
          <div className="responsive-container">
            <h2 id="team-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">
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
                <div key={member.name} className="rounded-2xl border border-border bg-card p-6 shadow-card text-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-600/10 text-emerald-600 flex items-center justify-center mx-auto text-xl font-black mb-3">
                    <Users size={28} />
                  </div>
                  <h3 className="font-bold text-foreground text-base">{member.name}</h3>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{member.role}</p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="responsive-container py-12" aria-labelledby="journey-heading">
          <h2 id="journey-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Company Timeline
          </h2>
          <div className="max-w-2xl mx-auto space-y-6">
            {[
              { year: '2026', title: 'Founded & Conceived', desc: 'AgriConnect established to build India\'s complete farmer-first digital super-app.' },
              { year: 'Aug 2026', title: 'v1 Official Launch', desc: 'Released AgriConnect v1 across 28 states in 12 languages with Live Mandi Bhav, AI Crop Doctor, Weather, and Tractor Market.' },
            ].map((item) => (
              <div key={item.year} className="flex gap-4 items-start rounded-2xl border border-border bg-card p-5 shadow-card">
                <span className="shrink-0 rounded-xl gradient-hero text-primary-foreground px-3 py-1.5 text-sm font-black h-fit">
                  {item.year}
                </span>
                <div>
                  <h3 className="font-bold text-foreground text-base">{item.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact & Support Section */}
        <section className="responsive-container py-8 text-center border-t border-border mt-6">
          <h2 className="text-2xl font-bold text-foreground mb-3">Get in Touch</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6 text-sm">
            Have questions, partnership inquiries, or press requests? Reach out directly.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold">
            <a href="mailto:hello.agriconnect@gmail.com" className="flex items-center gap-2 text-foreground hover:text-emerald-600 transition">
              <Mail size={18} className="text-emerald-600" /> hello.agriconnect@gmail.com
            </a>
            <a href="tel:+917067820256" className="flex items-center gap-2 text-foreground hover:text-emerald-600 transition">
              <Phone size={18} className="text-emerald-600" /> +91-7067820256
            </a>
          </div>
        </section>
      </main>
    </>
  );
};

export default About;

