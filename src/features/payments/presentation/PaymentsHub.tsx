import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  History,
  ListOrdered,
  ReceiptText,
  RotateCcw,
  Sparkles,
  Undo2,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  evaluateSubscriptionStates,
  fmtMoney,
  markAllNotificationsRead,
  markNotificationRead,
  processRefund,
  retryTransaction,
} from '../domain/paymentStore';
import type { Invoice, PaymentMethod, PaymentPurpose, PaymentTransaction } from '../domain/paymentTypes';
import { usePaymentStore } from './hooks/usePaymentStore';
import { WalletSection } from '@/features/wallet/presentation/WalletSection';
import { AmountSummary } from './components/AmountSummary';
import { CheckoutFlow, type CheckoutRequest } from './CheckoutFlow';
import { InvoiceModal } from './components/InvoiceView';
import { PayStatusBadge } from './components/PayStatusBadge';
import { SubscriptionsPanel } from './components/SubscriptionsPanel';
import { notifyEvent } from '@/features/notifications/notify';
import { useLanguage } from '@/contexts/LanguageContext';

type HubTab = 'wallet' | 'pay' | 'history' | 'invoices' | 'subscriptions';

interface PaymentsHubProps {
  onNavigate?: (tab: string) => void;
  onToast?: (message: string) => void;
}

const TAB_ICONS: Record<HubTab, typeof Wallet> = {
  wallet: Wallet,
  pay: ListOrdered,
  history: History,
  invoices: FileText,
  subscriptions: Sparkles,
};

