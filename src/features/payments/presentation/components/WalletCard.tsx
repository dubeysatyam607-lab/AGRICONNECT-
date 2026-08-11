import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { addWalletMoney, fmtMoney, getUnreadNotificationCount } from '../../domain/paymentStore';
import type { PaymentMethod } from '../../domain/paymentTypes';
import { MethodPicker } from './MethodPicker';
import { useLanguage } from '@/contexts/LanguageContext';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

export function WalletCard({
  balance,
  onChanged,
  onToast,
}: {
  balance: number;
  onChanged?: () => void;
  onToast?: (message: string) => void;
}) {
  const { t } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [upiId, setUpiId] = useState('farmer.ravi@okhdfc');
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (amount < 1) return;
    setBusy(true);
    try {
      const txn = await addWalletMoney(amount, method, method === 'upi' ? upiId : undefined);
      if (txn.status === 'Success') {
        onToast?.(`${fmtMoney(amount)} ${t('pay.addedWallet')}`);
        setAdding(false);
        onChanged?.();
      } else {
        onToast?.(`${t('pay.failed')}: ${txn.failureReason ?? ''}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const unread = getUnreadNotificationCount();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-glow">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/5" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Wallet size={17} />
          </span>
          <span className="text-sm font-extrabold">{t('pay.wallet')}</span>
        </div>
        {unread > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-black text-emerald-800">
            {unread}
          </span>
        )}
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-bold text-emerald-100/90">{t('pay.balance')}</p>
        <p className="mt-0.5 text-3xl font-black tracking-tight">{fmtMoney(balance)}</p>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Button size="sm" className="bg-white text-emerald-800 hover:bg-emerald-50" onClick={() => setAdding(true)}>
          <Plus size={14} /> {t('pay.addMoney')}
        </Button>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{t('pay.addMoney')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={cn(
                    'rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold transition-all',
                    amount === a ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {fmtMoney(a)}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min={1}
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder={t('pay.enterAmount')}
              className="text-sm font-bold"
            />
            <MethodPicker value={method} onChange={setMethod} walletBalance={balance} />
            {method === 'upi' && (
              <Input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="you@okbank"
                className="text-xs font-semibold"
              />
            )}
            <Button className="w-full" disabled={busy || amount < 1} onClick={handleAdd}>
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                `${t('pay.pay')} ${fmtMoney(amount)}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function WalletTxList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-extrabold text-foreground">{t('pay.recentWallet')}</h3>
        <button onClick={onNavigate} className="text-[11px] font-bold text-primary">
          {t('pay.viewAll')}
        </button>
      </div>
    </div>
  );
}

export function WalletMovementIcon({ type }: { type: 'credit' | 'debit' }) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl',
        type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
      )}
    >
      {type === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
    </span>
  );
}
