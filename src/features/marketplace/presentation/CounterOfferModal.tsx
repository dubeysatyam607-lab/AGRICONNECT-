import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RotateCcw, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { MarketplaceBooking, CounterOfferInput } from '../domain/marketplaceTypes';
import { marketplaceService } from '../domain/marketplaceService';
import { useAuth } from '@/hooks/useAuth';

interface CounterOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: MarketplaceBooking | null;
  onSuccess?: () => void;
  onToast?: (msg: string) => void;
}

export const CounterOfferModal: React.FC<CounterOfferModalProps> = ({
  open,
  onOpenChange,
  booking,
  onSuccess,
  onToast,
}) => {
  const { user } = useAuth();
  const [counterAmount, setCounterAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(counterAmount);
    if (!amountNum || amountNum <= 0) {
      setErrorMsg('Please enter a valid counter offer amount.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const userId = user?.id || 'owner-01';
      const input: CounterOfferInput = {
        booking_id: booking.id,
        counter_offer_amount: amountNum,
        counter_offer_notes: notes.trim() || undefined,
      };

      await marketplaceService.createCounterOffer(input, userId);
      onToast?.(`Counter offer of ₹${amountNum.toLocaleString('en-IN')} sent to ${booking.customer_name}!`);
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send counter offer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
            <RotateCcw className="w-4 h-4" />
            Negotiate Booking Request
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground">
            Propose Counter Offer
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Listing: <strong>{booking.listing_title}</strong> · Requested Rate Total: ₹{booking.total_amount.toLocaleString('en-IN')}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
          <div>
            <label className="font-bold text-foreground block mb-1">
              Your Counter Offer Total Amount (₹) *
            </label>
            <input
              type="number"
              min="1"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              placeholder={`e.g. ${booking.total_amount}`}
              className="w-full px-3 py-2.5 bg-muted/60 border border-border rounded-xl font-bold text-foreground"
            />
            <div className="text-[11px] text-muted-foreground mt-1">
              Note: The original listing price will remain unchanged for other users.
            </div>
          </div>

          <div>
            <label className="font-bold text-foreground block mb-1">
              Counter Offer Conditions / Terms (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Includes extra operator hours, diesel included, or revised timing..."
              rows={3}
              className="w-full px-3 py-2 bg-muted/60 border border-border rounded-xl text-foreground"
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 font-semibold text-muted-foreground hover:bg-muted rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl inline-flex items-center gap-2 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Counter…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Send Counter Offer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