export function PaymentsHub({ onNavigate, onToast }: PaymentsHubProps) {
  const { t } = useLanguage();
  const store = usePaymentStore();
  const [tab, setTab] = useState<HubTab>('wallet');
  const [checkout, setCheckout] = useState<CheckoutRequest | null>(null);
  const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethod>('upi');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Pay tab form
  const [purpose, setPurpose] = useState<PaymentPurpose>('marketplace');
  const [amount, setAmount] = useState(1200);
  const [qty, setQty] = useState(2);
  const [rate, setRate] = useState(400);
  const [unit, setUnit] = useState<'hours' | 'acres'>('hours');
  const [coupon, setCoupon] = useState('');

  useEffect(() => {
    evaluateSubscriptionStates();
  }, []);

  const subtotal = useMemo(() => {
    if (purpose === 'marketplace') return Math.max(0, amount);
    if (purpose === 'pay-per-acre') return Math.max(0, qty * rate);
    return Math.max(0, qty * rate); // rental hours/acres
  }, [purpose, amount, qty, rate]);

  const description = useMemo(() => {
    if (purpose === 'marketplace') return 'Agri marketplace order';
    if (purpose === 'pay-per-acre') return `Pay-per-acre land service — ${qty} acre${qty !== 1 ? 's' : ''} × ${fmtMoney(rate)}`;
    return `Tractor rental — ${qty} ${unit} × ${fmtMoney(rate)}/${unit}`;
  }, [purpose, qty, rate, unit]);

  const openCheckout = (method = checkoutMethod) => {
    const request: CheckoutRequest = {
      purpose,
      description,
      subtotal,
      couponCode: coupon || undefined,
      meta: purpose === 'pay-per-acre' ? { acres: qty, ratePerAcre: rate } : undefined,
    };
    setCheckoutMethod(method);
    setCheckout(request);
  };

  const handleSuccess = (txn: PaymentTransaction) => {
    notifyEvent({
      category: 'payment',
      severity: 'info',
      titleKey: 'notif.paymentSuccess.title',
      bodyKey: 'notif.paymentSuccess.body',
      params: { amount: `₹${txn.total.toLocaleString('en-IN')}` },
      tab: 'wallet',
      dedupeKey: `pay-success-${txn.id}`,
    });
    if (txn.invoiceId) {
      const invoice = store.invoices.find((inv) => inv.id === txn.invoiceId);
      if (invoice) {
        setSelectedInvoice(invoice);
        setInvoiceOpen(true);
      }
    }
  };

  const handleRefund = async (txnId: string, reason: string) => {
    const txn = await processRefund(txnId, reason);
    if (txn?.status === 'Refunded' || txn?.status === 'PartialRefund') {
      notifyEvent({
        category: 'payment',
        severity: 'info',
        titleKey: 'notif.refundProcessed.title',
        bodyKey: 'notif.refundProcessed.body',
        params: { amount: `₹${txn.total.toLocaleString('en-IN')}` },
        tab: 'wallet',
        dedupeKey: `pay-refund-${txn.id}`,
      });
      onToast?.(t('pay.refundProcessed'));
    } else if (txn) {
      onToast?.(t('pay.refundFailed'));
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('home')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card hover:text-foreground"
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-black text-foreground">{t('pay.title')}</h1>
            <p className="text-[11px] font-semibold text-muted-foreground">{t('pay.subtitle')}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card hover:text-foreground"
            aria-label={t('pay.notifications')}
          >
            <Bell size={15} />
            {store.notifications.some((n) => !n.read) && (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-background" />
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-border bg-card p-2 shadow-2xl">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-black text-foreground">{t('pay.notifications')}</span>
                <button onClick={markAllNotificationsRead} className="text-[10px] font-bold text-primary">
                  {t('pay.markAllRead')}
                </button>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {store.notifications.length === 0 && (
                  <p className="px-2 py-4 text-center text-[11px] font-semibold text-muted-foreground">{t('pay.noNotifs')}</p>
                )}
                {store.notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={cn(
                      'w-full rounded-xl px-2.5 py-2 text-left',
                      n.read ? 'opacity-60' : 'bg-muted/50',
                    )}
                  >
                    <p className="text-[11px] font-extrabold text-foreground">{n.title}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">{n.body}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <nav className="sticky top-0 z-30 -mx-4 mt-3 bg-background/85 px-4 py-2 backdrop-blur-lg">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {(Object.keys(TAB_ICONS) as HubTab[]).map((key) => {
            const Icon = TAB_ICONS[key];
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-extrabold transition-all',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-glow'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground shadow-card',
                )}
              >
                <Icon size={13} />
                {t(`pay.tab_${key}`)}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Wallet tab (real ledger-backed wallet) ─────────────── */}
      {tab === 'wallet' && (
        <WalletSection onToast={onToast} onNavigateToAuth={() => onNavigate?.('auth')} />
      )}

      {/* ── Pay tab ────────────────────────────────────────────── */}
      {tab === 'pay' && (
        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-xs font-extrabold text-muted-foreground">{t('pay.whatFor')}</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['marketplace', 'rental', 'pay-per-acre'] as PaymentPurpose[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPurpose(p)}
                  className={cn(
                    'rounded-2xl border-2 p-3 text-left transition-all',
                    purpose === p ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                  )}
                >
                  <p className="text-xs font-black text-foreground">{t(`pay.purpose_${p}`)}</p>
                  <p className="mt-0.5 text-[9px] font-bold leading-tight text-muted-foreground">{t(`pay.purpose_${p}_desc`)}</p>
                </button>
              ))}
            </div>
          </div>

          {purpose === 'marketplace' ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t('pay.orderTotal')}</Label>
              <Input type="number" min={1} value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className="text-sm font-black" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {purpose === 'pay-per-acre' ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">{t('pay.acres')}</Label>
                    <Input type="number" min={0.5} step={0.5} value={qty || ''} onChange={(e) => setQty(Number(e.target.value))} className="text-sm font-black" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">{t('pay.ratePerAcre')}</Label>
                    <Input type="number" min={1} value={rate || ''} onChange={(e) => setRate(Number(e.target.value))} className="text-sm font-black" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">{t('pay.unit')}</Label>
                    <Select value={unit} onValueChange={(v) => setUnit(v as 'hours' | 'acres')}>
                      <SelectTrigger className="text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">{t('pay.hours')}</SelectItem>
                        <SelectItem value="acres">{t('pay.acres')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">{t('pay.qty')}</Label>
                      <Input type="number" min={1} value={qty || ''} onChange={(e) => setQty(Number(e.target.value))} className="text-sm font-black" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">{t('pay.rate')} /{unit}</Label>
                      <Input type="number" min={1} value={rate || ''} onChange={(e) => setRate(Number(e.target.value))} className="text-sm font-black" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <AmountSummary
            purpose={purpose}
            subtotal={subtotal}
            method={checkoutMethod}
            couponCode={coupon}
            onCouponChange={setCoupon}
            onToast={onToast}
          />

          <Button className="w-full gap-1.5" size="lg" onClick={() => openCheckout()} disabled={subtotal < 1}>
            {t('pay.continueToPay')} · {fmtMoney(subtotal)}
          </Button>
        </div>
      )}

      {/* ── History tab ────────────────────────────────────────── */}
      {tab === 'history' && (
        <TransactionHistory
          onOpenInvoice={(txn) => {
            const inv = store.invoices.find((i) => i.id === txn.invoiceId);
            if (inv) {
              setSelectedInvoice(inv);
              setInvoiceOpen(true);
            }
          }}
          onRefund={handleRefund}
          onRetry={(txnId) => {
            setCheckoutMethod('upi');
            void retryTransaction(txnId);
          }}
        />
      )}

      {/* ── Invoices tab ───────────────────────────────────────── */}
      {tab === 'invoices' && (
        <div className="mt-4 space-y-2.5">
          {store.invoices.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs font-semibold text-muted-foreground">
              {t('pay.noInvoices')}
            </p>
          )}
          {store.invoices.map((inv) => (
            <button
              key={inv.id}
              onClick={() => {
                setSelectedInvoice(inv);
                setInvoiceOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-card transition-all hover:border-primary/40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <ReceiptText size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-foreground">{inv.number}</p>
                <p className="truncate text-[10px] font-semibold text-muted-foreground">
                  {inv.lines[0]?.description ?? ''} • {new Date(inv.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-foreground">{fmtMoney(inv.total)}</p>
                <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-extrabold', inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'Refunded' ? 'bg-sky-100 text-sky-700' : 'bg-muted text-muted-foreground')}>
                  {inv.status}
                </span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {/* ── Subscriptions tab ──────────────────────────────────── */}
      {tab === 'subscriptions' && (
        <div className="mt-4">
          <SubscriptionsPanel onToast={onToast} />
        </div>
      )}

      {/* Checkout flow */}
      {checkout && (
        <CheckoutFlow
          open={!!checkout}
          onClose={() => setCheckout(null)}
          request={checkout}
          defaultMethod={checkoutMethod}
          onSuccess={handleSuccess}
          onToast={onToast}
        />
      )}

      <InvoiceModal invoice={selectedInvoice} open={invoiceOpen} onOpenChange={setInvoiceOpen} />
    </div>
  );
}

/* ── Transaction history list ────────────────────────────────────────── */

function TransactionHistory({
  onOpenInvoice,
  onRefund,
  onRetry,
}: {
  onOpenInvoice: (txn: PaymentTransaction) => void;
  onRefund: (txnId: string, reason: string) => void;
  onRetry: (txnId: string) => void;
}) {
  const { t } = useLanguage();
  const store = usePaymentStore();
  const [statusFilter, setStatusFilter] = useState<'all' | 'Success' | 'Failed' | 'Refunded'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<PaymentTransaction | null>(null);
  const [refundReason, setRefundReason] = useState('Purchase cancelled by user');

  const filtered = store.transactions.filter((tx) =>
    statusFilter === 'all' ? true : tx.status === statusFilter || (statusFilter === 'Refunded' && (tx.status === 'Refunded' || tx.status === 'PartialRefund' || tx.status === 'RefundPending')),
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {(['all', 'Success', 'Failed', 'Refunded'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold',
              statusFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {f === 'all' ? t('pay.all') : t(`pay.status_${f}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs font-semibold text-muted-foreground">
          {t('pay.noHistory')}
        </p>
      )}

      {filtered.map((tx) => {
        const open = expanded === tx.id;
        const canRefund = tx.status === 'Success';
        const canRetry = tx.status === 'Failed';
        return (
          <div key={tx.id} className="rounded-2xl border border-border bg-card shadow-card">
            <button
              onClick={() => setExpanded(open ? null : tx.id)}
              className="flex w-full items-center gap-3 p-3.5 text-left"
            >
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tx.status === 'Failed' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary')}>
                {tx.purpose === 'wallet' ? <Wallet size={17} /> : tx.purpose === 'subscription' ? <Sparkles size={17} /> : <ListOrdered size={17} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-foreground">{tx.description}</p>
                <p className="text-[10px] font-semibold text-muted-foreground">
                  {tx.id} • {new Date(tx.initiatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black text-foreground">{fmtMoney(tx.total)}</p>
                <PayStatusBadge status={tx.status} />
              </div>
              <ChevronDown size={14} className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
              <div className="border-t border-border/60 p-3.5">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <Detail label={t('pay.method')} value={tx.method.toUpperCase()} />
                  <Detail label={t('pay.gateway')} value={tx.gateway.toUpperCase()} />
                  <Detail label={t('pay.subtotal')} value={fmtMoney(tx.subtotal)} />
                  {tx.discount > 0 && <Detail label={t('pay.discount')} value={fmtMoney(tx.discount)} />}
                  <Detail label={t('pay.gst')} value={tx.gstRate > 0 ? `${fmtMoney(tx.gstAmount)} (${tx.gstRate}%)` : '—'} />
                  <Detail label={t('pay.attempts')} value={String(tx.attempts.length)} />
                  {tx.gatewayRef && <Detail label="Ref" value={tx.gatewayRef} />}
                  {tx.failureReason && <Detail label={t('pay.reason')} value={tx.failureReason} />}
                </div>

                {tx.attempts.length > 1 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('pay.attemptLog')}</p>
                    {tx.attempts.map((a, i) => (
                      <div key={a.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5 text-[10px]">
                        <span className="font-bold text-muted-foreground">{t('pay.attempt')} {i + 1} • {a.method.toUpperCase()}</span>
                        <span className={cn('font-extrabold', a.status === 'Success' ? 'text-emerald-600' : a.status === 'Failed' ? 'text-red-600' : 'text-amber-600')}>
                          {a.status}{a.failureReason ? ` — ${a.failureReason}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {canRetry && (
                    <Button size="sm" className="gap-1.5" onClick={() => onRetry(tx.id)}>
                      <RotateCcw size={13} /> {t('pay.retry')}
                    </Button>
                  )}
                  {canRefund && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRefundFor(tx)}>
                      <Undo2 size={13} /> {t('pay.refund')}
                    </Button>
                  )}
                  {tx.invoiceId && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onOpenInvoice(tx)}>
                      <ReceiptText size={13} /> {t('pay.invoice')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Refund dialog */}
      <Dialog open={!!refundFor} onOpenChange={(v) => !v && setRefundFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{t('pay.refund')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold text-muted-foreground">
              {refundFor?.description} • <span className="font-black text-foreground">{refundFor ? fmtMoney(refundFor.total) : ''}</span>
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t('pay.refundReason')}</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Purchase cancelled by user', 'Order not delivered', 'Duplicate payment', 'Service not available'].map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              variant="destructive"
              disabled={!refundFor}
              onClick={async () => {
                if (!refundFor) return;
                const id = refundFor.id;
                setRefundFor(null);
                await onRefund(id, refundReason);
              }}
            >
              {t('pay.confirmRefund')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-muted/40 px-2.5 py-1.5">
      <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-[11px] font-extrabold text-foreground">{value}</span>
    </div>
  );
}
