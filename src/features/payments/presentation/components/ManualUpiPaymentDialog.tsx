import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { CalendarDays, Copy, FileCheck2, CheckCircle2, ShieldCheck, QrCode, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  buildUpiUri,
  fetchPaymentConfig,
  fmtINR,
  prepareProofImage,
  submitManualPayment,
  uploadProof,
  validateUtr,
  type PaymentConfig,
  type ManualPlan,
} from '../../domain/manualUpi';

const S: Record<string, [string, string]> = {
  title: ['Pay by UPI', 'UPI से भुगतान करें'],
  stepMethod: ['Payment method', 'भुगतान विधि'],
  stepQr: ['Scan & pay', 'स्कैन करें और भुगतान करें'],
  stepProof: ['Payment proof', 'भुगतान प्रमाण'],
  methodUpiLabel: ['UPI', 'UPI'],
  scanHint: ['Open your UPI app (GPay / PhonePe / Paytm) and scan the QR code, or tap the button below.', 'अपने UPI ऐप (GPay / PhonePe / Paytm) से QR कोड स्कैन करें, या नीचे बटन दबाएँ।'],
  openApp: ['Pay in UPI App', 'UPI ऐप में भुगतान करें'],
  copyUpi: ['Copy UPI ID', 'UPI ID कॉपी करें'],
  amount: ['Amount', 'राशि'],
  payee: ['Payee', 'प्राप्तकर्ता'],
  proofTitle: ['Submit payment proof', 'भुगतान प्रमाण भेजें'],
  proofHint: ['After paying, enter your UPI transaction reference (UTR) and upload the payment screenshot. Our team verifies it manually.', 'भुगतान करने के बाद, अपना UPI ट्रांज़ेक्शन रेफरेंस (UTR) दर्ज करें और भुगतान स्क्रीनशॉट अपलोड करें। हमारी टीम इसे मैन्युअल रूप से सत्यापित करती है।'],
  utr: ['UTR / Transaction ID', 'UTR / ट्रांज़ेक्शन ID'],
  utrPh: ['e.g. 415974832196', 'जैसे 415974832196'],
  date: ['Payment date', 'भुगतान दिनांक'],
  note: ['Note (optional)', 'नोट (वैकल्पिक)'],
  screenshot: ['Payment screenshot', 'भुगतान स्क्रीनशॉट'],
  choose: ['Choose file', 'फाइल चुनें'],
  submit: ['Submit for verification', 'सत्यापन के लिए भेजें'],
  cameraReady: ['Screenshot ready', 'स्क्रीनशॉट तैयार'],
  back: ['Back', 'पीछे'],
  next: ['Next', 'आगे'],
  verifyWait: ['After submitting, our team verifies your payment. You will get a notification once approved.', 'सबमिट करने के बाद, हमारी टीम आपके भुगतान की पुष्टि करती है। स्वीकृत होने पर आपको सूचना मिलेगी।'],
  findingQr: ['Preparing QR...', 'QR तैयार हो रहा है...'],
  copied: ['Copied', 'कॉपी हो गया'],
  uploaded: ['Uploaded', 'अपलोड हो गया'],
};

type Step = 'method' | 'qr' | 'proof';

