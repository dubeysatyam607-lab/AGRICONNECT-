import { useState, useMemo } from 'react';
import { Plus, UserCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { EntityDialog } from '../components/EntityDialog';
import type { FormField } from '../components/EntityDialog';
import { AdminStatusBadge } from '../components/StatusBadge';
import { FarmerDetailDrawer } from '../components/FarmerDetailDrawer';
import { logAdminExport } from '../hooks/useAdminCrud';
import { useSupabaseCollection } from '../hooks/useSupabaseCollection';
import { fmtNumber, shortDate } from '../../domain/adminStore';
import type { FarmerEntity } from '../../domain/adminTypes';

type ProfileRow = Record<string, unknown>;

function mapProfileToFarmer(p: ProfileRow, idx: number): FarmerEntity {
  return {
    id: String(p.id ?? `prof-${idx}`),
    name: String(p.full_name ?? p.name ?? p.email ?? `Farmer #${idx + 1}`),
    phone: String(p.phone ?? p.mobile ?? '—'),
    village: String(p.village ?? p.city ?? p.location ?? ''),
    district: String(p.district ?? ''),
    state: String(p.state ?? ''),
    landSize: Number(p.land_size ?? p.landSize ?? 0),
    unit: String(p.land_unit ?? p.unit ?? 'ha'),
    primaryCrop: String(p.primary_crop ?? p.crop ?? '—'),
    joined: String(p.created_at ?? new Date().toISOString()),
    status: (p.status as FarmerEntity['status']) ?? 'Active',
    verification: (p.verified || p.kyc_status === 'verified') ? 'Verified' : 'Unverified',
    orders: Number(p.order_count ?? p.orders ?? 0),
    rating: Number(p.rating ?? 0),
  };
}

const COLUMNS: DataColumn<FarmerEntity>[] = [
  { key: 'name', header: 'Farmer', render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.phone}</p>
      </div>
    ) },
  { key: 'village', header: 'Location', render: (r) => (
      <div>
        <p className="text-foreground">{r.village || '—'}</p>
        <p className="text-xs text-muted-foreground">{[r.district, r.state].filter(Boolean).join(', ') || '—'}</p>
      </div>
    ) },
  { key: 'landSize', header: 'Land', align: 'right', sortValue: (r) => r.landSize, render: (r) => r.landSize ? <span>{r.landSize} {r.unit}</span> : <span className="text-muted-foreground">—</span> },
  { key: 'primaryCrop', header: 'Primary Crop' },
  { key: 'orders', header: 'Orders', align: 'right', sortValue: (r) => r.orders, render: (r) => <span>{fmtNumber(r.orders)}</span> },
  { key: 'rating', header: 'Rating', align: 'right', sortValue: (r) => r.rating, render: (r) => <span>{r.rating || '—'}</span> },
  { key: 'verification', header: 'Verification', render: (r) => <AdminStatusBadge status={r.verification} /> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status} /> },
  { key: 'joined', header: 'Joined', render: (r) => <span className="text-muted-foreground">{shortDate(r.joined)}</span> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Active', 'Suspended', 'Pending'].map((v) => ({ value: v, label: v })) },
  { key: 'verification', label: 'Verification', options: ['Verified', 'Unverified'].map((v) => ({ value: v, label: v })) },
];

const FIELDS: FormField[] = [
  { name: 'name', label: 'Full Name', type: 'text', required: true, full: true },
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'village', label: 'Village', type: 'text' },
  { name: 'district', label: 'District', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'landSize', label: 'Land Size', type: 'number' },
  { name: 'unit', label: 'Unit (ha/acre)', type: 'select', options: [{ value: 'ha', label: 'ha' }, { value: 'acre', label: 'acre' }] },
  { name: 'primaryCrop', label: 'Primary Crop', type: 'text' },
  { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Suspended', 'Pending'].map((v) => ({ value: v, label: v })) },
];

export function FarmersModule() {
  const { rows: rawProfiles, loading, refresh } = useSupabaseCollection<ProfileRow>('profiles', {
    select: '*',
    order: { column: 'created_at', ascending: false },
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FarmerEntity | null>(null);

  const rows = useMemo(() => rawProfiles.map(mapProfileToFarmer), [rawProfiles]);

  const bulkActions: BulkAction<FarmerEntity>[] = [
    { label: 'Activate', variant: 'default', onClick: () => refresh() },
    { label: 'Refresh', variant: 'secondary', onClick: () => refresh() },
    { label: 'Export', variant: 'outline', onClick: (items) => { logAdminExport('Farmer', items.length); refresh(); } },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Farmer Management"
        subtitle={loading ? 'Loading real farmer data from Supabase…' : `${fmtNumber(rows.length)} registered farmers from profiles table`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refresh()}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['name', 'phone', 'village', 'district', 'state', 'primaryCrop']}
        searchPlaceholder="Search name, village, crop…"
        filters={FILTERS}
        bulkActions={bulkActions}
        exportName="farmers"
        onExport={(c) => logAdminExport('Farmer', c)}
        onEdit={(r) => { setEditing(r); setOpen(true); }}
        onDelete={() => refresh()}
      />
      <FarmerDetailDrawer
        farmer={editing}
        open={open}
        onOpenChange={setOpen}
        onRefresh={() => refresh()}
      />
      {rows.filter((r) => r.status === 'Pending').length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserCheck className="h-3.5 w-3.5" />
          {rows.filter((r) => r.status === 'Pending').length} farmers awaiting verification.
        </p>
      )}
      {rows.length === 0 && !loading && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No farmer profiles found in Supabase. Data will appear as farmers sign up.
        </div>
      )}
    </div>
  );
}
