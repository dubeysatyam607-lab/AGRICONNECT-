import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sprout, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { DataColumn, DataFilter } from '../components/DataTable';
import { AdminStatusBadge } from '../components/StatusBadge';
import { fmtINR, fmtNumber, shortDate } from '../../domain/adminStore';
import { supabase } from '@/integrations/supabase/client';
import type { FoundingFarmerConfig, FoundingFarmerRecord } from '../../domain/adminTypes';
import { logAdminExport } from '../hooks/useAdminCrud';
import { cn } from '@/lib/utils';

const FF_COLUMNS: DataColumn<FoundingFarmerRecord>[] = [
  {
    key: 'founding_farmer_number',
    header: 'FF#',
    align: 'center',
    sortValue: (r) => r.founding_farmer_number,
    render: (r) => (
      <span className="font-mono font-bold text-primary">#{r.founding_farmer_number}</span>
    ),
  },
  {
    key: 'user_name',
    header: 'User',
    render: (r) => (
      <div>
        <p className="font-medium text-foreground">{r.user_name || 'Unknown'}</p>
        <p className="text-[10px] text-muted-foreground">{r.user_id.slice(0, 8)}...</p>
      </div>
    ),
  },
  { key: 'phone', header: 'Mobile', className: 'hidden md:table-cell' },
  { key: 'location', header: 'Location', className: 'hidden lg:table-cell' },
  {
    key: 'plan',
    header: 'Plan',
    render: (r) => (
      <span className={cn(
        'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold',
        r.plan === 'pro' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600'
      )}>
        {r.plan === 'pro' ? 'Pro' : 'Plus'}
      </span>
    ),
  },
  {
    key: 'amount_paid',
    header: 'Amount',
    align: 'right',
    sortValue: (r) => r.amount_paid,
    render: (r) => <span className="font-medium">{fmtINR(r.amount_paid)}</span>,
  },
  { key: 'payment_id', header: 'Payment ID', className: 'hidden lg:table-cell', render: (r) => <span className="text-xs text-muted-foreground font-mono">{r.payment_id?.slice(0, 12)}...</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status === 'active' ? 'Active' : r.status === 'cancelled' ? 'Cancelled' : 'Expired'} /> },
  { key: 'started_at', header: 'Joined', className: 'hidden md:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.started_at)}</span> },
  { key: 'expires_at', header: 'Renewal', className: 'hidden md:table-cell', render: (r) => <span className="text-muted-foreground">{shortDate(r.expires_at)}</span> },
];

