import React, { useState, useEffect } from 'react';
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
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Truck,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  MarketplaceListing,
  CreateBookingInput,
  formatPriceWithUnit,
  calculateBookingPriceBreakdown,
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
  const [startTime, setStartTime] = useState('08:00');
  const [duration, setDuration] = useState('1');
  const [quantity, setQuantity] = useState('1');
  const [farmLocation, setFarmLocation] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [deliveryRequired, setDeliveryRequired] = useState(false);
  const [operatorRequired, setOperatorRequired] = useState(false);
  const [customerMessage, setCustomerMessage] = useState('');

  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (listing?.location) {
      const locStr = [listing.location.village, listing.location.district, listing.location.state]
        .filter(Boolean)
        .join(', ');
      setFarmLocation(locStr);
    }
  }, [listing]);

  if (!listing) return null;

  const unit = listing.price_unit;
  const isHourly = unit === 'per_hour';
  const isDaily = unit === 'per_day';
  const isAcre = unit === 'per_acre';
  const isTrip = unit === 'per_trip';

  const durationNum = Math.max(1, Number(duration) || 1);
  const quantityNum = Math.max(1, Number(quantity) || 1);

  // Dynamic price calculation
  const pricing = calculateBookingPriceBreakdown(
    listing,
    durationNum,
    quantityNum,
    deliveryRequired,
    operatorRequired
  );

  // Perform availability conflict check whenever dates/times change
  useEffect(() => {
    if (!open || !listing || !startDate) return;

    const checkConflict = async () => {
      setCheckingConflict(true);
      setConflictError(null);

      try {
        const startObj = new Date(startDate);
        if (startTime) {
          const [hh, mm] = startTime.split(':');
          startObj.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
        } else {
          startObj.setHours(8, 0, 0, 0);
        }

        const endObj = endDate ? new Date(endDate) : new Date(startObj);
        if (!endDate) {
          if (isHourly) {
            endObj.setHours(startObj.getHours() + durationNum);
          } else {
            endObj.setDate(startObj.getDate() + durationNum);
          }
        }

        const res = await marketplaceService.checkBookingConflict(
          listing.id,
          startObj.toISOString(),
          endObj.toISOString()
        );

        if (res.conflict) {
          setConflictError(
            'This equipment or service is already booked for part of your selected period.'
          );
        }
      } catch (e) {
        console.warn('Conflict check error:', e);
      } finally {
        setCheckingConflict(false);
      }
    };

    checkConflict();
  }, [open, listing, startDate, endDate, startTime, durationNum, isHourly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      setErrorMsg('Please select a valid start date.');
      return;
    }
    if (!farmLocation.trim()) {
      setErrorMsg('Please enter your farm / delivery location.');
      return;
    }
    if (conflictError) {
      setErrorMsg('Please choose another date or time slot. Selected slot is already booked.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const requesterId = user?.id || 'farmer-user-01';
      const requesterName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Local Farmer';
      const requesterPhone = user?.phone || user?.user_metadata?.phone || '9876543210';

      const durationUnitMap: Record<string, 'hour' | 'day' | 'acre' | 'trip' | 'fixed'> = {
        per_hour: 'hour',
        per_day: 'day',
        per_acre: 'acre',
        per_trip: 'trip',
      };

      const input: CreateBookingInput = {
        listing_id: listing.id,
        start_date: startDate,
        end_date: endDate || undefined,
        start_time: startTime || undefined,
        duration: durationNum,
        duration_unit: durationUnitMap[unit] || 'day',
        quantity: quantityNum,
        farm_location: farmLocation.trim(),
        pickup_location: isTrip ? pickupLocation.trim() : undefined,
        destination_location: isTrip ? destinationLocation.trim() : undefined,
        delivery_required: deliveryRequired,
        operator_required: operatorRequired,
        customer_message: customerMessage.trim() || undefined,
      };

      await marketplaceService.createBooking(input, {
        id: requesterId,
        name: requesterName,
        phone: requesterPhone,
      });

      onToast?.(`Booking request submitted to ${listing.owner.name}! Status: PENDING`);
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFormTitle = () => {
    switch (listing.listing_type) {
      case 'labour':
        return `Hire / Request Service: ${listing.title}`;
      case 'service':
        return `Request Service: ${listing.title}`;
      case 'cattle':
        return `Inquire / Book: ${listing.title}`;
      default:
        return `Request Rental: ${listing.title}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Direct Database Booking Engine
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {getFormTitle()}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Owner: <strong>{listing.owner.name}</strong> · Rate: {formatPriceWithUnit(listing.price, listing.price_unit)}
          </DialogDescription>
        </DialogHeader>

        {conflictError && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
            <span>{conflictError}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Dynamic Pricing Model Inputs */}
          {isHourly && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Start Date *
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
                  Start Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Number of Hours *
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>
            </div>
          )}

          {isDaily && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Start Date *
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
                  Number of Days *
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>
            </div>
          )}

          {isAcre && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Scheduled Work Date *
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
                  Total Acres *
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>
            </div>
          )}

          {isTrip && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Trip Date & Time *
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
                    Number of Trips *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Pickup Location *
                  </label>
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="e.g. Rampura Farm Gate"
                    className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Destination *
                  </label>
                  <input
                    type="text"
                    value={destinationLocation}
                    onChange={(e) => setDestinationLocation(e.target.value)}
                    placeholder="e.g. Mandi Grain Yard Kota"
                    className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                  />
                </div>
              </div>
            </div>
          )}

          {!isHourly && !isDaily && !isAcre && !isTrip && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Required Date *
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
                  Quantity / Duration *
                </label>
                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
                />
              </div>
            </div>
          )}

          {/* Delivery & Operator Options for Machinery */}
          {listing.listing_type === 'machinery' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {listing.machinery_details?.delivery_available && (
                <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deliveryRequired}
                    onChange={(e) => setDeliveryRequired(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-foreground flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Delivery Required</span>
                    </div>
                    <div className="text-muted-foreground">+₹{listing.machinery_details?.delivery_charges || 0} charge</div>
                  </div>
                </label>
              )}

              {listing.machinery_details?.operator_included !== undefined && (
                <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card cursor-pointer">
                  <input
                    type="checkbox"
                    checked={operatorRequired}
                    onChange={(e) => setOperatorRequired(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-foreground flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Operator Required</span>
                    </div>
                    <div className="text-muted-foreground">+₹{listing.machinery_details?.operator_charges || 0}/unit</div>
                  </div>
                </label>
              )}
            </div>
          )}

          {/* Location Address */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Farm / Work Location Address *
            </label>
            <input
              type="text"
              value={farmLocation}
              onChange={(e) => setFarmLocation(e.target.value)}
              placeholder="e.g. Village Rampura, Survey No. 42, Canal Road"
              className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
            />
          </div>

          {/* Customer Message / Instructions */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Customer Instructions / Field Details (Optional)
            </label>
            <textarea
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              placeholder="Specify soil condition, crop type, exact field gate entry, or special requests..."
              rows={2}
              className="w-full px-3 py-2 text-xs bg-muted/60 border border-border rounded-xl text-foreground"
            />
          </div>

          {/* Live Automatic Server Calculation Breakdown */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2 text-xs">
            <div className="font-extrabold text-foreground border-b border-emerald-500/20 pb-1.5 flex items-center justify-between">
              <span>Automatic Price Breakdown</span>
              <span className="text-emerald-700 dark:text-emerald-300 font-normal">
                {checkingConflict ? 'Checking availability…' : 'Server Validated'}
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span>Base Rental ({formatPriceWithUnit(listing.price, listing.price_unit)} × {durationNum}):</span>
              <span className="font-bold text-foreground">₹{pricing.rental_amount.toLocaleString('en-IN')}</span>
            </div>

            {pricing.delivery_amount > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Delivery Charge:</span>
                <span className="font-bold text-foreground">₹{pricing.delivery_amount.toLocaleString('en-IN')}</span>
              </div>
            )}

            {pricing.operator_amount > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Operator Charge:</span>
                <span className="font-bold text-foreground">₹{pricing.operator_amount.toLocaleString('en-IN')}</span>
              </div>
            )}

            {pricing.security_deposit > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Security Deposit (Refundable):</span>
                <span className="font-bold text-foreground">₹{pricing.security_deposit.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between text-sm font-extrabold text-emerald-800 dark:text-emerald-200">
              <span>Estimated Total:</span>
              <span className="text-base">₹{pricing.total_amount.toLocaleString('en-IN')}</span>
            </div>
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
              disabled={submitting || checkingConflict || !!conflictError}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl inline-flex items-center gap-2 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Database…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Booking Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
