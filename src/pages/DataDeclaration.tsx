import React from 'react';
import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical } from '@/lib/seo-config';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';
import { ShieldCheck, Database, FileText, Lock, UserCheck, Trash2, Mail, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const DECLARATION_SECTIONS = [
  {
    icon: Database,
    title: '1. What Data AgriConnect Collects',
    content:
      'We collect only the minimum information necessary to deliver high-quality agricultural services to you:\n• Personal & Contact: Full Name, verified Mobile Number, Email Address, and Preferred Language.\n• Farm & Agricultural Details: State, District, Village/Town, Farm Size (in Acres), Soil Type, Irrigation System, Primary and Secondary Crops Grown.\n• Visual & AI Queries: Photos of crop leaves uploaded for disease diagnosis and audio/text messages sent to Kisan AI.\n• Hyperlocal Context: Approximate geographical location or selected district to fetch live APMC Mandi prices and localized weather forecasts.',
  },
  {
    icon: Lock,
    title: '2. Purpose & How Your Data is Used',
    content:
      'Your information is used exclusively to empower your farming operations:\n• Delivering daily live Mandi Bhav and market arrival trends for your specific crops.\n• Generating precision AI disease diagnoses and organic/chemical crop remedy plans.\n• Providing 7-day hyperlocal weather advisories, rainfall alerts, and irrigation schedules.\n• Matching you with nearby farm machinery and tractor owners when you request equipment rental.\n• We NEVER sell, rent, or monetize your personal or farming data to third-party advertisers.',
  },
  {
    icon: ShieldCheck,
    title: '3. Where and How Your Data is Stored',
    content:
      'All user data is stored on enterprise-grade cloud databases with 256-bit encryption in transit (HTTPS/TLS 1.3) and AES-256 encryption at rest. Strict Row Level Security (RLS) policies ensure that only you have access to modify your personal farm records.',
  },
  {
    icon: UserCheck,
    title: '4. Third-Party Service Processors',
    content:
      'To provide continuous platform services, we partner with trusted, secure infrastructure providers under strict confidentiality agreements:\n• Supabase / PostgreSQL (Secure Identity & Database Hosting)\n• Google Cloud & Gemini AI (Crop Disease Analysis & Agricultural Natural Language Processing)\n• National Agriculture Market / Data.gov.in (Government Open Mandi Data Feeds)\n• SMS / Email Gateways (OTP Authentication & Transaction Notifications)',
  },
  {
    icon: Trash2,
    title: '5. Retention, Correction & Deletion Rights',
    content:
      'You maintain full ownership and control over your agricultural data:\n• Edit at any time: Update your personal, farm, and crop information directly from Profile → Edit Profile.\n• Right to Erasure / Deletion: Request full account and data deletion at any time via Settings → Privacy or by emailing privacy@agriconnect.in. All personal identifiers will be permanently removed within 30 days.\n• Right to Withdraw Consent: Toggle optional analytics and cookies anytime via Cookie Settings.',
  },
  {
    icon: Mail,
    title: '6. Grievance & Privacy Contact',
    content:
      'If you have any questions, concerns, or requests regarding your personal data or privacy rights, please reach out to our dedicated Grievance Officer:\n• Email: privacy@agriconnect.in / support@agriconnect.in\n• Office: AgriConnect Technologies Pvt. Ltd., Maharashtra, India\n• Response Time: Within 48 business hours.',
  },
];

export const DataDeclaration: React.FC = () => {
  const { t } = useLanguage();

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Data Declaration & Transparency — AgriConnect',
      url: canonical('/data-declaration'),
      description: 'Clear, transparent declaration of what data AgriConnect collects, why, how it is stored and farmer privacy rights.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground py-12 sm:py-16">
      <SeoHead
        title="Data Declaration & Transparency — AgriConnect"
        description="Comprehensive, farmer-friendly data declaration detailing what information AgriConnect collects, why, how it is secured, and your rights."
        canonical={canonical('/data-declaration')}
        jsonLd={jsonLd}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <MarketingBreadcrumb items={[{ label: 'Data Declaration', href: '/data-declaration' }]} />

        {/* Hero Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} /> Transparency & Privacy Pledge
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Data Declaration & Farmer Rights
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            At AgriConnect, trust is our foundation. Here is an honest, plain-language breakdown of what data we collect, why we need it, how it is secured, and how you retain total ownership.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
            <span>Effective Date: August 2026</span>
            <span>•</span>
            <span>Policy Version: v1.0</span>
            <span>•</span>
            <span>Governing Law: Republic of India</span>
          </div>
        </div>

        {/* Highlight Guarantee Box */}
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
          <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
            Our 3 Core Guarantees to Every Farmer
          </h2>
          <ul className="space-y-2 text-xs sm:text-sm text-foreground">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">1.</span>
              <span><strong>Zero Data Selling:</strong> We never sell your personal details, farm records, or harvest numbers to brokers or marketing companies.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">2.</span>
              <span><strong>Total Control:</strong> You can edit or permanently delete your farm profile anytime from account settings.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">3.</span>
              <span><strong>Direct Utility:</strong> Every piece of information collected directly improves your farm productivity, mandi profits, or crop health.</span>
            </li>
          </ul>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6">
          {DECLARATION_SECTIONS.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Icon size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">{sec.title}</h2>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pl-0 sm:pl-13">
                  {sec.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Navigation / Links */}
        <div className="pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-foreground underline">
              Terms & Conditions
            </Link>
            <Link to="/privacy-policy" className="hover:text-foreground underline">
              Privacy Policy
            </Link>
            <Link to="/contact" className="hover:text-foreground underline">
              Contact Us
            </Link>
          </div>
          <Link to="/dashboard" className="text-primary hover:underline font-bold">
            ← Return to AgriConnect Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DataDeclaration;