export function FoundingFarmersModule({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<FoundingFarmerConfig | null>(null);
  const [records, setRecords] = useState<FoundingFarmerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editConfig, setEditConfig] = useState({
    is_active: true,
    max_slots: 500,
    plus_price: 29,
    pro_price: 59,
    offer_start: '',
    offer_end: '',
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        // Fetch config
        const { data: cfg } = await supabase.rpc('get_founding_farmer_config');
        if (cfg && active) {
          setConfig(cfg);
          setEditConfig({
            is_active: cfg.is_active,
            max_slots: cfg.max_slots,
            plus_price: cfg.plus_price,
            pro_price: cfg.pro_price,
            offer_start: cfg.offer_start ? new Date(cfg.offer_start).toISOString().slice(0, 16) : '',
            offer_end: cfg.offer_end ? new Date(cfg.offer_end).toISOString().slice(0, 16) : '',
          });
        }

        // Fetch FF records by joining user_subscriptions + profiles
        const { data: subs } = await supabase
          .from('user_subscriptions')
          .select('id, user_id, plan_id, status, started_at, expires_at, founding_farmer_price, founding_farmer_number, payment_id, normal_price')
          .eq('founding_farmer', true)
          .order('founding_farmer_number', { ascending: true });

        if (subs && active) {
          // Fetch profile names in batch
          const userIds = [...new Set(subs.map(s => s.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, phone, location, state, district, village')
            .in('id', userIds);

          const profileMap = new Map((profiles || []).map(p => [p.id, p]));

          const ffRecords: FoundingFarmerRecord[] = subs.map(sub => {
            const profile = profileMap.get(sub.user_id);
            return {
              id: sub.id,
              user_id: sub.user_id,
              user_name: profile?.full_name || 'Unknown',
              phone: profile?.phone || '',
              location: [profile?.village, profile?.district, profile?.state].filter(Boolean).join(', ') || profile?.location || '',
              plan: sub.plan_id?.includes('pro') ? 'pro' : 'plus',
              founding_farmer_number: sub.founding_farmer_number || 0,
              amount_paid: sub.founding_farmer_price || 0,
              normal_price: sub.normal_price || 0,
              payment_id: sub.payment_id || '',
              status: sub.status || 'active',
              started_at: sub.started_at || '',
              expires_at: sub.expires_at || '',
            };
          });
          setRecords(ffRecords);
        }
      } catch (err) {
        console.error('Failed to load founding farmer data:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('founding_farmer_config')
        .update({
          is_active: editConfig.is_active,
          max_slots: editConfig.max_slots,
          plus_price: editConfig.plus_price,
          pro_price: editConfig.pro_price,
          offer_start: editConfig.offer_start ? new Date(editConfig.offer_start).toISOString() : undefined,
          offer_end: editConfig.offer_end ? new Date(editConfig.offer_end).toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'default');
      if (!error) {
        // Refresh config
        const { data: cfg } = await supabase.rpc('get_founding_farmer_config');
        if (cfg) setConfig(cfg);
      }
    } finally {
      setSaving(false);
    }
  };

  const totalRevenue = records.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
  const plusCount = records.filter(r => r.plan === 'plus').length;
  const proCount = records.filter(r => r.plan === 'pro').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Founding Farmers"
        subtitle={config ? `${records.length} members · ${config.remaining_slots} slots remaining · ${fmtINR(totalRevenue)} revenue` : 'Loading...'}
        actions={
          <Button onClick={() => logAdminExport('Founding Farmers', records)} variant="outline" size="sm">
            Export CSV
          </Button>
        }
      />

      {/* Config Panel */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Sprout size={18} className="text-primary" />
          <h3 className="font-bold text-sm text-foreground">Program Configuration</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
            <div>
              <p className="text-xs font-extrabold text-foreground">Program Active</p>
              <p className="text-[10px] font-semibold text-muted-foreground">
                {editConfig.is_active ? 'Open for new members' : 'Closed to new members'}
              </p>
            </div>
            <Switch
              checked={editConfig.is_active}
              onCheckedChange={(v) => setEditConfig(prev => ({ ...prev, is_active: v }))}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Max Slots</label>
            <Input
              type="number"
              value={editConfig.max_slots}
              onChange={(e) => setEditConfig(prev => ({ ...prev, max_slots: Number(e.target.value) }))}
              min={1}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Plus Price (₹/mo)</label>
            <Input
              type="number"
              value={editConfig.plus_price}
              onChange={(e) => setEditConfig(prev => ({ ...prev, plus_price: Number(e.target.value) }))}
              min={1}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Pro Price (₹/mo)</label>
            <Input
              type="number"
              value={editConfig.pro_price}
              onChange={(e) => setEditConfig(prev => ({ ...prev, pro_price: Number(e.target.value) }))}
              min={1}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Offer Start</label>
            <Input
              type="datetime-local"
              value={editConfig.offer_start}
              onChange={(e) => setEditConfig(prev => ({ ...prev, offer_start: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Offer End</label>
            <Input
              type="datetime-local"
              value={editConfig.offer_end}
              onChange={(e) => setEditConfig(prev => ({ ...prev, offer_end: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSaveConfig} disabled={saving} size="sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Configuration
          </Button>
          {config && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Slots taken: <strong className="text-foreground">{config.slots_taken}</strong></span>
              <span>Remaining: <strong className="text-foreground">{config.remaining_slots}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total FF', value: records.length, color: 'text-primary' },
          { label: 'Plus FF', value: plusCount, color: 'text-emerald-600' },
          { label: 'Pro FF', value: proCount, color: 'text-primary' },
          { label: 'Revenue', value: fmtINR(totalRevenue), color: 'text-amber-600' },
        ].map((kpi, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-3 text-center">
            <p className={cn('text-lg font-extrabold', kpi.color)}>{kpi.value}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Records Table */}
      <DataTable
        data={records}
        columns={FF_COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['user_name', 'phone', 'location', 'payment_id']}
        filters={[
          { key: 'plan', label: 'Plan', options: ['plus', 'pro'].map(v => ({ value: v, label: v === 'pro' ? 'Pro' : 'Plus' })) },
          { key: 'status', label: 'Status', options: ['active', 'expired', 'cancelled'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })) },
        ] as DataFilter[]}
        exportName="founding-farmers"
        onExport={(c) => logAdminExport('Founding Farmer', c)}
      />
    </div>
  );
}
