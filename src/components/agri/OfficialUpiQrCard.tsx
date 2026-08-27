import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { CheckCircle2, Copy, QrCode, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface OfficialUpiQrCardProps {
  amount?: number;
  note?: string;
  className?: string;
  showAppLauncher?: boolean;
}

export const OFFICIAL_UPI_CONFIG = {
  upiId: '7067820256@ptyes',
  payeeName: 'SATYAM DUBEY',
  currency: 'INR',
  qrImagePath: '/images/payment-qr.jpg',
};

export function buildOfficialUpiUri(amount?: number, note?: string): string {
  const params = [`pa=${encodeURIComponent(OFFICIAL_UPI_CONFIG.upiId)}`];
  params.push(`pn=${encodeURIComponent(OFFICIAL_UPI_CONFIG.payeeName)}`);
  params.push(`cu=INR`);
  if (amount && amount > 0) {
    params.push(`am=${encodeURIComponent(String(amount))}`);
  }
  if (note) {
    params.push(`tn=${encodeURIComponent(note)}`);
  }
  return `upi://pay?${params.join('&')}`;
}

export const OfficialUpiQrCard: React.FC<OfficialUpiQrCardProps> = ({
  amount,
  note = 'AgriConnect Payment',
  className = '',
  showAppLauncher = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const upiUri = buildOfficialUpiUri(amount, note);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(OFFICIAL_UPI_CONFIG.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/5 via-emerald-50/20 to-transparent dark:from-primary/10 dark:via-emerald-950/20 p-4 text-center ${className}`}>
      {/* Official Merchant Header */}
      <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
        <ShieldCheck size={14} className="text-emerald-600" />
        <span>Official AgriConnect Payment QR</span>
      </div>

      {amount !== undefined && amount > 0 && (
        <div className="mt-2 text-xl font-black text-foreground">
          ₹{amount.toLocaleString('en-IN')}
        </div>
      )}

      {/* QR Code Container */}
      <div className="mt-3 relative rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/10">
        {!imgError ? (
          <img
            src={OFFICIAL_UPI_CONFIG.qrImagePath}
            alt="Official UPI QR Code - SATYAM DUBEY"
            className="h-44 w-44 rounded-xl object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <QRCode value={upiUri} size={176} />
        )}
      </div>

      {/* Payee Details */}
      <div className="mt-3 space-y-0.5">
        <p className="text-xs font-black text-foreground">{OFFICIAL_UPI_CONFIG.payeeName}</p>
        <p className="font-mono text-xs font-bold text-primary">{OFFICIAL_UPI_CONFIG.upiId}</p>
      </div>

      <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
        Scan with Google Pay, PhonePe, Paytm, BHIM, or any UPI App
      </p>

      {/* Action Buttons */}
      <div className="mt-3 grid w-full grid-cols-2 gap-2">
        {showAppLauncher && (
          <Button
            type="button"
            size="sm"
            onClick={() => window.open(upiUri, '_self')}
            className="gap-1.5 font-bold text-xs"
          >
            <QrCode size={13} />
            Pay in App
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className={`gap-1.5 font-bold text-xs ${!showAppLauncher ? 'col-span-2' : ''}`}
        >
          {copied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
          {copied ? 'Copied UPI ID' : 'Copy UPI ID'}
        </Button>
      </div>
    </div>
  );
};
