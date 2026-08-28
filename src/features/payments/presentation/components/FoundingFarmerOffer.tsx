import { useEffect, useState } from 'react';
import { Sprout, Check, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { supabase } from '@/integrations/supabase/client';
import { trackFfEvent } from '../../domain/ffAnalytics';

import { ManualUpiPaymentDialog } from './ManualUpiPaymentDialog';
import type { ManualPlan } from '../../domain/manualUpi';

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

interface Props {
  /** Current user's subscription plan ID (e.g. 'plan-free') or null */
  currentPlanId?: string | null;
  /** Whether user already has a founding farmer subscription */
  isFoundingFarmer?: boolean;
  onToast?: (msg: string) => void;
  onSubscriptionActivated?: () => void;
}

const FF_STRINGS: Record<string, [string, string]> = {
  bannerTitle: ['Become a Founding Farmer', 'फाउंडिंग फार्मर बनें'],
  bannerDesc: [
    'AgriConnect has just launched — join the first generation of farmers building the future of digital agriculture.',
    'AgriConnect अभी लॉन्च हुआ है — डिजिटल कृषि का भविष्य बनाने वाले किसानों की पहली पीढ़ी से जुड़ें।',
  ],
  bannerCta: ['Get exclusive early-bird pricing before the offer ends.', 'ऑफ़र समाप्त होने से पहले विशेष प्रारंभिक मूल्य प्राप्त करें।'],
  slotsRemaining: ['Only {remaining} of {total} Founding Farmer memberships available', 'केवल {remaining} / {total} फाउंडिंग फार्मर सदस्यता शेष'],
  foundingPrice: ['Founding Farmer Price', 'फाउंडिंग फार्मर मूल्य'],
  limitedOffer: ['Limited Early Access Offer', 'सीमित प्रारंभिक एक्सेस ऑफ़र'],
  cta: ['Become a Founding Farmer', 'फाउंडिंग फार्मर बनें'],
  processing: ['Activating...', 'सक्रिय हो रहा है...'],
  success: ['Welcome to the Founding Farmer program!', 'फाउंडिंग फार्मर कार्यक्रम में आपका स्वागत है!'],
  failed: ['Payment failed. Please try again.', 'भुगतान असफल। कृपया पुनः प्रयास करें।'],
  alreadyMember: ["You're already a Founding Farmer!", 'आप पहले से फाउंडिंग फार्मर हैं!'],
  expired: ['This offer has ended', 'यह ऑफ़र समाप्त हो गया है'],
  soldOut: ['All Founding Farmer slots have been claimed', 'सभी फाउंडिंग फार्मर स्लॉट भर गए हैं'],
  plusLabel: ['Farmer Plus', 'फार्मर प्लस'],
  proLabel: ['Farmer Pro', 'फार्मर प्रो'],
  perMonth: ['/month', '/महीना'],
  normalPrice: ['Normal price', 'सामान्य मूल्य'],
  features: {
    plus: [
      ['Unlimited AI assistant', 'असीमित AI सहायक'],
      ['Crop Doctor unlimited', 'फसल डॉक्टर असीमित'],
      ['Price alerts', 'मूल्य अलर्ट'],
      ['Priority support', 'प्राथमिकता सहायता'],
      ['Reduced ads', 'कम विज्ञापन'],
    ],
    pro: [
      ['Everything in Plus', 'प्लस की सभी सुविधाएं'],
      ['AI crop advisor', 'AI फसल सलाहकार'],
      ['Yield forecasting', 'उपज पूर्वानुमान'],
      ['Advanced analytics', 'उन्नत विश्लेषण'],
      ['Ad-free experience', 'विज्ञापन-मुक्त अनुभव'],
    ],
  },
};

export function FoundingFarmerOffer({
  currentPlanId,
  isFoundingFarmer = false,
  onToast,
  onSubscriptionActivated,
}: Props) {
  const { language } = useLanguage();
  const hi = language === 'hi';
  const t = (k: string) => FF_STRINGS[k]?.[hi ? 1 : 0] ?? k;

  const [config, setConfig] = useState<FFConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(FUNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check-eligibility' }),
        });
        const data = await res.json();
        if (active && data.config) {
          setConfig(data.config);
          trackFfEvent('ff_offer_viewed', { remaining: data.config.remaining_slots });
        }
      } catch {
        // Silently fail — don't block the page
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  // Don't show if:
  // - Still loading
  // - Config not loaded
  // - User is already a founding farmer
  // - Offer is not valid
  // - User has a paid plan (only free users see this)
  if (loading || !config || isFoundingFarmer) return null;
  if (!config.offer_valid) return null;
  if (currentPlanId && currentPlanId !== 'plan-free' && currentPlanId !== 'free') return null;

  const [manualPlan, setManualPlan] = useState<ManualPlan | null>(null);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const handlePurchase = (plan: 'plus' | 'pro') => {
    trackFfEvent('ff_plan_selected', { plan });
    if (!config) return;
    setManualPlan({
      id: plan === 'plus' ? 'plan-plus' : 'plan-pro',
      name: `Founding Farmer ${plan === 'plus' ? 'Plus' : 'Pro'}`,
      description: `Official Founding Farmer lifetime badge + ${plan.toUpperCase()} benefits`,
      price: plan === 'plus' ? config.plus_price : config.pro_price,
      currency: 'INR',
      interval: 'month',
      is_active: true,
      features: null,
    });
  };

  return (
    <div className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5 p-5 sm:p-6 shadow-card">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <span className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Sprout size={20} />
        </span>
        <div>
          <h3 className="font-extrabold text-foreground text-base sm:text-lg flex items-center gap-2">
            {t('bannerTitle')}
          </h3>
          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
            {t('limitedOffer')}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        {t('bannerDesc')}
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        {t('bannerCta')}
      </p>

      {/* Slots indicator */}
      <div className="bg-card border border-border rounded-xl p-3 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-foreground">
            {interpolate(t('slotsRemaining'), {
              remaining: String(config.remaining_slots),
              total: String(config.max_slots),
            })}
          </span>
          <span className="text-[10px] font-bold text-primary">
            {config.max_slots > 0 ? `${Math.min(100, Math.round((config.slots_taken / config.max_slots) * 100))}% claimed` : 'Launching soon'}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${config.max_slots > 0 ? Math.min(100, (config.slots_taken / config.max_slots) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Plus */}
        <div className="relative rounded-2xl border-2 border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{t('plusLabel')}</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-extrabold text-primary">{'\u20B9'}{config.plus_price}</span>
            <span className="text-xs text-muted-foreground line-through">{'\u20B9'}49{t('perMonth')}</span>
          </div>
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-3">
            {t('foundingPrice')}
          </span>
          <ul className="space-y-1.5 mb-4">
            {FF_STRINGS.features.plus.map(([en, hiText], i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                <Check size={12} className="text-primary shrink-0" />
                {hi ? hiText : en}
              </li>
            ))}
          </ul>
          <Button
            className="w-full"
            variant="outline"
            disabled={!!purchasing}
            onClick={() => handlePurchase('plus')}
          >
            {purchasing === 'plus' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                {t('cta')} <ArrowRight size={14} />
              </>
            )}
          </Button>
        </div>

        {/* Pro */}
        <div className="relative rounded-2xl border-2 border-primary/50 bg-card p-4 shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-md">
          <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary-foreground">
            Best Value
          </span>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{t('proLabel')}</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-extrabold text-primary">{'\u20B9'}{config.pro_price}</span>
            <span className="text-xs text-muted-foreground line-through">{'\u20B9'}99{t('perMonth')}</span>
          </div>
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-3">
            {t('foundingPrice')}
          </span>
          <ul className="space-y-1.5 mb-4">
            {FF_STRINGS.features.pro.map(([en, hiText], i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                <Check size={12} className="text-primary shrink-0" />
                {hi ? hiText : en}
              </li>
            ))}
          </ul>
          <Button
            className="w-full"
            disabled={!!purchasing}
            onClick={() => handlePurchase('pro')}
          >
            {purchasing === 'pro' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                {t('cta')} <ArrowRight size={14} />
              </>
            )}
          </Button>
        </div>
      </div>

      {manualPlan && (
        <ManualUpiPaymentDialog
          open={!!manualPlan}
          onOpenChange={(v) => { if (!v) setManualPlan(null); }}
          plan={manualPlan}
          userId={userId}
          onToast={onToast}
          onSubmitted={() => {
            setManualPlan(null);
            onSubscriptionActivated?.();
          }}
        />
      )}
    </div>
  );
}
