import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, FileText, IndianRupee, Star, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolate } from '@/i18n/journey';
import { cn } from '@/lib/utils';
import type { Booking, BookingStatus } from '../../domain/networkTypes';

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  accepted: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
};

interface BookingsViewProps {
  bookings: Booking[];
  onStatus: (id: string, status: BookingStatus) => void;
  onReview: (providerId: string, providerName: string) => void;
  onToast?: (message: string) => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ bookings, onStatus, onReview, onToast }) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');

  const list = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="mt-4">
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(['all', 'pending', 'accepted', 'completed', 'cancelled'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
              filter === k ? 'bg-forest text-primary-foreground' : 'border border-border bg-card text-muted-foreground',
            )}
          >
            {t(`fnet.status.${k}`)}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {list.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
            <CalendarDays size={30} className="mb-2 text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">{t('fnet.empty.title')}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">{t('fnet.empty.bookings')}</p>
          </div>
        ) : (
          list.map((booking) => (
            <article key={booking.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-foreground">{booking.service}</h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{booking.providerName}</p>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-black', STATUS_STYLE[booking.status])}>
                  {t(`fnet.status.${booking.status}`)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5">
                  <CalendarDays size={10} className="text-forest" />
                  {booking.date}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-forest">
                  <IndianRupee size={10} />
                  {booking.amount}
                </span>
              </div>

              {/* Invoice */}
              {booking.invoice && (
                <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-[11px] font-black text-foreground">
                      <FileText size={12} className="text-forest" />
                      {booking.invoice.id}
                    </p>
                    <span className="text-[10px] font-semibold text-muted-foreground">{new Date(booking.invoice.issuedAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {booking.invoice.items.map((item, i) => (
                      <li key={i} className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>{item.label}</span>
                        <span>{item.amount}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between border-t border-border pt-2 text-xs font-black text-foreground">
                    <span>{t('fnet.booking.total')}</span>
                    <span>{booking.invoice.total}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3.5 flex flex-wrap gap-2">
                {booking.status === 'pending' && (
                  <>
                    <button
                      onClick={() => { onStatus(booking.id, 'accepted'); onToast?.(t('fnet.toast.bookingAccepted')); }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 dark:bg-emerald-600"
                    >
                      <CheckCircle2 size={13} />
                      {t('fnet.booking.accept')}
                    </button>
                    <button
                      onClick={() => { onStatus(booking.id, 'cancelled'); onToast?.(t('fnet.toast.bookingCancelled')); }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-rose-500"
                    >
                      <XCircle size={13} />
                      {t('fnet.booking.cancel')}
                    </button>
                  </>
                )}
                {booking.status === 'accepted' && (
                  <button
                    onClick={() => { onStatus(booking.id, 'completed'); onToast?.(t('fnet.toast.bookingCompleted')); }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 dark:bg-emerald-600"
                  >
                    <CheckCircle2 size={13} />
                    {t('fnet.booking.complete')}
                  </button>
                )}
                {booking.status === 'completed' && (
                  <button
                    onClick={() => { onReview(booking.providerId, booking.providerName); onToast?.(interpolate(t('fnet.toast.reviewPrompt'), { name: booking.providerName })); }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-amber-500"
                  >
                    <Star size={13} />
                    {t('fnet.booking.review')}
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
