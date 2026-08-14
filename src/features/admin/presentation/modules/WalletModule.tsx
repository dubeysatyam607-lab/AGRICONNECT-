import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '../components/PageHeader';
import { AdminStatusBadge } from '../components/StatusBadge';
import { walletRepository } from '@/features/wallet/data/walletRepository';
import type { AdminWalletRow } from '@/features/wallet/domain/walletTypes';

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

export function WalletModule() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<AdminWalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<AdminWalletRow | null>(null);
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await walletRepository.adminList());
      setLoading(false);
    } catch (e: any) {
      setError(e.message ?? 'Unable to load wallets');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalBalance = rows.reduce((s, r) => s + Number(r.balance || 0), 0);

  const handleAdjust = async () => {
    const amt = Number(amount);
    if (!adjusting) return;
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await walletRepository.adminAdjust(adjusting.user_id, amt, direction, reason.trim());
      setAdjusting(null);
      setAmount('');
      setReason('');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Wallets"
        subtitle={`${rows.length} wallets · ${fmt(totalBalance)} total balance`}
        actions={<Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>}
      />

      {error && !adjusting && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-extrabold text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t('adm37')}</th>
              <th className="px-4 py-3">{t('adm38')}</th>
              <th className="px-4 py-3 text-right">{t('adm39')}</th>
              <th className="px-4 py-3">{t('adm40')}</th>
              <th className="px-4 py-3">{t('adm41')}</th>
              <th className="px-4 py-3 text-right">{t('adm42')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-xs font-semibold text-muted-foreground">
                  No wallets yet — wallets are created when users sign in.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.wallet_id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-extrabold text-foreground">{r.full_name ?? '—'}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{r.user_id.slice(0, 12)}…</p>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">{r.phone ?? '—'}</td>
                <td className="px-4 py-3 text-right font-black text-foreground">{fmt(r.balance)}</td>
                <td className="px-4 py-3"><AdminStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(r.updated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => { setAdjusting(r); setAmount(''); setDirection('in'); setReason(''); setError(null); }}>
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adjust dialog — audited */}
      <Dialog open={!!adjusting} onOpenChange={(v) => { if (!v) setAdjusting(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{t('adm43')}</DialogTitle>
          </DialogHeader>
          {adjusting && (
            <div className="space-y-3">
              <p className="rounded-xl bg-muted/50 p-2.5 text-[11px] font-semibold text-muted-foreground">
                {adjusting.full_name ?? adjusting.user_id} · current balance {fmt(adjusting.balance)}
              </p>
              {error && <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] font-extrabold text-red-700">{error}</p>}
              <div className="flex gap-2">
                <Button variant={direction === 'in' ? 'default' : 'outline'} className="flex-1" onClick={() => setDirection('in')}>{t('adm44')}</Button>
                <Button variant={direction === 'out' ? 'destructive' : 'outline'} className="flex-1" onClick={() => setDirection('out')}>{t('adm45')}</Button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-muted-foreground">{t('adm46')}</label>
                <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="text-sm font-black" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-muted-foreground">{t('adm47')}</label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Refund approved by support" className="text-sm" />
              </div>
              <Button className="w-full" disabled={saving} onClick={handleAdjust}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply Adjustment'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
