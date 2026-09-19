import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Calendar,
  MapPin,
  IndianRupee,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import {
  MarketplaceListing,
  CreateBookingRequestInput,
  formatPriceWithUnit,
} from '../domain/marketplaceTypes';
import { marketplaceService } from '../domain/marketplaceService';
import { useAuth } from '@/hooks/useAuth';

interface BookingRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: MarketplaceListing | null;
  onSuccess?: () => void;
  onToast?: (msg: string) => void;
}

export const BookingRequestModal: React.FC<BookingRequestModalProps> = ({
  open,
  onOpenChange,
  listing,
  onSuccess,
  onToast,
}) => {
  const { user } = useAuth();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [unitsRequested, setUnitsRequested] = useState('1');
  const [customPrice, setCustomPrice] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!listing) return null;

  const calculatedTotal = Number(customPrice || listing.price) * Math.max(1, Number(unitsRequested) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      setErrorMsg('Please select a required start date.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter your farm / delivery address.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const requesterId = user?.id || 'guest-farmer-01';
      const requesterName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Local Farmer';
      const requesterPhone = user?.phone || user?.user_metadata?.phone || '9876543210';

      const input: CreateBookingRequestInput = {
        listing_id: listing.id,
        start_date: startDate,
        end_date: endDate || undefined,
        units_requested: Math.max(1, Number(unitsRequested) || 1),
        offered_amount: calculatedTotal,
        location_address: address.trim(),
        notes: notes.trim() || undefined,
      };

      await marketplaceService.createBookingRequest(input, {
        id: requesterId,
        name: requesterName,
        phone: requesterPhone,
      });

      onToast?.(`Booking request sent to ${listing.owner.name}! Status: Pending`);
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 rounded-xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Verified Direct Booking
          </div>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Request / Book: {listing.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Owner: <strong>{listing.owner.name}</strong> · Rate: {formatPriceWithUnit(listing.price, listing.price_unit)}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Required Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
              />
            </div>
          </div>

          {/* Units / Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Estimated Units / Hours / Acres *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={unitsRequested}
                onChange={(e) => setUnitsRequested(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Estimated Offer Total
              </label>
              <div className="px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <span>₹{calculatedTotal.toLocaleString('en-IN')}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({listing.price_unit.replace('_', ' ')})
                </span>
              </div>
            </div>
          </div>

          {/* Farm Location */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Your Farm / Delivery Address *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Village Rampura, Khasra 42 near Canal, Shivpuri"
              className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Instructions for Provider (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Specific timing, field soil condition, implement requirements, or questions..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
            />
          </div>

          {/* Buttons */}
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
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl inline-flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Request…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Send Booking Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
