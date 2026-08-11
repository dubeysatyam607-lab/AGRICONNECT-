import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Gift,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { walletRepository } from '../data/walletRepository';
import type { WalletSummary, WalletTransaction } from '../domain/walletTypes';

interface WalletSectionProps {
  onToast?: (message: string) => void;
  onNavigateToAuth?: () => void;
}

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

const TYPE_LABEL: Record<string, string> = {
  credit: 'Add Money',
  debit: 'Payment',
  refund: 'Refund',
  cashback: 'Cashback',
  reward: 'Reward',
  payment: 'Payment',
  withdrawal: 'Withdrawal',
  adjustment: 'Adjustment',
};

const TYPE_ICON: Record<string, typeof Wallet> = {
  credit: ArrowDownLeft,
  debit: ArrowUpRight,
  refund: ArrowDownLeft,
  cashback: Gift,
  reward: Gift,
  payment: ArrowUpRight,
  withdrawal: ArrowUpRight,
  adjustment: RefreshCw,
};

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description?: string;
      order_id?: string;
      prefill?: Record<string, string>;
      notes?: Record<string, string>;
      theme?: { color?: string };
      handler: (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
      modal?: { ondismiss?: () => void };
    }) => { open: () => void };
  }
}

export function WalletSection({ onToast, onNavigateToAuth }: WalletSectionProps) {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [recent, setRecent] = useState<WalletTransaction[]>([]);
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoadingState('loading');
    setError(null);
    try {
      const [w, tx] = await Promise.all([
        walletRepository.getSummary(),
        walletRepository.getTransactions(1, 6),
      ]);
      setSummary(w);
      setRecent(tx.rows);
      setLoadingState('idle');
    } catch (e: any) {
      setError(e.message ?? 'Unable to load wallet balance');
      setLoadingState('error');
    }
  };

  useEffect(() => {
    if (!loading) {
      if (user) load();
      else setLoadingState('idle');
    }
  }, [user, loading]);

  const loadRazorpayScript = (): Promise<boolean> =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });

  const handleAddMoney = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      onToast?.('Please enter a valid amount');
      return;
    }
    setAdding(true);
    try {
      const order = await walletRepository.addMoney(amt);
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        onToast?.('Payment gateway could not be loaded');
        return;
      }
      const rz = new window.Razorpay({
        key: order.key,
        amount: Math.round(order.amount * 100),
        currency: 'INR',
        name: 'AgriConnect',
        description: 'Add money to AgriConnect Wallet',
        order_id: order.orderId,
        prefill: { name: user?.user_metadata?.full_name ?? '', contact: user?.user_metadata?.phone ?? '' },
        theme: { color: '#16a34a' },
        handler: async (res) => {
          try {
            await walletRepository.verifyPayment({
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            });
            onToast?.(`₹${amt.toLocaleString('en-IN')} added to wallet`);
            setShowAdd(false);
            setAmount('');
            await load();
          } catch (e: any) {
            onToast?.(e.message ?? 'Payment verification failed');
          }
        },
        modal: { ondismiss: () => setAdding(false) },
      });
      rz.open();
      setAdding(false);
    } catch (e: any) {
      onToast?.(e.message ?? 'Could not start payment');
      setAdding(false);
    }
  };

  const pending = useMemo(() => summary?.pending_balance ?? 0, [summary]);

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Wallet size={22} /></span>
        <p className="text-sm font-extrabold text-foreground">{t('wallet.signInTitle')}</p>
        <p className="text-[11px] font-semibold text-muted-foreground">{t('wallet.signInHint')}</p>
        <Button size="sm" onClick={onNavigateToAuth}>{t('wallet.signIn')}</Button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Balance card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-green-800 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute right-10 top-12 h-16 w-16 rounded-full bg-white/5" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/90">{t('wallet.availableBalance')}</p>
          <Wallet size={18} className="text-emerald-100" />
        </div>
        <p className="mt-1 text-3xl font-black tracking-tight">
          {loadingState === 'loading' ? '…' : fmt(summary?.available_balance ?? 0)}
        </p>
        {pending > 0 && (
          <p className="mt-1 text-[10px] font-bold text-amber-200">
            {t('wallet.pending')}: {fmt(pending)}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold text-emerald-50/90">
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="opacity-80">{t('wallet.totalEarned')}</p>
            <p className="text-sm font-black text-white">{fmt(summary?.total_earned ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <p className="opacity-80">{t('wallet.totalSpent')}</p>
            <p className="text-sm font-black text-white">{fmt(summary?.total_spent ?? 0)}</p>
          </div>
        </div>
        {(summary?.promo_credit ?? 0) > 0 && (
          <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-100">
            <Gift size={11} /> {t('wallet.promoCredit')}: {fmt(summary?.promo_credit ?? 0)}
          </p>
        )}
      </div>

      {/* Error state — never show ₹0 because the API failed */}
      {loadingState === 'error' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-xs font-extrabold text-red-700">{error}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={load}>
            <RefreshCw size={13} className="mr-1" /> {t('wallet.retry')}
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> {t('wallet.addMoney')}
        </Button>
        <Button size="lg" variant="outline" className="gap-1.5" onClick={() => onToast?.(t('wallet.withdrawSoon'))} disabled>
          <Banknote size={16} /> {t('wallet.withdraw')}
        </Button>
      </div>

      {/* Recent activity */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-foreground">{t('wallet.recentActivity')}</h3>
          <span className="text-[10px] font-bold text-primary">{t('wallet.transactions')}</span>
        </div>
        <div className="space-y-2">
          {loadingState === 'loading' && recent.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-5 text-center text-[11px] font-semibold text-muted-foreground">{t('wallet.loading')}</p>
          )}
          {recent.length === 0 && loadingState === 'idle' && (
            <p className="rounded-2xl border border-dashed border-border p-5 text-center text-[11px] font-semibold text-muted-foreground">{t('wallet.noHistory')}</p>
          )}
          {recent.map((w) => {
            const Icon = TYPE_ICON[w.type] ?? Wallet;
            const credit = w.direction === 'in';
            return (
              <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', credit ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground')}>
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-foreground">{w.description ?? TYPE_LABEL[w.type] ?? w.type}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' · '}{w.status}
                    {w.reference_id ? ` · ${String(w.reference_id).slice(0, 10)}` : ''}
                  </p>
                </div>
                <span className={cn('text-sm font-black', credit ? 'text-emerald-600' : 'text-foreground')}>
                  {credit ? '+' : '−'}{fmt(w.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add money dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => { if (!adding) setShowAdd(v); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus size={16} className="text-primary" /> {t('wallet.addMoney')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-muted-foreground">{t('wallet.amount')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">₹</span>
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  className="pl-7 text-sm font-black"
                  disabled={adding}
                />
              </div>
            </div>
            <Button className="w-full gap-1.5" disabled={adding} onClick={handleAddMoney}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={15} />}
              {t('wallet.proceed')}
            </Button>
            {!adding && (
              <button onClick={() => setShowAdd(false)} className="mx-auto flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                <X size={12} /> {t('wallet.cancel')}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