export function ManualUpiPaymentDialog({
  open,
  onOpenChange,
  plan,
  userId,
  onToast,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ManualPlan;
  userId: string;
  onToast?: (msg: string) => void;
  onSubmitted?: () => void;
}) {
  const { language } = useLanguage();
  const hi = language === 'hi';
  const t = (k: string) => S[k]?.[hi ? 1 : 0] ?? k;

  const [step, setStep] = useState<Step>('method');
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [utr, setUtr] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [busy, setBusy] = useState(false);
  const [failMsg, setFailMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);

  const amount = plan.price || 0;

  useEffect(() => {
    if (!open) return;
    setStep('method');
    setUtr('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setFile(null);
    setFileError('');
    setFailMsg('');
    setCopied(false);
    setDone(false);
    setConfig(null);
    fetchPaymentConfig().then((c) => c && setConfig(c));
  }, [open, plan.id]);

  const upiUri = useMemo(
    () => (config ? buildUpiUri(config, amount, `AgriConnect ${plan.name}`) : ''),
    [config, amount, plan.name],
  );

  const utrError = useMemo(() => validateUtr(utr), [utr]);

  const handleCopy = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(config.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setFailMsg('Could not copy UPI ID');
    }
  };

  const handleFile = async (f: File | null) => {
    setFile(null);
    setFileError('');
    if (!f) return;
    const res = await prepareProofImage(f);
    if (res.error) {
      setFileError(res.error);
      return;
    }
    setFile(new File([res.image!.blob], `proof.${res.image!.ext}`, { type: res.image!.blob.type }));
  };

  const canSubmit = Boolean(file) && !utrError && step === 'proof';

  const handleSubmit = async () => {
    if (!file || !config || !userId) return;
    setBusy(true);
    setFailMsg('');
    try {
      const up = await uploadProof(userId, file, (file.name.split('.').pop() || 'png').replace('jpg', 'jpeg'));
      if (!up.ok) {
        setFailMsg(up.error);
        return;
      }
      const sub = await submitManualPayment({
        planId: plan.id,
        amount,
        utr,
        proofPath: up.path,
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        note: note || undefined,
      });
      if (!sub.ok) {
        setFailMsg(sub.error);
        return;
      }
      setDone(true);
      onToast?.(t('verifyWait'));
      onSubmitted?.();
    } catch (err: any) {
      setFailMsg(err?.message || 'Submission failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{t('title')} · {plan.name}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {(['method', 'qr', 'proof'] as Step[]).map((s, i) => (
            <div key={s} className={cn('flex items-center gap-2', i > 0 && 'flex-1')}>
              {i > 0 && <div className={cn('h-0.5 flex-1 rounded', stepIndex(step) >= i ? 'bg-primary' : 'bg-muted')} />}
              <div className={cn(
                'flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-black',
                stepIndex(s) === stepIndex(step) ? 'bg-primary text-primary-foreground'
                  : stepIndex(s) < stepIndex(step) ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
              )}>
                {stepIndex(s) < stepIndex(step) ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{t(stepLabel(s))}</span>
              </div>
            </div>
          ))}
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
              <FileCheck2 size={26} />
            </div>
            <p className="text-sm font-black text-foreground">{t('submit')} ✓</p>
            <p className="max-w-xs text-xs font-semibold text-muted-foreground">{t('verifyWait')}</p>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>{t('back')}</Button>
          </div>
        ) : step === 'method' ? (
          <div className="space-y-3 pt-1">
            <button
              onClick={() => { setStep('qr'); setFailMsg(''); }}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-primary bg-primary/5 p-4 text-left transition hover:bg-primary/10"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <QrCode size={20} />
              </span>
              <div>
                <p className="text-sm font-black text-foreground">{t('methodUpiLabel')} · {fmtINR(amount)}</p>
                <p className="text-[11px] font-semibold text-muted-foreground">{t('scanHint')}</p>
              </div>
            </button>
            {failMsg && <p className="text-[11px] font-bold text-red-600">{failMsg}</p>}
          </div>
        ) : step === 'qr' ? (
          <div className="space-y-4 pt-1">
            {!config ? (
              <div className="flex h-56 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 size={22} className="animate-spin" />
                <p className="text-xs font-bold">{t('findingQr')}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs font-bold">
                  <span className="text-muted-foreground">{t('amount')}</span>
                  <span className="text-sm font-black text-foreground">{fmtINR(amount)}</span>
                  <span className="text-muted-foreground pl-4">{t('payee')}</span>
                  <span className="text-foreground">{config.payee_name}</span>
                </div>

                <div className="flex justify-center rounded-2xl border border-dashed border-primary/40 bg-white p-5">
                  <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                    <QRCode value={upiUri} size={190} />
                  </div>
                </div>
                <p className="text-center text-[11px] font-semibold leading-relaxed text-muted-foreground">{t('scanHint')}</p>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => window.open(upiUri, '_self')}>
                    {t('openApp')}
                  </Button>
                  <Button variant="outline" onClick={handleCopy}>
                    {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copied ? t('copied') : t('copyUpi')}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setStep('proof')}>
                  {t('next')} →
                </Button>
                {failMsg && <p className="text-[11px] font-bold text-red-600">{failMsg}</p>}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="flex items-start gap-2 rounded-2xl bg-primary/5 px-3 py-2.5">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-[11px] font-semibold leading-relaxed text-muted-foreground">{t('proofHint')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-black text-muted-foreground">{t('amount')}</label>
                <div className="flex h-9 items-center rounded-xl border border-border bg-muted/40 px-3 text-xs font-black text-foreground">
                  {fmtINR(amount)}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black text-muted-foreground">{t('date')}</label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="h-9 text-xs font-bold" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-black text-muted-foreground">{t('utr')}</label>
              <Input
                value={utr}
                onChange={(e) => { setUtr(e.target.value); setFailMsg(''); }}
                placeholder={t('utrPh')}
                className="text-xs font-bold uppercase tracking-wide"
              />
              {utrError && <p className="mt-1 text-[10px] font-bold text-red-600">{utrError}</p>}
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-black text-muted-foreground">{t('screenshot')}</label>
              <label className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition',
                file ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/5' : 'border-border hover:border-primary/50',
              )}>
                {file ? <FileCheck2 size={22} className="text-emerald-500" /> : <Upload size={22} className="text-muted-foreground" />}
                {file ? (
                  <>
                    <p className="text-xs font-black text-emerald-700">{t('cameraReady')}</p>
                    <p className="max-w-[220px] truncate text-[10px] font-semibold text-muted-foreground">{file.name}</p>
                  </>
                ) : (
                  <>
                    <p className="flex items-center gap-1.5 text-xs font-black text-foreground">
                      <ImageIcon size={13} /> {t('choose')}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground">PNG / JPG / WebP · {'<'}5 MB</p>
                  </>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
              </label>
              {fileError && <p className="mt-1 text-[10px] font-bold text-red-600">{fileError}</p>}
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-black text-muted-foreground">{t('note')}</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="text-xs font-semibold" placeholder="..." />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep('qr'); setFailMsg(''); }} disabled={busy}>
                {t('back')}
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit || busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {t('submit')}
              </Button>
            </div>
            {failMsg && <p className="text-[11px] font-bold text-red-600">{failMsg}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function stepIndex(s: Step): number {
  return s === 'method' ? 0 : s === 'qr' ? 1 : 2;
}

function stepLabel(s: Step): string {
  return s === 'method' ? 'stepMethod' : s === 'qr' ? 'stepQr' : 'stepProof';
}