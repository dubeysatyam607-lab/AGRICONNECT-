import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage, SITE_CONFIG } from '@/lib/seo-config';
import { organizationSchema } from '@/lib/structured-data';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Contact: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const { toast } = useToast();

  const jsonLd = [
    organizationSchema(),
    {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact AgriConnect',
      url: canonical('/contact'),
      description: 'Contact AgriConnect support for help with mandi bhav, crop doctor, tractor rental, or government schemes.',
      mainEntity: { '@id': `${canonical('/')}#organization` },
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        message: form.message.trim(),
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      console.error('[Contact] submission failed:', error);
      toast({ title: 'Message not sent', description: 'Please try again or contact us through WhatsApp.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Contact Us — AgriConnect | Kisan Support Helpline"
        description="Contact AgriConnect farmer support. Get help with mandi bhav prices, AI crop doctor, tractor rental, government schemes, or the AgriConnect app. Call, WhatsApp, or email our kisan helpline."
        canonical="/contact"
        keywords={['contact AgriConnect', 'kisan helpline', 'farmer support India', 'agriculture app support', 'AgriConnect help']}
        ogType="website"
        ogImage={ogImage()}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-background pb-20">
        <header className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white">
          <div className="responsive-container py-14 md:py-20">
            <MarketingBreadcrumb
              tone="light"
              items={[{ label: 'Home', path: '/' }, { label: 'Contact Us' }]}
            />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">Contact Us</h1>
            <p className="text-emerald-100/80 mt-3 max-w-2xl text-lg">
              Questions about mandi bhav, crop doctor, tractor rental, or government schemes?
              Our farmer support team is here to help — in your language.
            </p>
          </div>
        </header>

        <div className="responsive-container py-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact info */}
          <section aria-labelledby="reach-heading">
            <h2 id="reach-heading" className="text-xl font-bold text-foreground mb-4">
              Reach Us Directly
            </h2>
            <div className="space-y-4">
              {[
                { icon: '📞', title: 'Kisan Helpline', lines: ['Toll-free: 1800-XXX-XXXX', 'Mon–Sat, 8 AM – 8 PM IST'] },
                { icon: '💬', title: 'WhatsApp', lines: ['Chat with our helpdesk: +91 98765 43210'] },
                { icon: '✉️', title: 'Email', lines: ['support@agriconnect.in', 'partnerships@agriconnect.in'] },
                { icon: '🏢', title: 'Head Office', lines: [SITE_CONFIG.address.streetAddress, `${SITE_CONFIG.address.addressLocality}, ${SITE_CONFIG.address.addressRegion} ${SITE_CONFIG.address.postalCode}, India`] },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <span aria-hidden="true">{c.icon}</span> {c.title}
                  </h3>
                  {c.lines.map((line) => (
                    <p key={line} className="text-muted-foreground text-sm mt-1">{line}</p>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl gradient-hero text-primary-foreground p-6 shadow-card">
              <h3 className="font-bold text-lg">Prefer to explore first?</h3>
              <p className="text-sm text-primary-foreground/80 mt-1">
                Check our FAQ for quick answers to common farmer questions.
              </p>
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 mt-3 rounded-lg bg-white text-emerald-900 px-5 py-2.5 font-semibold text-sm hover:bg-emerald-50 transition"
              >
                Read the FAQ
              </Link>
            </div>
          </section>

          {/* Contact form */}
          <section aria-labelledby="form-heading">
            <h2 id="form-heading" className="text-xl font-bold text-foreground mb-4">
              Send a Message
            </h2>
            {submitted ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
                <span className="text-4xl" aria-hidden="true">✅</span>
                <h3 className="font-bold text-foreground mt-3 text-lg">Message Received!</h3>
                <p className="text-muted-foreground mt-2">
                  Thank you, {form.name || 'Kisan'}. Our team will get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 rounded-lg border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-1.5">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Ramesh Patel"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-foreground mb-1.5">Mobile Number</label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    pattern="[0-9+ -]{10,15}"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g., 98765 43210"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-1.5">Email (optional)</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-foreground mb-1.5">Your Message</label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="How can we help you?"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg gradient-hero text-primary-foreground px-6 py-3 font-semibold shadow-md hover:brightness-110 transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Submit Message'}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    </>
  );
};

export default Contact;
