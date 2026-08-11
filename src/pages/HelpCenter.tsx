import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import { breadcrumbSchema, faqSchema } from '@/lib/structured-data';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';
import { SUPPORT_WHATSAPP_URL } from '@/lib/support-config';
import {
  Rocket, IndianRupee, CloudSun, Bot, Landmark, ShieldCheck, Droplets,
  MessageCircle, Mail, Phone, ArrowRight,
} from 'lucide-react';

const HELP_TOPICS = [
  {
    title: 'Getting Started',
    desc: 'Registration, language settings, and setting up your farm profile.',
    icon: Rocket,
    link: { to: '/faq', label: 'Getting started FAQs' },
  },
  {
    title: 'Mandi Bhav & Selling',
    desc: 'Checking live prices, price alerts, and selling produce directly.',
    icon: IndianRupee,
    link: { to: '/mandi-prices/rajasthan', label: 'Mandi prices help' },
  },
  {
    title: 'Weather & Irrigation',
    desc: 'Hyperlocal forecasts, rain probability, and irrigation planning.',
    icon: CloudSun,
    link: { to: '/weather/jaipur', label: 'Weather help' },
  },
  {
    title: 'AI Tools & Crop Doctor',
    desc: 'Using Kisan AI and scanning crops for disease diagnosis.',
    icon: Bot,
    link: { to: '/features#ai-assistant', label: 'AI tools help' },
  },
  {
    title: 'Government Schemes',
    desc: 'PM-KISAN, KCC, PMFBY applications, eligibility, and status checks.',
    icon: Landmark,
    link: { to: '/schemes/rajasthan', label: 'Schemes help' },
  },
  {
    title: 'Account & Safety',
    desc: 'Data privacy, device changes, and keeping your account secure.',
    icon: ShieldCheck,
    link: { to: '/faq', label: 'Account FAQs' },
  },
  {
    title: 'IoT & Farm Security',
    desc: 'Setting up soil moisture sensors and digital laser fencing on your farm.',
    icon: Droplets,
    link: { to: '/faq', label: 'IoT & security FAQs' },
  },
];

const HELP_FAQS = [
  {
    q: 'How do I register on AgriConnect?',
    a: 'Open the app or website, tap Sign Up, enter your mobile number, and verify with OTP. Your profile takes less than 2 minutes to set up.',
  },
  {
    q: 'How do I check live mandi prices?',
    a: 'Open the Mandi section, choose your state and mandi, then search your crop to see today\'s minimum, maximum, and modal rates along with the 30-day trend.',
  },
  {
    q: 'How do I use the AI Crop Doctor?',
    a: 'Tap Crop Doctor, photograph the affected leaf 20-30 cm away in natural daylight, and get an instant diagnosis with confidence score and recommended treatments.',
  },
  {
    q: 'How do I get government scheme alerts?',
    a: 'Enable notifications in the app and choose your state. You\'ll be alerted about new instalments, application deadlines, and eligibility updates.',
  },
  {
    q: 'Is my data safe with AgriConnect?',
    a: 'Yes. Your data is encrypted in transit and at rest, we follow Indian data protection principles, and we never sell your data to third parties.',
  },
];

const HelpCenter: React.FC = () => {
  const jsonLd = [
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Help Center', path: '/help-center' },
    ]),
    faqSchema(HELP_FAQS),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'AgriConnect Help Center',
      url: canonical('/help-center'),
      description:
        'Get help with AgriConnect — account setup, mandi bhav, weather, AI crop doctor, government schemes, and support contacts.',
      mainEntity: { '@id': `${canonical('/')}#organization` },
    },
  ];

  return (
    <>
      <SeoHead
        title="Help Center — Support for Indian Farmers | AgriConnect"
        description="AgriConnect Help Center — guides for mandi bhav, weather, AI crop doctor, government schemes, account setup, and direct kisan support by phone, email, or WhatsApp."
        canonical="/help-center"
        keywords={['AgriConnect help', 'kisan support', 'help center farmer', 'mandi bhav help', 'app support India']}
        ogType="website"
        ogImage={ogImage()}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-background pb-20">
        {/* Hero */}
        <header className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white">
          <div className="mx-auto max-w-5xl px-4 py-14 md:py-20">
            <MarketingBreadcrumb
              tone="light"
              items={[{ label: 'Home', path: '/' }, { label: 'Help Center' }]}
            />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              How can we help?
            </h1>
            <p className="text-emerald-100/85 mt-4 max-w-3xl text-lg leading-relaxed">
              Find answers about mandi bhav, weather, AI tools, government schemes, and your
              account — or reach our kisan helpdesk directly.
            </p>
          </div>
        </header>

        {/* Topics */}
        <section className="mx-auto max-w-5xl px-4 py-12" aria-label="Help topics">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {HELP_TOPICS.map((t) => (
              <article key={t.title} className="rounded-2xl border border-border bg-card p-6 shadow-card flex flex-col">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl gradient-hero text-primary-foreground">
                  <t.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-foreground">{t.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
                <Link
                  to={t.link.to}
                  className="group inline-flex items-center gap-1.5 mt-auto pt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                >
                  {t.link.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="bg-muted/40 border-y border-border" aria-labelledby="contact-support-heading">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 id="contact-support-heading" className="text-2xl md:text-3xl font-bold text-foreground">
              Contact Support
            </h2>
            <p className="text-muted-foreground mt-2">
              Our kisan helpdesk responds within a few hours on working days (Mon–Sat, 9:00 AM – 7:00 PM IST).
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <a
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition-colors"
              >
                <MessageCircle className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-foreground">WhatsApp Helpdesk</h3>
                <p className="mt-1 text-sm text-muted-foreground">Chat with our kisan support team.</p>
              </a>
              <a
                href="mailto:support@agriconnect.in"
                className="rounded-2xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition-colors"
              >
                <Mail className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-foreground">Email Us</h3>
                <p className="mt-1 text-sm text-muted-foreground">support@agriconnect.in</p>
              </a>
              <a
                href="tel:+919876543210"
                className="rounded-2xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition-colors"
              >
                <Phone className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-foreground">Call the Helpdesk</h3>
                <p className="mt-1 text-sm text-muted-foreground">+91-9876543210</p>
              </a>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-4 py-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Prefer self-serve?</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Browse the full FAQ library or explore the Knowledge Hub for step-by-step guides.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link to="/faq" className="rounded-lg gradient-hero text-primary-foreground px-6 py-3 font-semibold shadow-md hover:brightness-110 transition">
              Read the FAQs
            </Link>
            <Link to="/knowledge-hub" className="rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground hover:bg-muted transition">
              Open Knowledge Hub
            </Link>
          </div>
        </section>
      </main>
    </>
  );
};

export default HelpCenter;
