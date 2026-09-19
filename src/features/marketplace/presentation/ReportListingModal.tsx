import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Flag,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  MarketplaceListing,
  MarketplaceReport,
} from '../domain/marketplaceTypes';
import { marketplaceService } from '../domain/marketplaceService';
import { useAuth } from '@/hooks/useAuth';

interface ReportListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: MarketplaceListing | null;
  onSuccess?: () => void;
  onToast?: (msg: string) => void;
}

const REPORT_REASONS: Array<{
  id: MarketplaceReport['reason'];
  label: string;
  description: string;
}> = [
  {
    id: 'scam',
    label: 'Suspected Fraud or Scam',
    description: 'Fake seller, advance payment demand without verification, or counterfeit goods',
  },
  {
    id: 'wrong_price',
    label: 'Incorrect or Misleading Price',
    description: 'Price stated does not match real demanded rate or hidden charges',
  },
  {
    id: 'unavailable',
    label: 'Item / Service No Longer Available',
    description: 'Owner confirmed sold or rented out elsewhere',
  },
  {
    id: 'duplicate',
    label: 'Duplicate Listing',
    description: 'Identical item listed multiple times',
  },
  {
    id: 'inappropriate',
    label: 'Inappropriate Content or Abuse',
    description: 'Offensive images, bad language, or prohibited agricultural items',
  },
  {
    id: 'spam',
    label: 'Spam / Commercial Bot',
    description: 'Promotional spam not related to genuine agricultural trade',
  },
];

export const ReportListingModal: React.FC<ReportListingModalProps> = ({
  open,
  onOpenChange,
  listing,
  onSuccess,
  onToast,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<MarketplaceReport['reason']>('scam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!listing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim() || details.trim().length < 5) {
      setErrorMsg('Please describe the issue in at least 5 characters.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const reporterId = user?.id || 'guest-reporter-01';
      await marketplaceService.reportListing(listing.id, reporterId, reason, details);
      onToast?.('Report submitted. Our moderation team will review it within 24 hours.');
      onSuccess?.();
      onOpenChange(false);
      setDetails('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
            <Flag className="w-4 h-4" />
            Community Moderation
          </div>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Report Listing
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Help keep AgriConnect marketplace safe and trustworthy for all farmers.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Reason Radio Options */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-2">
              Select Reason *
            </label>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    reason === r.id
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 font-semibold text-foreground'
                      : 'border-border hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="font-bold text-foreground">{r.label}</div>
                    <div className="text-xs text-muted-foreground leading-tight">{r.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Provide Specific Details *
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explain why this listing violates community standards or seems deceptive..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl inline-flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4" />
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
