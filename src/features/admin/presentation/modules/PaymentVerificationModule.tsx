import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Info, ShieldCheck, Banknote, Loader2, Save, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { DataColumn } from '../components/DataTable';
import { AdminStatusBadge } from '../components/StatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { fmtINR } from '../../domain/adminStore';
import {
  adminApprovePayment,
  adminRejectPayment,
  adminRequestInfo,
} from '@/features/payments/domain/manualUpi';

interface Row {
  id: string;
  user_id: string;
  user_name: string;
  phone: string;
  email: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  utr: string;
  payment_date: string | null;
  proof_storage_path: string;
  status: string;
  admin_note: string | null;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

type Tab = 'pending' | 'approved' | 'rejected' | 'all';

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export function PaymentVerificationModule({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');

  const [proofRow, setProofRow] = useState<Row | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const [approveRow, setApproveRow] = useState<Row | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [rejectRow, setRejectRow] = useState<Row | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [infoRow, setInfoRow] = useState<Row | null>(null);
  const [infoMessage, setInfoMessage] = useState('');

  const [acting, setActing] = useState(false);

  const [upiId, setUpiId] = useState('7067820256@ptyes');
  const [payeeName, setPayeeName] = useState('SATYAM DUBEY');
  const [savingConfig, setSavingConfig] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: reqs } = await supabase.from('payment_requests').select('*').order('created_at', { ascending: false });
      const reqsList = reqs || [];
      const userIds = [...new Set(reqsList.map((r) => r.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, full_name, phone, email').in('id', userIds)
        : { data: [] };
      const pMap = new Map((profiles || []).map((p) => [p.id, p]));
      const { data: plans } = await supabase.from('subscription_plans').select('id, name');
      const planMap = new Map((plans || []).map((p) => [p.id, p.name]));
      setRows(reqsList.map((r) => ({
        ...r,
        user_name: pMap.get(r.user_id)?.full_name || 'Unknown',
        phone: pMap.get(r.user_id)?.phone || '',
        email: pMap.get(r.user_id)?.email || '',
        plan_name: planMap.get(r.plan_id) || r.plan_id,
      })));
    } catch (err) {
      toast.error('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    const { data } = await supabase.from('payment_config').select('upi_id, payee_name').eq('id', 'default').maybeSingle();
    if (data) {
      setUpiId(data.upi_id || '7067820256@ptyes');
      setPayeeName(data.payee_name || 'SATYAM DUBEY');
    }
  }, []);

  useEffect(() => {
    load();
    loadConfig();
    const channel = supabase
      .channel('payment-verification')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_requests' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, loadConfig]);

  const filtered = useMemo(
    () => (tab === 'all' ? rows : rows.filter((r) => r.status === tab)),
    [rows, tab],
  );

  const pending = rows.filter((r) => r.status === 'pending');
  const approved = rows.filter((r) => r.status === 'approved');
  const rejected = rows.filter((r) => r.status === 'rejected');
  const revenue = approved.reduce((s, r) => s + (r.amount || 0), 0);

  const viewProof = async (row: Row) => {
    setProofRow(row);
    setProofUrl(null);
    try {
      const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(row.proof_storage_path, 600);
      setProofUrl(error ? null : data?.signedUrl || null);
    } catch {
      setProofUrl(null);
    }
  };

  const doApprove = async () => {
    if (!approveRow) return;
    setActing(true);
    const res = await adminApprovePayment(approveRow.id, approveNote.trim() || undefined);
    setActing(false);
    if (res.ok) {
      toast.success(`Payment approved · ${approveRow.user_name} → ${approveRow.plan_name}`);
      setApproveRow(null);
      setApproveNote('');
      load();
    } else {
      toast.error(res.error || 'Approval failed');
    }
  };

  const doReject = async () => {
    if (!rejectRow) return;
    setActing(true);
    const res = await adminRejectPayment(rejectRow.id, rejectReason.trim());
    setActing(false);
    if (res.ok) {
      toast.success('Payment rejected');
      setRejectRow(null);
      setRejectReason('');
      load();
    } else {
      toast.error(res.error || 'Rejection failed');
    }
  };

  const doRequestInfo = async () => {
    if (!infoRow) return;
    setActing(true);
    const res = await adminRequestInfo(infoRow.id, infoMessage.trim());
    setActing(false);
    if (res.ok) {
      toast.success(`Info requested from ${infoRow.user_name}`);
      setInfoRow(null);
      setInfoMessage('');
    } else {
      toast.error(res.error || 'Failed');
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    const { error } = await supabase
      .from('payment_config')
      .update({ upi_id: upiId.trim(), payee_name: payeeName.trim(), updated_at: new Date().toISOString() })
      .eq('id', 'default');
    setSavingConfig(false);
    if (error) toast.error('Failed to save UPI config');
    else toast.success('UPI config saved');
  };

  const columns: DataColumn<Row>[] = [
    {
      key: 'user',
      header: 'User',
      render: (r) => (
        <div>
          <p className="font-medium text-foreground">{r.user_name}</p>
          <p className="text-[10px] text-muted-foreground">{r.phone || r.email || r.user_id.slice(0, 8)}</p>
        </div>
      ),
      sortValue: (r) => r.user_name,
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (r) => <span className="text-xs font-bold text-primary">{r.plan_name}</span>,
      sortValue: (r) => r.plan_name,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: (r) => r.amount,
      render: (r) => <span className="font-medium">{fmtINR(r.amount)}</span>,
    },
    {
      key: 'utr',
      header: 'UTR',
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.utr}</span>,
      sortValue: (r) => r.utr,
    },
    {
      key: 'created_at',
      header: 'Submitted',
      className: 'hidden md:table-cell',
      render: (r) => <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>,
      sortValue: (r) => r.created_at,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <AdminStatusBadge status={r.status.charAt(0).toUpperCase() + r.status.slice(1)} />,
      sortValue: (r) => r.status,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="sm" onClick={() => viewProof(r)} title="View proof">
            <ExternalLink size={13} />
          </Button>
          {r.status === 'pending' && (
            <>
              <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => { setApproveRow(r); setApproveNote(''); }} title="Approve">
                <CheckCircle2 size={13} />
              </Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setRejectRow(r); setRejectReason(''); }} title="Reject">
                <XCircle size={13} />
              </Button>
              <Button size="sm" variant="outline" className="text-amber-600" onClick={() => { setInfoRow(r); setInfoMessage(''); }} title="Request info">
                <Info size={13} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payment Verification"
        subtitle={`${pending.length} pending · ${fmtINR(revenue)} verified revenue`}
      />

      {/* UPI Config */}
      <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <Banknote size={17} className="text-primary" />
          <h3 className="text-sm font-black text-foreground">UPI Configuration</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-black text-muted-foreground">UPI ID</label>
            <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} className="font-mono text-xs font-bold" placeholder="yourname@okbank" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black text-muted-foreground">Payee Name</label>
            <Input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} className="text-xs font-bold" />
          </div>
          <div className="flex items-end">
            <Button onClick={saveConfig} disabled={savingConfig} className="w-full">
              {savingConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: pending.length, color: 'text-amber-600' },
          { label: 'Approved', value: approved.length, color: 'text-emerald-600' },
          { label: 'Rejected', value: rejected.length, color: 'text-red-600' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-3 text-center">
            <p className={cn('text-lg font-extrabold', kpi.color)}>{kpi.value}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {(['pending', 'approved', 'rejected', 'all'] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-black transition',
              tab === tb ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10',
            )}
          >
            {tb.charAt(0).toUpperCase() + tb.slice(1)}
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        searchKeys={['user_name', 'phone', 'email', 'utr', 'plan_name']}
        searchPlaceholder="Search name, UTR, plan..."
        exportName="payment-verification"
      />

      {/* View proof modal */}
      <AlertDialog open={!!proofRow} onOpenChange={(v) => { if (!v) { setProofRow(null); setProofUrl(null); } }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Payment Proof · {proofRow?.user_name}</AlertDialogTitle>
            <AlertDialogDescription>
              {proofRow && (
                <div className="space-y-2 text-xs font-semibold text-muted-foreground">
                  <p>UTR: <span className="font-mono text-foreground">{proofRow.utr}</span></p>
                  <p>Amount: <span className="text-foreground">{fmtINR(proofRow.amount)}</span> · Plan: <span className="text-foreground">{proofRow.plan_name}</span></p>
                  <p>{fmtDate(proofRow.created_at)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex max-h-[50vh] flex-col items-center justify-center overflow-auto rounded-2xl border border-dashed border-border bg-muted/30 p-3">
            {proofUrl ? (
              <img src={proofUrl} alt="Payment proof" className="max-h-[46vh] rounded-xl object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-xs font-bold text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
                Loading proof or file deleted...
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve modal */}
      <AlertDialog open={!!approveRow} onOpenChange={(v) => !v && setApproveRow(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve payment?</AlertDialogTitle>
            <AlertDialogDescription>
              Verify the UTR and screenshot before approving. Activating the subscription immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">
              {approveRow?.user_name} · {approveRow?.plan_name} · <span className="text-foreground">{approveRow ? fmtINR(approveRow.amount) : ''}</span>
              <span className="mx-1">·</span>
              <span className="font-mono">{approveRow?.utr}</span>
            </div>
            <Textarea value={approveNote} onChange={(e) => setApproveNote(e.target.value)} rows={2} placeholder="Note (optional)" className="text-xs font-semibold" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doApprove(); }} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700">
              {acting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject modal */}
      <AlertDialog open={!!rejectRow} onOpenChange={(v) => !v && setRejectRow(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject payment?</AlertDialogTitle>
            <AlertDialogDescription>
              A reason is required — the user will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="e.g. UTR not matching, screenshot unclear, wrong amount..." className="text-xs font-semibold" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doReject(); }} disabled={acting || rejectReason.trim().length < 3} className="bg-red-600 hover:bg-red-700">
              {acting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request info modal */}
      <AlertDialog open={!!infoRow} onOpenChange={(v) => !v && setInfoRow(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Request more info</AlertDialogTitle>
            <AlertDialogDescription>
              User will be notified to submit more details. Request stays pending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={infoMessage} onChange={(e) => setInfoMessage(e.target.value)} rows={3} placeholder="e.g. Screenshot is unclear, please upload a clearer one." className="text-xs font-semibold" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doRequestInfo(); }} disabled={acting || infoMessage.trim().length < 3}>
              {acting ? <Loader2 size={14} className="animate-spin" /> : <Info size={14} />}
              Request Info
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}