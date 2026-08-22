import { useState, useEffect } from 'react';
import { BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { BulkAction, DataColumn, DataFilter } from '../components/DataTable';
import { AdminStatusBadge } from '../components/StatusBadge';
import { logAdminExport } from '../hooks/useAdminCrud';
import { supabase } from '@/integrations/supabase/client';
import { timeAgo } from '../../domain/adminStore';

interface VerificationRow {
  id: string;
  user: string;
  type: string;
  document: string;
  submitted: string;
  status: string;
}

function useVerificationRequests(): VerificationRow[] {
  const [rows, setRows] = useState<VerificationRow[]>([]);

  const fetchRows = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!profiles) return;

      const results: VerificationRow[] = profiles
        .filter((p) => {
          const meta = (p as any).extended_profile || {};
          return meta.kyc_status || meta.aadhaar_number || meta.kyc_verified;
        })
        .map((p) => {
          const meta = (p as any).extended_profile || {};
          return {
            id: p.id,
            user: p.full_name || 'Registered Farmer',
            type: (meta.user_type || 'Farmer') as string,
            document: meta.aadhaar_number
              ? `Aadhaar XXXX-XXXX-${String(meta.aadhaar_number).slice(-4)}`
              : 'Aadhaar',
            submitted: p.created_at,
            status: (meta.kyc_status === 'Rejected'
              ? 'Rejected'
              : meta.kyc_verified
                ? 'Approved'
                : 'Pending') as string,
          };
        });

      setRows(results);
    } catch {
      // keep empty
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchRows();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, []);

  return rows;
}

const COLUMNS: DataColumn<VerificationRow>[] = [
  { key: 'user', header: 'Applicant', render: (r) => <span className="font-medium text-foreground">{r.user}</span> },
  { key: 'type', header: 'Type' },
  { key: 'document', header: 'Document', className: 'hidden md:table-cell' },
  { key: 'submitted', header: 'Submitted', render: (r) => <span className="text-muted-foreground">{timeAgo(r.submitted)}</span> },
  { key: 'status', header: 'Status', render: (r) => <AdminStatusBadge status={r.status as any} /> },
];

const FILTERS: DataFilter[] = [
  { key: 'status', label: 'Status', options: ['Pending', 'Approved', 'Rejected'].map((v) => ({ value: v, label: v })) },
  { key: 'type', label: 'Type', options: ['Farmer', 'Tractor Owner', 'Store Owner', 'Cattle Owner'].map((v) => ({ value: v, label: v })) },
];

export function VerificationModule() {
  const rows = useVerificationRequests();
  const pending = rows.filter((r) => r.status === 'Pending').length;
  const approved = rows.filter((r) => r.status === 'Approved').length;

  const handleApproveAll = async () => {
    const pendingProfiles = rows.filter((r) => r.status === 'Pending');
    for (const r of pendingProfiles) {
      await supabase
        .from('profiles')
        .update({} as any)
        .eq('id', r.id);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Verification"
        subtitle={`${pending} pending · ${approved} approved`}
        actions={
          pending > 0 ? (
            <Button onClick={handleApproveAll}>
              <BadgeCheck className="h-4 w-4" /> Approve All Pending ({pending})
            </Button>
          ) : undefined
        }
      />
      <DataTable
        data={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        searchKeys={['user', 'type', 'document']}
        filters={FILTERS}
        exportName="verification-requests"
        onExport={(c) => logAdminExport('Verification Request', c)}
        emptyMessage="No verification requests yet. KYC submissions will appear here."
      />
    </div>
  );
}
