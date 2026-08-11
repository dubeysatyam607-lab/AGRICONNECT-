import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing or using AgriConnect (the "Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.',
  },
  {
    title: '2. Description of Service',
    content:
      'AgriConnect provides agricultural information tools including live mandi prices, AI crop disease detection, weather forecasts, tractor rental booking, marketplace listings, government scheme alerts, and community features. We strive for accuracy but do not guarantee the completeness or timeliness of third-party data such as mandi prices or government scheme details.',
  },
  {
    title: '3. Eligibility',
    content:
      'The Service is available to individuals aged 18 and above, or minors with parental consent. You agree to provide accurate information during registration and keep your account credentials secure.',
  },
  {
    title: '4. Acceptable Use',
    content:
      'You agree not to misuse the Service, including: uploading false listings, posting offensive content, attempting to breach security, scraping data, or using the Service for unlawful purposes. We reserve the right to suspend accounts that violate these terms.',
  },
  {
    title: '5. Marketplace & Bookings',
    content:
      'Tractor rental, marketplace, cattle, and transport transactions are between users. AgriConnect is a platform that facilitates connections but is not a party to transactions. Please verify listings and transact safely. We are not liable for disputes between users.',
  },
  {
    title: '6. AI Advisory Disclaimer',
    content:
      'AI Crop Doctor and Kisan AI provide informational guidance only and do not constitute professional agricultural, veterinary, or legal advice. Always consult local agriculture officers or qualified experts for critical decisions.',
  },
  {
    title: '7. Intellectual Property',
    content:
      'All content, software, logos, and designs on AgriConnect are the property of AgriConnect Technologies Pvt. Ltd. and are protected by applicable intellectual property laws. You may not copy, modify, or redistribute without permission.',
  },
  {
    title: '8. Limitation of Liability',
    content:
      'To the maximum extent permitted by law, AgriConnect shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including crop losses or financial losses based on information obtained through the Service.',
  },
  {
    title: '9. Termination',
    content:
      'We may suspend or terminate access to the Service for violations of these terms. You may delete your account at any time from Settings.',
  },
  {
    title: '10. Governing Law',
    content:
      'These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of the courts of Pune, Maharashtra.',
  },
  {
    title: '11. Changes to Terms',
    content:
      'We may update these terms periodically. Continued use after updates constitutes acceptance. Material changes will be notified in-app.',
  },
];

const Terms: React.FC = () => {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Terms of Service — AgriConnect',
      url: canonical('/terms'),
      description: 'Terms of Service governing the use of the AgriConnect platform.',
      isPartOf: { '@id': `${canonical('/')}#website` },
    },
  ];

  return (
    <>
      <SeoHead
        title="Terms of Service — AgriConnect"
        description="Read the Terms of Service for using the AgriConnect smart farming platform, including marketplace rules, AI advisory disclaimers, and liability terms."
        canonical="/terms"
        keywords={['AgriConnect terms of service', 'agritech terms', 'farmer app terms', 'platform terms India']}
        ogType="website"
        ogImage={ogImage()}
        robots="index, follow"
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-background pb-20">
        <header className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white">
          <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
            <MarketingBreadcrumb
              tone="light"
              items={[{ label: 'Home', path: '/' }, { label: 'Terms of Service' }]}
            />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Terms of Service</h1>
            <p className="text-emerald-100/80 mt-2">Last updated: January 2026</p>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="space-y-6">
            {SECTIONS.map((s) => (
              <section key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="font-bold text-foreground text-lg">{s.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mt-2">{s.content}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl gradient-hero text-primary-foreground p-6 text-center">
            <h2 className="font-bold text-xl">Have questions about these terms?</h2>
            <p className="text-sm text-primary-foreground/80 mt-2">Contact our legal team.</p>
            <Link
              to="/contact"
              className="inline-block mt-4 rounded-lg bg-white text-emerald-900 px-5 py-2.5 font-semibold text-sm hover:bg-emerald-50 transition"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default Terms;

