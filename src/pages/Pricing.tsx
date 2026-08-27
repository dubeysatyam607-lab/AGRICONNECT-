import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Sparkles, Sprout, ArrowRight, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';
import { canonical, ogImage } from '@/lib/seo-config';
import MarketingBreadcrumb from '@/shared/layouts/MarketingBreadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackFfEvent } from '@/features/payments/domain/ffAnalytics';

const FUNC_URL =
  ((import.meta.env.VITE_SUPABASE_URL || "https://yrebxnpilkfeaofykvhq.supabase.co") as string).replace(/\/$/, '') +
  '/functions/v1/founding-farmer';

interface FFConfig {
  is_active: boolean;
  max_slots: number;
  slots_taken: number;
  remaining_slots: number;
  offer_start: string;
  offer_end: string;
  plus_price: number;
  pro_price: number;
  offer_valid: boolean;
}

const NORMAL_PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Essential tools for every farmer',
    monthlyPrice: 0,
    annualPrice: 0,
    period: 'forever',
    highlight: false,
    popular: false,
    features: [
      'Live mandi prices & market trends',
      '10 Kisan AI questions / month',
      'Hyperlocal weather & spray window alerts',
      'Government scheme finder & alerts',
      'Crop disease photo scanner (5/month)',
      'Community Q&A & farmer network',
      'Standard non-intrusive ads',
    ],
    cta: 'Start Free',
    ctaLink: '/',
  },
  {
    id: 'plus',
    name: 'Plus',
    tagline: 'For progressive farmers',
    monthlyPrice: 49,
    annualPrice: 490,
    period: '/month',
    highlight: false,
    popular: false,
    features: [
      'Everything in Free',
      'Unlimited Kisan AI assistant',
      'Unlimited crop disease scanning',
      'Real-time mandi price SMS & Push alerts',
      'Priority customer support',
      'Reduced advertisements',
      'Farm ledger & digital records',
    ],
    cta: 'Choose Plus',
    ctaLink: '/auth/login?redirect=/pricing',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Complete digital farming suite',
    monthlyPrice: 99,
    annualPrice: 990,
    period: '/month',
    highlight: true,
    popular: true,
    features: [
      'Everything in Plus',
      '100% Ad-free experience',
      'Advanced yield & harvest forecasting',
      'Priority AI compute & response speed',
      'Marketplace seller verified badge',
      'Marketplace search ranking boost',
      'Exportable GST farm accounts & reports',
      '24/7 dedicated agronomy helpline',
    ],
    cta: 'Upgrade to Pro',
    ctaLink: '/auth/login?redirect=/pricing',
  },
];

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const Pricing: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [ffConfig, setFfConfig] = useState<FFConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [userFfStatus, setUserFfStatus] = useState<{ isFF: boolean; number?: number; plan?: string } | null>(null);
  const [purchasingPlan, setPurchasingPlan] = useState<'plus' | 'pro' | null>(null);

  const { user } = useOptionalAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load Founding Farmer Eligibility & Live Slot Count
  useEffect(() => {
    let active = true;
    const fetchConfig = async () => {
      try {
        const res = await fetch(FUNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check-eligibility' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (active && data?.config) {
            setFfConfig(data.config);
            trackFfEvent('ff_offer_viewed', { remaining: data.config.remaining_slots });
          }
        }
      } catch (err) {
        console.warn('Could not load Founding Farmer config:', err);
      } finally {
        if (active) setLoadingConfig(false);
      }
    };

    fetchConfig();
    return () => { active = false; };
  }, []);

  // Check if current user is already a Founding Farmer
  useEffect(() => {
    let active = true;
    if (!user) {
      setUserFfStatus(null);
      return;
    }

    const checkUserFF = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('founding_farmer, founding_farmer_number')
          .eq('id', user.id)
          .maybeSingle();

        if (active && data?.founding_farmer) {
          setUserFfStatus({
            isFF: true,
            number: data.founding_farmer_number || undefined,
          });
        }
      } catch {
        // Non-blocking
      }
    };

    checkUserFF();
    return () => { active = false; };
  }, [user]);

  // Load Razorpay Script lazily
  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle Founding Farmer Purchase with Server-side verification
  const handlePurchaseFF = async (plan: 'plus' | 'pro') => {
    if (!user) {
      navigate('/auth/login?redirect=/pricing');
      return;
    }

    if (userFfStatus?.isFF) {
      toast({
        title: 'Already a Founding Farmer!',
        description: `You are already verified as Founding Farmer #${userFfStatus.number || ''}.`,
      });
      return;
    }

    try {
      setPurchasingPlan(plan);
      trackFfEvent('ff_plan_selected', { plan });

      const loaded = await loadRazorpay();
      if (!loaded) {
        toast({
          title: 'Payment Gateway Error',
          description: 'Could not load payment checkout. Please check your internet connection.',
          variant: 'destructive',
        });
        setPurchasingPlan(null);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        navigate('/auth/login?redirect=/pricing');
        return;
      }

      // 1. Create order on server (price is computed server-side, never trusted from client)
      const createRes = await fetch(FUNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'create-subscription', plan }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData?.orderId) {
        toast({
          title: 'Slot Claim Failed',
          description: createData?.error || 'Could not claim Founding Farmer slot. It may have expired or been filled.',
          variant: 'destructive',
        });
        setPurchasingPlan(null);
        return;
      }

      trackFfEvent('ff_payment_initiated', { plan, orderId: createData.orderId });

      // 2. Open Razorpay Checkout
      const options = {
        key: createData.key || 'rzp_test_placeholder',
        amount: createData.amount * 100,
        currency: 'INR',
        name: 'AgriConnect',
        description: `Founding Farmer ${plan === 'pro' ? 'Pro' : 'Plus'} Subscription`,
        order_id: createData.orderId,
        notes: { purpose: 'founding_farmer', plan },
        prefill: {
          name: user.user_metadata?.full_name || '',
          email: user.email || '',
        },
        theme: { color: '#059669' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // 3. Verify payment strictly server-side
            const verifyRes = await fetch(FUNC_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                action: 'verify-payment',
                plan,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                founding_farmer_number: createData.foundingFarmerNumber,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.ok) {
              trackFfEvent('ff_payment_success', { plan, number: createData.foundingFarmerNumber });
              setUserFfStatus({ isFF: true, number: createData.foundingFarmerNumber, plan });
              toast({
                title: '🎉 Welcome, Founding Farmer!',
                description: `You are officially Founding Farmer #${createData.foundingFarmerNumber}. Your ${plan.toUpperCase()} plan & badge are active!`,
              });
            } else {
              trackFfEvent('ff_payment_failed', { plan, error: verifyData.error });
              toast({
                title: 'Activation Failed',
                description: verifyData.error || 'Payment was received but server activation encountered an issue.',
                variant: 'destructive',
              });
            }
          } catch (err: any) {
            toast({
              title: 'Verification Error',
              description: err?.message || 'Could not verify payment.',
              variant: 'destructive',
            });
          } finally {
            setPurchasingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            setPurchasingPlan(null);
            trackFfEvent('ff_payment_cancelled', { plan });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error('Founding Farmer purchase flow error:', err);
      toast({
        title: 'Error',
        description: err?.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
      setPurchasingPlan(null);
    }
  };

  const isOfferAvailable =
    !loadingConfig &&
    ffConfig?.is_active &&
    ffConfig?.offer_valid &&
    ffConfig?.remaining_slots > 0;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'OfferCatalog',
      name: 'AgriConnect Plans & Founding Farmer Program',
      url: canonical('/pricing'),
      itemListElement: NORMAL_PLANS.map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Offer',
          name: p.name,
          price: String(p.monthlyPrice),
          priceCurrency: 'INR',
          description: p.features.join('. '),
          url: canonical('/pricing'),
          availability: 'https://schema.org/InStock',
          eligibleRegion: { '@type': 'Country', name: 'IN' },
        },
      })),
    },
  ];

  return (
    <>
      <SeoHead
        title="Pricing & Founding Farmer Program | AgriConnect"
        description="AgriConnect is free for all farmers. Join our limited Founding Farmer early-access offer: Plus for ₹29/mo or Pro for ₹59/mo."
        canonical="/pricing"
        keywords={['AgriConnect pricing', 'founding farmer', 'free farming app', 'kisan app cost', 'farm management app price', 'agritech pricing India']}
        ogType="website"
        ogImage={ogImage()}
        jsonLd={jsonLd}
      />

      <main className="min-h-screen bg-background pb-20">
        {/* Header Hero */}
        <header className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white">
          <div className="mx-auto max-w-5xl px-4 py-12 md:py-16 text-center">
            <MarketingBreadcrumb
              tone="light"
              items={[{ label: 'Home', path: '/' }, { label: 'Pricing' }]}
              className="justify-center"
            />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2">
              Simple, Farmer-Friendly Pricing
            </h1>
            <p className="text-emerald-100/90 mt-3 max-w-2xl mx-auto text-base md:text-lg">
              Start free forever. Upgrade only when your farm needs more power. No hidden charges — ever.
            </p>

            {/* If user is already a Founding Farmer */}
            {userFfStatus?.isFF && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-4 py-2 text-emerald-200 text-sm font-bold shadow-sm">
                <Sprout className="w-5 h-5 text-emerald-300 animate-pulse" />
                <span>You are verified as <strong>Founding Farmer #{userFfStatus.number}</strong>! Lifetime early badge active.</span>
              </div>
            )}
          </div>
        </header>

        {/* ── SECTION 1: FOUNDING FARMER SPECIAL OFFER BANNER & CARDS ── */}
        {isOfferAvailable && !userFfStatus?.isFF && (
          <section className="mx-auto max-w-5xl px-4 -mt-8 relative z-20 mb-12">
            <div className="rounded-3xl border-2 border-emerald-500/60 bg-card shadow-2xl p-6 md:p-8 relative overflow-hidden bg-gradient-to-b from-emerald-50/50 dark:from-emerald-950/20 to-card">
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md">
                    <Sprout className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-full mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Limited Early Access Offer
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                      🌱 Become a Founding Farmer
                    </h2>
                  </div>
                </div>

                {/* Real-time remaining slots counter */}
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-muted-foreground">Limited Availability</span>
                  <div className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-3 py-1 rounded-full mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Only {ffConfig?.remaining_slots} of {ffConfig?.max_slots} Founding Farmer memberships available
                  </div>
                </div>
              </div>

              {/* Tagline */}
              <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed max-w-3xl">
                AgriConnect has just launched — join the first generation of farmers building the future of digital agriculture. Get exclusive early-bird pricing before the offer ends.
              </p>

              {/* Two Founding Farmer Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Founding Farmer Plus */}
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-background p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Early Access Plus
                        </span>
                        <h3 className="text-xl font-black text-foreground mt-0.5">Founding Farmer Plus</h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                        Save 41%
                      </span>
                    </div>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-4xl font-black text-foreground">₹{ffConfig?.plus_price ?? 29}</span>
                      <span className="text-sm font-medium text-muted-foreground">/month</span>
                      <span className="text-base text-muted-foreground line-through ml-1">₹49/month</span>
                    </div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      Founding Farmer Price • Locked-in introductory rate
                    </p>

                    <ul className="mt-6 space-y-2.5">
                      {[
                        'Unlimited Kisan AI assistant & crop diagnosis',
                        'Real-time mandi price SMS & WhatsApp alerts',
                        'Priority 1-on-1 support from agronomists',
                        'Reduced advertisements on all devices',
                        'Official 🌱 FOUNDING FARMER badge on profile',
                      ].map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handlePurchaseFF('plus')}
                    disabled={purchasingPlan !== null}
                    className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 text-sm shadow-md transition disabled:opacity-50"
                  >
                    {purchasingPlan === 'plus' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Activating Founding Farmer...
                      </>
                    ) : (
                      <>
                        Become a Founding Farmer (Plus)
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Founding Farmer Pro */}
                <div className="rounded-2xl border-2 border-emerald-500 bg-background p-6 shadow-md hover:shadow-lg transition-all relative flex flex-col justify-between">
                  <div className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </div>
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Early Access Pro
                        </span>
                        <h3 className="text-xl font-black text-foreground mt-0.5">Founding Farmer Pro</h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                        Save 40%
                      </span>
                    </div>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-4xl font-black text-foreground">₹{ffConfig?.pro_price ?? 59}</span>
                      <span className="text-sm font-medium text-muted-foreground">/month</span>
                      <span className="text-base text-muted-foreground line-through ml-1">₹99/month</span>
                    </div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      Founding Farmer Price • Locked-in introductory rate
                    </p>

                    <ul className="mt-6 space-y-2.5">
                      {[
                        'Everything in Founding Farmer Plus',
                        '100% Ad-Free Experience',
                        'Advanced Yield Forecasting & Harvest Analytics',
                        'Marketplace Priority Search Boost for your crops/tools',
                        '🌱 FOUNDING FARMER verified badge on all listings',
                        '24/7 dedicated agronomy phone helpline',
                      ].map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs md:text-sm text-foreground">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="font-medium">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handlePurchaseFF('pro')}
                    disabled={purchasingPlan !== null}
                    className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white font-bold py-3 text-sm shadow-md transition disabled:opacity-50"
                  >
                    {purchasingPlan === 'pro' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Activating Founding Farmer...
                      </>
                    ) : (
                      <>
                        Become a Founding Farmer (Pro)
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── SECTION 2: NORMAL STANDARD PLANS ── */}
        <section className="mx-auto max-w-5xl px-4 mt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Standard Subscription Plans
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Transparent, fair pricing for Indian agriculture. No lock-in, cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {NORMAL_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={
                  plan.highlight
                    ? 'rounded-2xl border-2 border-emerald-600 bg-card p-6 shadow-md relative flex flex-col justify-between'
                    : 'rounded-2xl border border-border bg-card p-6 shadow-sm relative flex flex-col justify-between'
                }
              >
                <div>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 text-white px-3.5 py-0.5 text-xs font-black flex items-center gap-1 shadow-sm">
                      <Sparkles size={12} /> Standard Pro
                    </span>
                  )}
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{plan.tagline}</p>
                  <h3 className="mt-1 text-xl font-black text-foreground">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground">₹{plan.monthlyPrice}</span>
                    <span className="text-sm font-semibold text-muted-foreground">{plan.period}</span>
                  </div>

                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to={user ? (plan.id === 'free' ? '/' : '/payments') : plan.ctaLink}
                  className={
                    plan.highlight
                      ? 'mt-6 block text-center rounded-xl bg-emerald-600 text-white px-4 py-3 font-bold hover:bg-emerald-700 transition shadow-sm'
                      : 'mt-6 block text-center rounded-xl border border-border bg-background px-4 py-3 font-bold text-foreground hover:bg-muted transition'
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Guarantee & Trust Footer */}
        <section className="mx-auto max-w-3xl px-4 mt-16 text-center">
          <div className="rounded-2xl border border-border bg-muted/40 p-6 md:p-8">
            <div className="flex justify-center mb-3 text-emerald-600">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-foreground">100% Free Core Tools for All Farmers</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xl mx-auto">
              Live Mandi Bhav, crop disease scanner, weather warnings, and government schemes are free forever.
              Paid plans are designed to provide advanced computing power, priority agronomist advisory, and commercial marketplace benefits.
            </p>
          </div>
        </section>
      </main>
    </>
  );
};

export default Pricing;
