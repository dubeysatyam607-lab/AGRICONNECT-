import React from 'react';
import { Package, Receipt, Truck, CalendarCheck2, CheckCircle2, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmptyState } from '@/components/ui/error-state';
import type { UseDigitalProfileReturn } from '../types';

interface BookingsSectionProps {
  data: UseDigitalProfileReturn;
}

const DEMO_ORDERS = [
  { id: 'A-1142', title: 'Urea 45kg + DAP 50kg', total: 1890, date: '3 days ago', status: 'delivered' },
  { id: 'A-1138', title: 'Knapsack Sprayer 16L', total: 2450, date: '1 week ago', status: 'delivered' },
  { id: 'A-1167', title: 'Mustard Seeds (Pusa Vijay)', total: 760, date: 'Today', status: 'placed' },
];

export const BookingsSection: React.FC<BookingsSectionProps> = ({ data }) => {
  const { t } = useLanguage();

  const statusLabel = (status: string): string => {
    const key = status.toLowerCase();
    if (key.includes('active') || key.includes('confirm')) return t('prof.bkActive');
    if (key.includes('done') || key.includes('complet') || key.includes('deliver')) return t('prof.bkCompleted');
    if (key.includes('cancel')) return t('prof.bkCancelled');
    return key;
  };

  const empty = data.activeBookings.length === 0 && data.pastRentals.length === 0;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{t('prof.bookings')}</h2>
      </div>

      {/* Current bookings */}
      <section>
        <h3 className="mb-2.5 text-sm font-extrabold text-foreground flex items-center gap-2">
          <CalendarCheck2 size={16} className="text-primary" /> {t('prof.currentBookings')}
        </h3>
        {data.activeBookings.length === 0 ? (
          <EmptyState
            compact
            emoji="📅"
            title={t('prof.noBookings')}
            description={t('prof.noBookingsHint')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.activeBookings.map((b) => (
              <div key={b.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-foreground truncate">{b.tractorName}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={10} /> {statusLabel(b.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">₹{b.total.toLocaleString('en-IN')} · {b.createdAt}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past rentals */}
      <section>
        <h3 className="mb-2.5 text-sm font-extrabold text-foreground flex items-center gap-2">
          <Truck size={16} className="text-sky-600" /> {t('prof.pastRentals')}
        </h3>
        {data.pastRentals.length === 0 ? (
          <EmptyState compact emoji="🚜" title={t('prof.noPastRentals')} description={t('prof.noBookingsHint')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.pastRentals.slice(0, 4).map((b) => (
              <div key={b.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <p className="text-sm font-extrabold text-foreground truncate">{b.tractorName}</p>
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={11} /> {b.createdAt} · <span className="font-bold text-muted-foreground">{statusLabel(b.status)}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Marketplace orders */}
      <section>
        <h3 className="mb-2.5 text-sm font-extrabold text-foreground flex items-center gap-2">
          <Package size={16} className="text-orange-600" /> {t('prof.marketOrders')}
        </h3>
        <div className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border/60">
          {DEMO_ORDERS.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{o.title}</p>
                <p className="text-[11px] text-muted-foreground">{o.id} · {o.date}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-extrabold text-foreground tabular-nums">₹{o.total.toLocaleString('en-IN')}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${o.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                  {o.status === 'delivered' ? t('prof.bkCompleted') : t('prof.bkPlaced')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Payment history / invoices */}
      <section>
        <h3 className="mb-2.5 text-sm font-extrabold text-foreground flex items-center gap-2">
          <Receipt size={16} className="text-violet-600" /> {t('prof.paymentHistory')}
        </h3>
        {data.invoices.length === 0 ? (
          <EmptyState compact emoji="🧾" title={t('prof.noInvoices')} description={t('prof.noBookingsHint')} />
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-card divide-y divide-border/60">
            {data.invoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => data.toggleInvoice(inv.id)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{inv.title}</p>
                  <p className="text-[11px] text-muted-foreground">{inv.date}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-extrabold text-foreground tabular-nums">₹{inv.amount.toLocaleString('en-IN')}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${inv.paid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                    {inv.paid ? t('prof.bkPaid') : t('prof.bkPending')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {empty && (
        <EmptyState
          emoji="📦"
          title={t('prof.noBookings')}
          description={t('prof.noBookingsHint')}
        />
      )}
    </div>
  );
};
