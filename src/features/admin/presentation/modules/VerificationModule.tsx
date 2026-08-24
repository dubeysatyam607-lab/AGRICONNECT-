import { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, Check, X, RefreshCw, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { AdminStatusBadge } from '../components/StatusBadge';
import { logAdminExport } from '../hooks/useAdminCrud';
import { updateUserKyc } from '../../domain/adminDatabaseService';
import { supabase } from '@/integrations/supabase/client';
import { timeAgo } from '../../domain/adminStore';
import { toast } from 'sonner';

interface VerificationRow {
  id: string;
  user: string;
  phone: string;
  type: string;
  document: string;
  submitted: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  isVerified: boolean;
}

export function VerificationModule() {
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error(`Could not fetch verification requests: ${error.message}`);
        setRows([]);
        return;
      }

      if (!profiles) {
        setRows([]);
        return;
      }

      const results: VerificationRow[] = profiles
        .filter((p) => {
          const meta = (p as any).extended_profile || {};
          return (
            meta.kyc_status ||
            meta.aadhaar_number ||
            meta.kyc_verified ||
            p.is_verified ||
            p.verification_status
          );
        })
        .map((p) => {
          const meta = (p as any).extended_profile || {};
          const isApp = p.is_verified || meta.kyc_verified || meta.kyc_status === 'Verified' || p.verification_status === 'verified';
          const isRej = meta.kyc_status === 'Rejected' || p.verification_status === 'rejected';

          return {
            id: p.id,
            user: p.full_name || p.name || p.email || 'Registered User',
            phone: p.phone || p.mobile || '—',
            type: (meta.user_type || p.role || 'Farmer') as string,
            document: meta.aadhaar_number
              ? `Aadhaar XXXX-XXXX-${String(meta.aadhaar_number).slice(-4)}`
              : 'ID Verification',
            submitted: p.created_at || new Date().toISOString(),
            status: isRej ? 'Rejected' : isApp ? 'Approved' : 'Pending',
            isVerified: isApp,
          };
        });

      setRows(results);
    } catch (err) {
      toast.error('Failed to load verification list.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and Supabase Realtime subscription
  useEffect(() => {
    fetchRows();

    const channel = supabase
      .channel('admin-verification-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchRows();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRows]);

  const handleVerify = async (userId: string, userName: string) => {
    setProcessingId(userId);
    try {
      const res = await updateUserKyc(userId, true, 'Approved by Admin');
      if (res.ok) {
        toast.success(`Verification approved for ${userName}`);
        await fetchRows();
      } else {
        toast.error(`Verification failed: ${res.error || 'Database update rejected'}`);
      }
    } catch {
      toast.error('Unexpected error during verification.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    setProcessingId(userId);
    try {
      const res = await updateUserKyc(userId, false, 'Rejected by Admin');
      if (res.ok) {
        toast.success(`Verification rejected for ${userName}`);
        await fetchRows();
      } else {
        toast.error(`Rejection failed: ${res.error || 'Database update rejected'}`);
      }
    } catch {
      toast.error('Unexpected error during rejection.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAll = async () => {
    const pendingRows = rows.filter((r) => r.status === 'Pending');
    if (pendingRows.length === 0) return;

    setLoading(true);
    let successCount = 0;
    for (const r of pendingRows) {
      const res = await updateUserKyc(r.id, true, 'Bulk approved by Admin');
      if (res.ok) successCount++;
    }
    toast.success(`Approved ${successCount} pending user verification(s)`);
    await fetchRows();
    setLoading(false);
  };

  const pending = rows.filter((r) => r.status === 'Pending').length;
  const approved = rows.filter((r) => r.status === 'Approved').length;

  const COLUMNS: DataColumn<VerificationRow>[] = [
    {
      key: 'user',
      header: 'Applicant',
      render: (r) => (
        <div>
          <span className="font-semibold text-foreground">{r.user}</span>
          <p className="text-xs text-muted-foreground">{r.phone}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Role / Type' },
    { key: 'document', header: 'Document', className: 'hidden md:table-cell' },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (r) => <span className="text-muted-foreground">{timeAgo(r.submitted)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <AdminStatusBadge status={r.status as any} />,
    },
    {
      key: 'id',
      header: 'Actions',
      align: 'right',
      render: (r) => {
        const isBusy = processingId === r.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {r.status !== 'Approved' && (
              <Button
                size="sm"
                variant="default"
                className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                disabled={isBusy}
                onClick={() => handleVerify(r.id, r.user)}
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Verify
              </Button>
            )}
            {r.status !== 'Rejected' && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 font-bold"
                disabled={isBusy}
                onClick={() => handleReject(r.id, r.user)}
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Reject
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const FILTERS: DataFilter[] = [
    { key: 'status', label: 'Status', options: ['Pending', 'Approved', 'Rejected'].map((v) => ({ value: v, label: v })) },
    { key: 'type', label: 'Type', options: ['farmer', 'Farmer', 'Tractor Owner', 'Equipment Owner', 'Store Owner'].map((v) => ({ value: v, label: v })) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Verification & KYC"
        subtitle={`${pending} pending · ${approved} approved · Live Realtime PostgreSQL Database`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchRows()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            {pending > 0 && (
              <Button size="sm" onClick={handleApproveAll} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                <BadgeCheck className="h-4 w-4 mr-1.5" /> Approve All Pending ({pending})
              </Button>
            )}
          </div>
        }
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['user', 'phone', 'type', 'document']}
        filters={FILTERS}
        exportName="verification-requests"
        onExport={(c) => logAdminExport('Verification Request', c)}
        emptyMessage="No verification requests found in database."
      />
    </div>
  );
}
