import { useMemo, useState } from 'react';
import { BadgePercent, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { computeAmounts, fmtMoney, validateCoupon } from '../../domain/paymentStore';
import type { PaymentMethod, PaymentPurpose } from '../../domain/paymentTypes';
import { useLanguage } from '@/contexts/LanguageContext';

interface AmountSummaryProps {
  purpose: PaymentPurpose;
  subtotal: number;
  method: PaymentMethod;
  gstRate?: number;
  couponCode?: string;
  onCouponChange: (code: string) => void;
  onToast?: (message: string) => void;
  compact?: boolean;
}

export function AmountSummary({ purpose, subtotal, method, gstRate, couponCode, onCouponChange, onToast, compact }: AmountSummaryProps) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const [applied, setApplied] = useState<string | null>(null);

  const amounts = useMemo(
    () => computeAmounts({ subtotal, purpose, couponCode: applied ?? undefined, gstRate, method }),
    [subtotal, purpose, applied, gstRate, method],
  );

  const check = useMemo(
    () => (applied ? validateCoupon(applied, purpose, subtotal) : null),
    [applied, purpose, subtotal],
  );

  const handleApply = () => {
    const result = validateCoupon(draft, purpose, subtotal);
    if (!result.ok) {
      onToast?.(result.reason ?? 'Invalid coupon');
      setApplied(null);
      return;
    }
    setApplied(draft.trim().toUpperCase());
    onCouponChange(draft.trim().toUpperCase());
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-extrabold text-foreground">{t('pay.summary')}</span>
          <span className="text-[11px] font-bold text-muted-foreground">{t('pay.secure')}</span>
        </div>
      )}

      <div className="space-y-1.5 text-[13px] font-semibold text-muted-foreground">
        <div className="flex justify-between">
          <span>{t('pay.subtotal')}</span>
          <span className="text-foreground">{fmtMoney(subtotal)}</span>
        </div>
        {amounts.discount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>{t('pay.discount')}{applied ? ` (${applied})` : ''}</span>
            <span>−{fmtMoney(amounts.discount)}</span>
          </div>
        )}
        {amounts.gstAmount > 0 && (
          <div className="flex justify-between">
            <span>{t('pay.gst')} @ {amounts.gstRate}%</span>
            <span className="text-foreground">{fmtMoney(amounts.gstAmount)}</span>
          </div>
        )}
        {amounts.fee > 0 && (
          <div className="flex justify-between">
            <span>{t('pay.gatewayFee')}</span>
            <span className="text-foreground">{fmtMoney(amounts.fee)}</span>
          </div>
        )}
      </div>

      <div className="my-3 h-px bg-border" />

      <div className="flex items-center justify-between text-sm">
        <span className="font-extrabold text-foreground">{t('pay.total')}</span>
        <span className="text-lg font-black text-foreground">{fmtMoney(amounts.total)}</span>
      </div>

      <div className="mt-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <BadgePercent className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value.toUpperCase())}
              placeholder={t('pay.couponPh')}
              className="pl-8 text-xs font-bold uppercase tracking-wide"
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            />
          </div>
          <Button
            size="sm"
            variant={applied ? 'outline' : 'default'}
            className="h-9"
            onClick={applied ? () => { setApplied(null); setDraft(''); onCouponChange(''); } : handleApply}
          >
            {applied ? <X size={13} /> : <Check size={13} />}
            {applied ? t('pay.remove') : t('pay.apply')}
          </Button>
        </div>
        {check && !check.ok && (
          <p className="mt-1.5 text-[11px] font-bold text-red-600">{check.reason}</p>
        )}
        {check?.ok && (
          <p className="mt-1.5 text-[11px] font-bold text-emerald-600">
            {t('pay.saved')} {fmtMoney(check.discount ?? 0)}
          </p>
        )}
        {couponCode && couponCode !== applied && (
          <div className={cn('mt-1.5 text-[11px] font-bold', applied ? 'text-emerald-600' : 'text-muted-foreground')}>
            {t('pay.couponApplied')}
          </div>
        )}
      </div>
    </div>
  );
}
