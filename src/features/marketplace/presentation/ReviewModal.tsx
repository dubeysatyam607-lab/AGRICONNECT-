import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Star, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { MarketplaceBooking } from '../domain/marketplaceTypes';
import { marketplaceService } from '../domain/marketplaceService';
import { useAuth } from '@/hooks/useAuth';

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: MarketplaceBooking | null;
  onSuccess?: () => void;
  onToast?: (msg: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  open,
  onOpenChange,
  booking,
  onSuccess,
  onToast,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const reviewerId = user?.id || 'customer-01';
      await marketplaceService.submitListingReview(
        booking.id,
        reviewerId,
        rating,
        comment.trim() || undefined
      );

      onToast?.('Thank you for your rating & review! It has been posted to the marketplace.');
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
            <Star className="w-4 h-4 fill-amber-500" />
            Verified Rental Feedback
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground">
            Rate & Review Completed Rental
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Listing: <strong>{booking.listing_title}</strong> · Provider: {booking.owner_name}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
          {/* Star Rating selector */}
          <div className="text-center space-y-2 py-2 bg-muted/40 rounded-xl border border-border">
            <label className="font-bold text-foreground block">
              Overall Experience Rating
            </label>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-emerald-600">
              {rating === 5 && 'Excellent Service'}
              {rating === 4 && 'Good Service'}
              {rating === 3 && 'Average'}
              {rating === 2 && 'Fair'}
              {rating === 1 && 'Poor'}
            </div>
          </div>

          <div>
            <label className="font-bold text-foreground block mb-1">
              Written Review (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about machine performance, operator punctuality, field quality, or experience..."
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
                  <span>Publishing Review…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
