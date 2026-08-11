import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fmtMoney, processPayment, retryTransaction } from '../domain/paymentStore';
import type { PaymentMethod, PaymentPurpose, PaymentTransaction } from '../domain/paymentTypes';
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  isLuhnValid,
  maskCardNumber,
  buildUpiPayload,
} from '../domain/secureStorage';
import { AmountSummary } from './components/AmountSummary';
import { MethodPicker } from './components/MethodPicker';
import { usePaymentStore } from './hooks/usePaymentStore';
import { useLanguage } from '@/contexts/LanguageContext';

export interface CheckoutRequest {
  purpose: PaymentPurpose;
  description: string;
  subtotal: number;
  couponCode?: string;
  gstRate?: number;
  refId?: string;
  upiId?: string;
  meta?: Record<string, string | number | boolean>;
}

interface CheckoutFlowProps {
  open: boolean;
  onClose: () => void;
  request: CheckoutRequest;
  defaultMethod?: PaymentMethod;
  onSuccess?: (txn: PaymentTransaction) => void;
  onToast?: (message: string) => void;
}

type Step = 'method' | 'auth' | 'processing' | 'success' | 'failed';

const BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Axis Bank',
  'Union Bank of India',
];

const VPA_RE = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9]{2,}$/;

export function CheckoutFlow({ open, onClose, request, defaultMethod = 'upi', onSuccess, onToast }: CheckoutFlowProps) {
  const { t } = useLanguage();
  const { wallet } = usePaymentStore();

  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod);
  const [txn, setTxn] = useState<PaymentTransaction | null>(null);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // UPI
  const [vpa, setVpa] = useState(request.upiId ?? '');
  const [otp, setOtp] = useState('');
  const [otpShown, setOtpShown] = useState(false);
  // Card
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  // Netbanking
  const [bank, setBank] = useState('');

  const startedRef = useRef(false);
  const walletBalance = wallet.balance;
  const total = txn?.total ?? request.subtotal;

  const canPay =
    method === 'upi'
      ? otpShown ? otp.length >= 4 : VPA_RE.test(vpa)
      : method === 'card'
        ? isLuhnValid(cardNumber) && expiry.length === 5 && cvv.length >= 3
        : method === 'netbanking'
          ? bank.length > 0
          : walletBalance >= total;

  const run = useCallback(
    async (isRetry: boolean) => {
      if (startedRef.current && !isRetry) return;
      startedRef.current = true;
      setError('');
      setStep('processing');
      try {
        const result = isRetry && txn
          ? await retryTransaction(txn.id)
          : await processPayment({
              purpose: request.purpose,
              subtotal: request.subtotal,
              description: request.description,
              method,
              couponCode: request.couponCode,
              gstRate: request.gstRate,
              refId: request.refId,
              upiId: method === 'upi' ? vpa : request.upiId,
              cardLast4: method === 'card' ? cardNumber.replace(/\D/g, '').slice(-4) : undefined,
              bank: method === 'netbanking' ? bank : undefined,
              meta: request.meta,
            });
        setTxn(result);
        setAttempts(result.attempts.length);
        if (result.status === 'Success') {
          setStep('success');
          onSuccess?.(result);
        } else {
          setStep('failed');
          setError(result.failureReason ?? 'Payment failed');
        }
      } catch (e) {
        setStep('failed');
        setError(e instanceof Error ? e.message : 'Payment failed');
      }
    },
    [request, method, vpa, cardNumber, bank, txn, onSuccess],
  );

  const reset = () => {
    startedRef.current = false;
    setStep('method');
    setTxn(null);
    setError('');
    setAttempts(0);
    setOtp('');
    setOtpShown(false);
    setBank('');
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const handlePay = () => {
    if (method === 'upi' && !otpShown) {
      if (!VPA_RE.test(vpa)) {
        setError(t('pay.invalidVpa'));
        return;
      }
      setOtpShown(true);
      setError('');
      return;
    }
    run(false);
  };

  const invoice = txn?.invoiceId ? txn.invoiceId : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? reset() : onClose())}>
      <DialogContent className="max-w-md">
        {/* Step indicator */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-black text-foreground">{t('pay.secureCheckout')}</span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
            <ShieldCheck size={11} /> {t('pay.secure')}
          </span>
        </div>

        {step === 'method' && (
          <div className="space-y-4">
            <AmountSummary
              purpose={request.purpose}
              subtotal={request.subtotal}
              method={method}
              gstRate={request.gstRate}
              couponCode={request.couponCode}
              onCouponChange={() => undefined}
              compact
            />
            <div>
              <p className="mb-2 text-xs font-extrabold text-muted-foreground">{t('pay.selectMethod')}</p>
              <MethodPicker value={method} onChange={setMethod} walletBalance={walletBalance} />
            </div>
            <Button className="w-full gap-1.5" onClick={() => setStep('auth')} disabled={method === 'wallet' && walletBalance < total}>
              <CircleDollarSign size={16} /> {t('pay.continue')}
            </Button>
            {method === 'wallet' && walletBalance < total && (
              <p className="text-center text-[11px] font-bold text-red-600">{t('pay.insufficientWallet')}</p>
            )}
          </div>
        )}

        {step === 'auth' && (
          <div className="space-y-4">
            <button onClick={() => setStep('method')} className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground">
              <ChevronLeft size={13} /> {t('pay.back')}
            </button>

            {method === 'upi' && (
              <div className="space-y-3">
                {!otpShown ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">{t('pay.vpa')}</Label>
                    <Input value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="yourname@okbank" className="text-xs font-semibold" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">{t('pay.otpTitle')}</Label>
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-border bg-white p-2">
                        <QRCode
                          value={buildUpiPayload(vpa, 'AgriConnect', total, request.description)}
                          size={92}
                          fgColor="#052e16"
                        />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <p className="text-[10px] font-semibold text-muted-foreground">
                          {vpa} • {fmtMoney(total)}
                        </p>
                        <InputOTP value={otp} onChange={setOtp} maxLength={4} render={({ slots }) => (
                          <InputOTPGroup className="gap-2">
                            {slots.map((slot, i) => (
                              <InputOTPSlot key={i} index={i} {...slot} className="h-11 w-9 rounded-xl border text-lg font-black" />
                            ))}
                          </InputOTPGroup>
                        )} />
                      </div>
                    </div>
                    <p className="text-[10px] font-semibold text-muted-foreground">{t('pay.otpHint')}</p>
                  </div>
                )}
                {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
                <Button className="w-full" onClick={handlePay} disabled={!canPay}>
                  {otpShown ? t('pay.confirm') : t('pay.verifyUpi')}
                </Button>
              </div>
            )}

            {method === 'card' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t('pay.cardNumber')}</Label>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4111 1111 1111 1111"
                    inputMode="numeric"
                    className="text-xs font-semibold tracking-wider"
                  />
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {detectCardBrand(cardNumber)} {cardNumber && !isLuhnValid(cardNumber) ? `• ${t('pay.invalidCard')}` : ''}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">{t('pay.expiry')}</Label>
                    <Input value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" inputMode="numeric" className="text-xs font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">{t('pay.cvv')}</Label>
                    <Input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="•••" inputMode="numeric" type="password" className="text-xs font-semibold" />
                  </div>
                </div>
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-[10px] font-semibold text-muted-foreground">
                  🔒 {t('pay.cardSecurity')} — {cardNumber ? maskCardNumber(cardNumber) : ''}
                </p>
                {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
                <Button className="w-full" onClick={() => run(false)} disabled={!canPay}>
                  {t('pay.pay')} {fmtMoney(total)}
                </Button>
              </div>
            )}

            {method === 'netbanking' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t('pay.chooseBank')}</Label>
                  <Select value={bank} onValueChange={setBank}>
                    <SelectTrigger className="text-xs font-semibold">
                      <SelectValue placeholder={t('pay.chooseBank')} />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map((b) => (
                        <SelectItem key={b} value={b} className="text-xs">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-[10px] font-semibold text-muted-foreground">
                  🔒 {t('pay.bankRedirect')}
                </p>
                {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
                <Button className="w-full" onClick={() => run(false)} disabled={!canPay}>
                  {t('pay.pay')} {fmtMoney(total)}
                </Button>
              </div>
            )}

            {method === 'wallet' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center">
                  <p className="text-[11px] font-bold text-muted-foreground">{t('pay.walletBalance')}</p>
                  <p className="text-2xl font-black text-foreground">{fmtMoney(walletBalance)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    {t('pay.paying')} <span className="font-black text-foreground">{fmtMoney(total)}</span>
                  </p>
                </div>
                {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
                <Button className="w-full" onClick={() => run(false)} disabled={!canPay}>
                  {t('pay.confirm')} {fmtMoney(total)}
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center py-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm font-extrabold text-foreground">{t('pay.processing')}</p>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{t('pay.doNotClose')}</p>
          </div>
        )}

        {step === 'success' && txn && (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </span>
            <h3 className="mt-4 text-lg font-black text-foreground">{t('pay.successTitle')}</h3>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{txn.description}</p>
            <p className="mt-3 text-2xl font-black text-foreground">{fmtMoney(txn.total)}</p>
            <div className="mt-4 w-full space-y-1.5 rounded-2xl bg-muted/40 p-3 text-left text-xs">
              <div className="flex justify-between"><span className="font-semibold text-muted-foreground">{t('pay.transactionId')}</span><span className="font-black text-foreground">{txn.id}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-muted-foreground">{t('pay.gateway')}</span><span className="font-black uppercase text-foreground">{txn.gateway}</span></div>
              {txn.gatewayRef && <div className="flex justify-between"><span className="font-semibold text-muted-foreground">Ref</span><span className="font-black text-foreground">{txn.gatewayRef}</span></div>}
            </div>
            <div className="mt-5 flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>{t('pay.done')}</Button>
              {invoice && <Button className="flex-1" onClick={onClose}>{t('pay.viewInvoice')}</Button>}
            </div>
          </div>
        )}

        {step === 'failed' && (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </span>
            <h3 className="mt-4 text-lg font-black text-foreground">{t('pay.failedTitle')}</h3>
            <p className="mt-1 max-w-xs text-xs font-semibold text-muted-foreground">{error}</p>
            <p className="mt-2 rounded-full bg-muted px-3 py-1 text-[10px] font-black text-muted-foreground">
              {t('pay.attempt')} {attempts} {attempts > 1 ? t('pay.attempts') : ''}
            </p>
            <div className="mt-5 flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => { reset(); setStep('method'); }}
              >
                {t('pay.changeMethod')}
              </Button>
              <Button className="flex-1 gap-1.5" onClick={() => run(true)} disabled={step === 'processing'}>
                <RotateCcw size={14} /> {t('pay.retry')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
