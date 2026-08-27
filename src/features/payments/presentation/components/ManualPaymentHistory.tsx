import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle, ReceiptText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { fmtINR, type PaymentRequestRow, type DbSubscriptionRow } from '../../domain/manualUpi';

const S: Record<string, [string, string]> = {
  title: ['Payment history', 'भुगतान इतिहास'],
  none: ['No payments yet', 'अभी कोई भुगतान नहीं'],
  plan: ['Plan', 'प्लान'],
  amount: ['Amount', 'राशि'],
  utr: ['UTR', 'UTR'],
  submitted: ['Submitted', 'दिनांक'],
  note: ['Note', 'नोट'],
  pending: ['Pending', 'लंबित'],
  approved: ['Approved', 'स्वीकृत'],
  rejected: ['Rejected', 'अस्वीकृत'],
  cancelled: ['Cancelled', 'रद्द'],
  verified: ['Verified', 'सत्यापित'],
  noSubscription: ['No active subscription', 'कोई सक्रिय सदस्यता नहीं'],
  expires: ['Expires', 'समाप्ति'],
  status: ['Subscription', 'सदस्यता'],
  active: ['Active', 'सक्रिय'],
};

const STATUS_TONE = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  cancelled: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400',
};

export function ManualPaymentHistory({ userId }: { userId: string }) {
  const { language } = useLanguage();
  const hi = language === 'hi';
  const t = (k: string) => S[k]?.[hi ? 1 : 0] ?? k;

  const [payments, setPayments] = useState<PaymentRequestRow[]>([]);
  const [subscription, setSubscription] = useState<DbSubscriptionRow | null>(null);
  const [plans, setPlans] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!userId) return;
    const [req, sub, pl] = await Promise.all([
      supabase.from('payment_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('user_subscriptions').select('*').eq('user_id', userId).in('status', ['active', 'trial']).order('expires_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('subscription_plans').select('id, name'),
    ]);
    setPayments(req.data || []);
    if (sub.data) setSubscription(sub.data);
    setPlans(Object.fromEntries((pl.data || []).map((p) => [p.id, p.name])));
  }, [userId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('manual-payment-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <ReceiptText size={16} className="text-primary" />
        <h3 className="text-sm font-black text-foreground">{t('title')}</h3>
      </div>

      {subscription?.status === 'active' && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <div>
              <p className="text-xs font-black text-foreground">
                {t('active')} · {plans[subscription.plan_id] || subscription.plan_id}
              </p>
              {subscription.expires_at && (
                <p className="text-[10px] font-semibold text-muted-foreground">
                  {t('expires')}: {fmtDate(subscription.expires_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <p className="mt-4 text-xs font-semibold text-muted-foreground">{t('none')}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {payments.slice(0, 10).map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-muted/20 px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-black text-foreground">
                  {plans[p.plan_id] || p.plan_id}
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black', STATUS_TONE[p.status] || STATUS_TONE.pending)}>
                    {p.status === 'approved' ? <CheckCircle2 size={9} /> : p.status === 'rejected' ? <XCircle size={9} /> : <Clock3 size={9} />}
                    {p.status === 'pending' ? t('pending') : p.status === 'approved' ? t('approved') : p.status === 'rejected' ? t('rejected') : t('cancelled')}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">
                  {t('utr')}: {p.utr} · {fmtDate(p.created_at)}
                  {p.status === 'approved' && p.verified_at && ` · ${t('verified')} ${fmtDate(p.verified_at)}`}
                </p>
                {(p.admin_note || p.rejection_reason) && (
                  <p className="mt-0.5 truncate text-[10px] font-bold text-amber-600">{p.admin_note || p.rejection_reason}</p>
                )}
              </div>
              <span className="shrink-0 text-xs font-black text-foreground">{fmtINR(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}