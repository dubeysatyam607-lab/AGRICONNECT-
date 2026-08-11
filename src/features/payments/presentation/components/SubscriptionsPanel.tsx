import { useMemo, useState } from 'react';
import { BadgeCheck, Check, Crown, RotateCcw, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  cancelSubscription,
  fmtMoney,
  renewSubscription,
  setAutoRenew,
  subscribeToPlan,
} from '../../domain/paymentStore';
import type { PaymentMethod, PaymentTransaction } from '../../domain/paymentTypes';
import { MethodPicker } from './MethodPicker';
import { usePaymentStore } from '../hooks/usePaymentStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';

const STATUS_TONE: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Trial: 'bg-sky-100 text-sky-700',
  PastDue: 'bg-red-100 text-red-700',
  Expired: 'bg-zinc-100 text-zinc-600',
  Cancelled: 'bg-amber-100 text-amber-700',
};

const STATUS_LABEL: Record<string, string> = {
  Active: 'Active',
  Trial: 'Trial',
  PastDue: 'Payment failed',
  Expired: 'Expired',
  Cancelled: 'Cancelled',
};

export function SubscriptionsPanel({
  onToast,
  onOpenInvoice,
}: {
  onToast?: (message: string) => void;
  onOpenInvoice?: (txn: PaymentTransaction) => void;
}) {
  const { t } = useLanguage();
  const store = usePaymentStore();
  const [subscribePlan, setSubscribePlan] = useState<string | null>(null);
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [coupon, setCoupon] = useState('');
  const [busy, setBusy] = useState(false);
  const [failMsg, setFailMsg] = useState('');

  const active = store.subscriptions.find((s) => s.status === 'Active' || s.status === 'Trial' || s.status === 'PastDue');
  const plan = useMemo(() => (subscribePlan ? store.plans.find((p) => p.id === subscribePlan) : null), [subscribePlan, store.plans]);
  const price = plan ? (period === 'year' ? plan.priceYearly : plan.priceMonthly) : 0;

  const handleSubscribe = async () => {
    if (!subscribePlan) return;
    setBusy(true);
    setFailMsg('');
    try {
      const result = await subscribeToPlan({ planId: subscribePlan, period, method, couponCode: coupon || undefined });
      if (result.txn?.status === 'Failed') {
        setFailMsg(result.txn.failureReason ?? 'Payment failed');
      } else {
        onToast?.(`${result.subscription.planName} — ${result.wasFree ? t('pay.subActive') : t('pay.successTitle')}`);
        setSubscribePlan(null);
        setCoupon('');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRenewNow = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const result = await renewSubscription(active.id);
      if (result?.txn.status === 'Success') onToast?.(t('pay.renewed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current subscription */}
      {active && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-sm font-black text-foreground">{active.planName}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-extrabold', STATUS_TONE[active.status])}>
                  {STATUS_LABEL[active.status] ?? active.status}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {fmtMoney(active.price)}/{active.period === 'year' ? t('pay.perYear') : t('pay.perMonth')}
                {' • '}{active.status === 'PastDue' ? t('pay.renewsAt') : t('pay.nextBilling')}: {new Date(active.renewAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {active.status === 'PastDue' ? (
              <Button className="w-full gap-1.5" onClick={handleRenewNow} disabled={busy}>
                {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <RotateCcw size={14} />}
                {t('pay.retryRecovery')}
              </Button>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-extrabold text-foreground">{t('pay.autoRenew')}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      {active.autoRenew ? t('pay.autoRenewOn') : t('pay.autoRenewOff')}
                    </p>
                  </div>
                  <Switch checked={active.autoRenew} onCheckedChange={(v) => setAutoRenew(active.id, v)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => cancelSubscription(active.id)} disabled={active.cancelAtPeriodEnd}>
                    {active.cancelAtPeriodEnd ? t('pay.cancelScheduled') : t('pay.cancelSub')}
                  </Button>
                  <Button className="flex-1" onClick={handleRenewNow} disabled={busy}>
                    {t('pay.renewNow')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid gap-3 sm:grid-cols-3">
        {store.plans.map((p) => {
          const isCurrent = active?.planId === p.id && (active.status === 'Active' || active.status === 'Trial');
          const Icon = p.popular ? Sparkles : p.priceMonthly === 0 ? BadgeCheck : Check;
          return (
            <button
              key={p.id}
              onClick={() => setSubscribePlan(p.id)}
              className={cn(
                'relative rounded-3xl border-2 bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5',
                subscribePlan === p.id ? 'border-primary shadow-glow' : p.popular ? 'border-primary/50' : 'border-border',
              )}
            >
              {p.popular && (
                <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-primary-foreground">
                  {t('pay.popular')}
                </span>
              )}
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', p.popular ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                <Icon size={16} />
              </span>
              <p className="mt-2.5 text-sm font-black text-foreground">{p.name}</p>
              <p className="mt-0.5 text-[10px] font-semibold leading-tight text-muted-foreground">{p.tagline}</p>
              <p className="mt-2 text-lg font-black text-foreground">
                {p.priceMonthly === 0 ? t('pay.free') : fmtMoney(p.priceMonthly)}
                {p.priceMonthly > 0 && <span className="text-[10px] font-bold text-muted-foreground">/{t('pay.perMonth')}</span>}
              </p>
              {isCurrent && <p className="mt-1 text-[10px] font-black text-emerald-600">✓ {t('pay.currentPlan')}</p>}
            </button>
          );
        })}
      </div>

      {/* Subscribe dialog */}
      <Dialog open={!!subscribePlan} onOpenChange={(v) => { setSubscribePlan(v ? subscribePlan : null); setFailMsg(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{t('pay.subscribeTo')} {plan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-2">
              {(['month', 'year'] as const).map((pr) => (
                <button
                  key={pr}
                  onClick={() => setPeriod(pr)}
                  className={cn(
                    'rounded-2xl border-2 p-3 text-left transition-all',
                    period === pr ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                  )}
                >
                  <p className="text-xs font-black text-foreground">{t(pr === 'month' ? 'pay.monthly' : 'pay.yearly')}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {pr === 'year' && plan && plan.priceYearly > 0 ? (
                      <span className="text-emerald-600">{interpolate(t('pay.savePercent'), { percent: plan.priceYearly > 0 ? Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100) : 0 })}</span>
                    ) : (
                      plan ? fmtMoney(pr === 'year' ? plan.priceYearly : plan.priceMonthly) : ''
                    )}
                  </p>
                </button>
              ))}
            </div>
            <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder={t('pay.couponPh')} className="text-xs font-bold uppercase" />
            <MethodPicker value={method} onChange={setMethod} walletBalance={store.wallet.balance} />
            {failMsg && <p className="text-[11px] font-bold text-red-600">{failMsg}</p>}
            <Button className="w-full" onClick={handleSubscribe} disabled={busy}>
              {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : `${t('pay.subscribe')} · ${fmtMoney(price)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
