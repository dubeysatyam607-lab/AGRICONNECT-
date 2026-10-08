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
  Clock,
  MapPin,
  IndianRupee,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Truck,
  UserCheck,
  ShieldCheck,
  MessageSquare,
  Star,
  Flag,
  RotateCcw,
  PlayCircle,
  FileText,
} from 'lucide-react';
import {
  MarketplaceBooking,
  BookingStatus,
  BookingEventLog,
  formatPriceWithUnit,
} from '../domain/marketplaceTypes';
import { marketplaceService } from '../domain/marketplaceService';
import { useAuth } from '@/hooks/useAuth';

interface BookingDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: MarketplaceBooking | null;
  onSuccess?: () => void;
  onToast?: (msg: string) => void;
  onOpenCounterOffer?: (booking: MarketplaceBooking) => void;
  onOpenReview?: (booking: MarketplaceBooking) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  open,
  onOpenChange,
  booking,
  onSuccess,
  onToast,
  onOpenCounterOffer,
  onOpenReview,
}) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<BookingEventLog[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [rejectReasonModal, setRejectReasonModal] = useState(false);
  const [cancelReasonModal, setCancelReasonModal] = useState(false);
  const [disputeModal, setDisputeModal] = useState(false);

  const [reasonInput, setReasonInput] = useState('');
  const [disputeReason, setDisputeReason] = useState('Service not delivered');
  const [disputeDetails, setDisputeDetails] = useState('');

  useEffect(() => {
    if (open && booking) {
      setLoadingEvents(true);
      marketplaceService
        .getBookingEvents(booking.id)
        .then((evts) => setEvents(evts))
        .finally(() => setLoadingEvents(false));
    }
  }, [open, booking]);

  if (!booking) return null;

  const isOwner = booking.owner_id === user?.id;
  const isCustomer = booking.customer_id === user?.id;

  const handleUpdateStatus = async (newStatus: BookingStatus, reason?: string) => {
    setActionLoading(true);
    try {
      const userId = user?.id || 'user-01';
      await marketplaceService.updateBookingStatus(booking.id, newStatus, userId, reason);
      onToast?.(`Booking status updated to ${newStatus}`);
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      onToast?.(e.message || 'Failed to update booking status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeDetails.trim()) return;
    setActionLoading(true);
    try {
      const userId = user?.id || 'user-01';
      await marketplaceService.reportBookingDispute(
        booking.id,
        userId,
        disputeReason,
        disputeDetails.trim()
      );
      onToast?.('Dispute logged successfully. Our team will review the details.');
      setDisputeModal(false);
      setDisputeDetails('');
    } catch (e: any) {
      onToast?.(e.message || 'Failed to report dispute');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeColor = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
      case 'ACCEPTED':
        return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'ACTIVE':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'COMPLETED':
        return 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
      case 'COUNTER_OFFERED':
        return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30';
      case 'PENDING':
      default:
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Verified Booking Record #{booking.id.slice(0, 8)}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusBadgeColor(
                booking.status
              )}`}
            >
              {booking.status}
            </span>
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground pt-1">
            {booking.listing_title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Created: {new Date(booking.created_at).toLocaleString('en-IN')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* Parties & Contact Info Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-card">
            <div className="space-y-1">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Customer</span>
              <div className="font-bold text-foreground text-sm">{booking.customer_name}</div>
              <div className="text-muted-foreground">Phone: {booking.customer_phone}</div>
            </div>

            <div className="space-y-1 sm:border-l sm:border-border sm:pl-3">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Owner / Provider</span>
              <div className="font-bold text-foreground text-sm">{booking.owner_name}</div>
              <div className="text-muted-foreground">Phone: {booking.owner_phone}</div>
            </div>
          </div>

          {/* Schedule & Location */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Rental Schedule & Duration</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted-foreground">
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Start</span>
                <span className="font-bold text-foreground">{new Date(booking.start_at).toLocaleDateString('en-IN')}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">End</span>
                <span className="font-bold text-foreground">{new Date(booking.end_at).toLocaleDateString('en-IN')}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Duration</span>
                <span className="font-bold text-foreground">{booking.duration} {booking.duration_unit}(s)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground">Farm / Delivery Address:</span> {booking.farm_location}
              </div>
            </div>

            {booking.pickup_location && (
              <div className="text-muted-foreground pl-5.5">
                <strong>Pickup:</strong> {booking.pickup_location} → <strong>Destination:</strong> {booking.destination_location}
              </div>
            )}
          </div>

          {/* Charges & Pricing Breakdown */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
            <div className="font-extrabold text-foreground flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
              <span>Financial Breakdown</span>
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">Verified Amount</span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span>Base Rental ({booking.duration} {booking.duration_unit}):</span>
              <span className="font-bold text-foreground">₹{booking.rental_amount.toLocaleString('en-IN')}</span>
            </div>

            {booking.delivery_required && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-emerald-600" /> Delivery Charge:</span>
                <span className="font-bold text-foreground">₹{booking.delivery_amount.toLocaleString('en-IN')}</span>
              </div>
            )}

            {booking.operator_required && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Operator Charge:</span>
                <span className="font-bold text-foreground">₹{booking.operator_amount.toLocaleString('en-IN')}</span>
              </div>
            )}

            {booking.security_deposit > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Security Deposit:</span>
                <span className="font-bold text-foreground">₹{booking.security_deposit.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between text-sm font-extrabold text-emerald-800 dark:text-emerald-200">
              <span>Total Payable:</span>
              <span className="text-base">₹{booking.total_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment Proof & Verification Details */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <div className="font-extrabold text-foreground flex items-center justify-between border-b border-border pb-1.5 text-xs">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Payment Verification & Proof Status
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                booking.payment_status === 'PAYMENT_VERIFIED' || booking.status === 'CONFIRMED'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : booking.payment_status === 'PAYMENT_PROOF_SUBMITTED' || booking.payment_status === 'PAYMENT_UNDER_REVIEW'
                  ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                  : booking.payment_status === 'COD_SELECTED'
                  ? 'bg-sky-500/20 text-sky-800 dark:text-sky-300'
                  : 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
              }`}>
                {booking.payment_status === 'PAYMENT_PROOF_SUBMITTED' || booking.payment_status === 'PAYMENT_UNDER_REVIEW'
                  ? 'Payment Under Review'
                  : booking.payment_status === 'PAYMENT_VERIFIED' || booking.status === 'CONFIRMED'
                  ? 'Payment Verified'
                  : booking.payment_status === 'COD_SELECTED'
                  ? 'Cash on Delivery (COD)'
                  : 'Payment Pending'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 text-xs">
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Locked Payment Amount</span>
                <span className="font-extrabold text-foreground text-sm">₹{booking.total_amount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">UTR / Transaction Reference</span>
                <span className="font-mono font-bold text-foreground">{booking.utr || 'Not Submitted'}</span>
              </div>
            </div>

            {booking.proof_storage_path && (
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Payment Screenshot Proof:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Uploaded & Saved in Secure Storage
                </span>
              </div>
            )}
          </div>

          {/* Counter Offer Box if Present */}
          {booking.status === 'COUNTER_OFFERED' && (
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/30 space-y-2">
              <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                <span>Owner Counter Offer Received</span>
              </div>
              <div className="text-muted-foreground">
                Proposed Counter Amount: <strong className="text-foreground text-sm">₹{booking.counter_offer_amount?.toLocaleString('en-IN')}</strong>
              </div>
              {booking.counter_offer_notes && (
                <div className="text-xs italic bg-amber-100/50 dark:bg-amber-900/30 p-2 rounded text-amber-900 dark:text-amber-200">
                  "{booking.counter_offer_notes}"
                </div>
              )}
            </div>
          )}

          {/* Auditable Timeline History */}
          <div className="space-y-2">
            <span className="font-bold text-foreground block">Auditable Lifecycle Timeline</span>
            {loadingEvents ? (
              <div className="py-4 text-center text-muted-foreground">Loading history…</div>
            ) : (
              <div className="space-y-1.5 border-l-2 border-emerald-500/40 pl-3 py-1">
                {events.map((evt) => (
                  <div key={evt.id} className="text-[11px] text-muted-foreground">
                    <span className="font-bold text-foreground">{evt.event_type.replace(/_/g, ' ')}</span> ·{' '}
                    <span>{new Date(evt.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    {evt.notes && <div className="text-foreground italic">{evt.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons Bar based on Status and User Role */}
          <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {['ACTIVE', 'COMPLETED'].includes(booking.status) && (
                <button
                  type="button"
                  onClick={() => setDisputeModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-300 text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Problem</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Owner Actions for PENDING */}
              {booking.status === 'PENDING' && isOwner && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('ACCEPTED')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Request</span>
                  </button>

                  {onOpenCounterOffer && (
                    <button
                      disabled={actionLoading}
                      onClick={() => {
                        onOpenChange(false);
                        onOpenCounterOffer(booking);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Counter Offer</span>
                    </button>
                  )}

                  <button
                    disabled={actionLoading}
                    onClick={() => setRejectReasonModal(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-300 text-rose-600 hover:bg-rose-50"
                  >
                    Reject
                  </button>
                </>
              )}

              {/* Customer Actions for COUNTER_OFFERED */}
              {booking.status === 'COUNTER_OFFERED' && isCustomer && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('ACCEPTED', 'Accepted owner counter offer')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Counter Offer</span>
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => setCancelReasonModal(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-300 text-rose-600 hover:bg-rose-50"
                  >
                    Decline
                  </button>
                </>
              )}

              {/* Transition ACCEPTED -> CONFIRMED */}
              {booking.status === 'ACCEPTED' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('CONFIRMED')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Booking</span>
                </button>
              )}

              {/* Transition CONFIRMED -> ACTIVE */}
              {booking.status === 'CONFIRMED' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('ACTIVE')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-sm"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Start Rental</span>
                </button>
              )}

              {/* Transition ACTIVE -> COMPLETED */}
              {booking.status === 'ACTIVE' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Completed</span>
                </button>
              )}

              {/* Customer Review after Completion */}
              {booking.status === 'COMPLETED' && isCustomer && onOpenReview && (
                <button
                  onClick={() => {
                    onOpenChange(false);
                    onOpenReview(booking);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-sm"
                >
                  <Star className="w-4 h-4 fill-current" />
                  <span>Write Review</span>
                </button>
              )}

              {/* Cancel Button if eligible */}
              {['PENDING', 'ACCEPTED', 'CONFIRMED'].includes(booking.status) && (
                <button
                  disabled={actionLoading}
                  onClick={() => setCancelReasonModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reject Reason Prompt */}
        {rejectReasonModal && (
          <div className="p-4 mt-3 rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/30 space-y-3">
            <h4 className="font-bold text-rose-800 dark:text-rose-300">Reason for Rejection</h4>
            <input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="e.g. Equipment scheduled for maintenance or field conflict"
              className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-card"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectReasonModal(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-lg"
              >
                Back
              </button>
              <button
                onClick={() => handleUpdateStatus('REJECTED', reasonInput)}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        )}

        {/* Cancel Reason Prompt */}
        {cancelReasonModal && (
          <div className="p-4 mt-3 rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/30 space-y-3">
            <h4 className="font-bold text-rose-800 dark:text-rose-300">Cancellation Reason</h4>
            <input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="e.g. Rain/weather change or required dates changed"
              className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-card"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelReasonModal(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-lg"
              >
                Back
              </button>
              <button
                onClick={() => handleUpdateStatus('CANCELLED', reasonInput)}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        )}

        {/* Report Dispute Modal */}
        {disputeModal && (
          <form onSubmit={handleSubmitDispute} className="p-4 mt-3 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/30 space-y-3">
            <h4 className="font-bold text-amber-800 dark:text-amber-300">Report a Problem / Dispute</h4>
            <select
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-card font-bold"
            >
              <option value="Asset not provided">Asset not provided</option>
              <option value="Wrong equipment">Wrong equipment delivered</option>
              <option value="Service not delivered">Service not delivered</option>
              <option value="Incorrect charges">Incorrect charges demanded</option>
              <option value="Equipment damage dispute">Equipment damage dispute</option>
              <option value="Other">Other issue</option>
            </select>
            <textarea
              value={disputeDetails}
              onChange={(e) => setDisputeDetails(e.target.value)}
              placeholder="Describe the issue clearly..."
              rows={2}
              className="w-full px-3 py-2 text-xs border border-border rounded-xl bg-card"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisputeModal(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                Submit Dispute
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
