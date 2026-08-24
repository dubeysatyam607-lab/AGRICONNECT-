import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
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

  // ── Optimistic realtime: new signups appear instantly ─────────────────────
  const [optimisticUsers, setOptimisticUsers] = useState<ProfileRow[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase
      .channel('farmers-optimistic')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        async (payload) => {
          const newRow = payload.new as ProfileRow;
          // Skip if already in the real rows (will be caught by useSupabaseCollection)
          const id = String(newRow.id);
          if (seenIdsRef.current.has(id)) return;
          // Fetch full profile for the new row
          const { data: full } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          if (full) {
            seenIdsRef.current.add(id);
            setOptimisticUsers((prev) => [full, ...prev]);
          }
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  // Merge real rows with optimistic rows, deduplicate, mark optimistic ones
  const rows = useMemo(() => {
    const realIds = new Set(rawProfiles.map((p) => String(p.id)));
    // Remove optimistic entries once real data arrives
    const stillOptimistic = optimisticUsers.filter((u) => !realIds.has(String(u.id)));
    const all = [...stillOptimistic, ...rawProfiles];
    return all.map(mapProfileToFarmer);
  }, [rawProfiles, optimisticUsers]);

  const bulkActions: BulkAction<FarmerEntity>[] = [
    { label: 'Activate', variant: 'default', onClick: () => refresh() },
    { label: 'Refresh', variant: 'secondary', onClick: () => refresh() },
    { label: 'Export', variant: 'outline', onClick: (items) => { logAdminExport('Farmer', items.length); refresh(); } },
  ];

  const optimisticCount = optimisticUsers.filter(
    (u) => !rawProfiles.some((p) => String(p.id) === String(u.id)),
  ).length;

  return (
    <div className="space-y-4">
      {optimisticCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 animate-pulse">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {optimisticCount} new farmer{optimisticCount > 1 ? 's' : ''} signed up — syncing…
        </div>
      )}
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
