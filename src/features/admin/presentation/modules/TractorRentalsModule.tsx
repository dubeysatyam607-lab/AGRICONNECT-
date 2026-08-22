import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { DataColumn, DataFilter } from '../components/DataTable';
import { AdminStatusBadge } from '../components/StatusBadge';
import { useSupabaseCollection } from '../hooks/useSupabaseCollection';
import { logAdminExport } from '../hooks/useAdminCrud';
import { fmtINR, shortDate } from '../../domain/adminStore';
import type { TractorRental } from '../../domain/adminTypes';

type BookingRow = Record<string, unknown>;

function mapBookingToRental(b: BookingRow, idx: number): TractorRental {
  return {
    id: String(b.id ?? `tb-${idx}`),
    farmer: String(b.farmer_name ?? b.farmer ?? b.user_name ?? `Farmer ${idx + 1}`),
    tractor: String(b.tractor_name ?? b.tractor ?? b.listing_name ?? 'Tractor'),
    owner: String(b.owner_name ?? b.owner ?? b.listing_owner ?? 'Owner'),
    rate: Number(b.rate ?? b.hourly_rate ?? 0),
    duration: String(b.duration ?? `${b.hours ?? 0} hours`),
    total: Number(b.total ?? b.total_amount ?? b.amount ?? 0),
    status: mapBookingStatus(b.status),
    booked: String(b.created_at ?? b.booking_date ?? new Date().toISOString()),
  };
}

function mapBookingStatus(s: unknown): TractorRental['status'] {
  const val = String(s ?? '').toLowerCase();
  if (val === 'confirmed') return 'Confirmed';
  if (val === 'in_progress' || val === 'in progress') return 'In Progress';
  if (val === 'completed') return 'Completed';
  if (val === 'cancelled') return 'Cancelled';
  return 'Pending';
}

const COLUMNS: DataColumn<TractorRental>[] = [
  { key: 'id', header: 'Booking', render: (r) => <span className="font-medium text-foreground">{String(r.id).slice(0, 8)}</span> },
  { key: 'farmer', header: 'Farmer' },
  { key: 'tractor', header: 'Tractor', render: (r) => (
      <div>
        <p className="text-foreground">{r.tractor}</p>
        <p className="text-xs text-muted-foreground">Owner: {r.owner}</p>
      </div>
    ) },
  { key: 'duration', header: 'Duration', className: 'hidden md:table-cell' },
  { key: 'total', header: 'Total', align: 'right', sortValue: (r) => r.total, render: (r) => <span className="font-medium">{r.total ? fmtINR(r.total) : '—'}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'booked', header: 'Booked', className: 'hidden lg:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.booked)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'].map((v) => ({ value: v, label: v })) },
];

export function TractorRentalsModule() {
  const { rows: rawBookings, loading, refresh } = useSupabaseCollection<BookingRow>('tractor_bookings', {
    select: '*',
    order: { column: 'created_at', ascending: false },
  });

  const rows = useMemo(() => rawBookings.map(mapBookingToRental), [rawBookings]);
  const inProgress = rows.filter((r) => r.status === 'In Progress').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tractor Rentals"
        subtitle={loading ? 'Loading real bookings…' : `${rows.length} bookings from tractor_bookings table · ${inProgress} in progress`}
        actions={
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['id', 'farmer', 'tractor', 'owner']}
        searchPlaceholder="Search booking, farmer, tractor…"
        filters={FILTERS}
        bulkActions={[]}
        exportName="tractor-rentals"
        onExport={(c) => logAdminExport('Tractor Rental', c)}
        onDelete={() => refresh()}
      />
      {rows.length === 0 && !loading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No tractor bookings found. Data appears as farmers book tractors.
        </div>
      )}
    </div>
  );
}
