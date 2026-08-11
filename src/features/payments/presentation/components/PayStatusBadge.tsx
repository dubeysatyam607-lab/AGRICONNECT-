import { cn } from '@/lib/utils';
import type { PaymentStatus } from '../../domain/paymentTypes';

const TONES: Record<PaymentStatus, string> = {
  Success: 'bg-emerald-100 text-emerald-700',
  Refunded: 'bg-sky-100 text-sky-700',
  PartialRefund: 'bg-sky-100 text-sky-700',
  Initiated: 'bg-muted text-muted-foreground',
  Processing: 'bg-amber-100 text-amber-700',
  RefundPending: 'bg-amber-100 text-amber-700',
  Failed: 'bg-red-100 text-red-700',
  Expired: 'bg-zinc-100 text-zinc-600',
};

export const PAY_STATUS_LABEL: Record<PaymentStatus, string> = {
  Success: 'Success',
  Refunded: 'Refunded',
  PartialRefund: 'Partially refunded',
  Initiated: 'Initiated',
  Processing: 'Processing',
  RefundPending: 'Refund pending',
  Failed: 'Failed',
  Expired: 'Expired',
};

export function PayStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold',
        TONES[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full bg-current', (status === 'Processing' || status === 'RefundPending') && 'animate-pulse')} />
      {PAY_STATUS_LABEL[status]}
    </span>
  );
}
