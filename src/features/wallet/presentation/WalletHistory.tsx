import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Gift, History, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { walletRepository } from '../data/walletRepository';
import type { WalletTransaction, WalletTransactionsPage } from '../domain/walletTypes';

interface WalletHistoryProps {
  onToast?: (message: string) => void;
}

const FILTERS = ['all', 'credit', 'payment', 'refund', 'cashback', 'reward'] as const;

const fmt = (n: number) => '₹' + (Number(n) || 0).toLocaleString('en-IN');

const TYPE_LABEL: Record<string, string> = {
  credit: 'Money Added',
  debit: 'Payment',
  refund: 'Refund',
  cashback: 'Cashback',
  reward: 'Reward',
  payment: 'Payment',
  withdrawal: 'Withdrawal',
  adjustment: 'Adjustment',
};

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  failed: 'bg-rose-500/15 text-rose-500',
  reversed: 'bg-slate-500/15 text-muted-foreground',
};

export function WalletHistory({ onToast }: WalletHistoryProps) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<WalletTransactionsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WalletTransaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await walletRepository.getTransactions(page, 15, filter);
      setData(res);
      setLoading(false);
    } catch (e: any) {
      setError(e.message ?? 'Unable to load transactions');
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.page_size ?? 15)));

  return (
    <div className="mt-4 space-y-4">
      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-extrabold transition-all',
              filter === f ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground',
            )}
          >
            {t(`wallet.filter_${f}`)}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-xs font-extrabold text-red-700">{error}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={load}>
            <RefreshCw size={13} className="mr-1" /> {t('wallet.retry')}
          </Button>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {loading && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
          </p>
        )}
        {!loading && (data?.rows.length ?? 0) === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-[11px] font-semibold text-muted-foreground">
            {t('wallet.noHistory')}
          </p>
        )}
        {data?.rows.map((w) => {
          const credit = w.direction === 'in';
          const Icon = credit ? ArrowDownLeft : w.type === 'cashback' || w.type === 'reward' ? Gift : ArrowUpRight;
          return (
            <button
              key={w.id}
              onClick={() => setSelected(w)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-card transition-all active:scale-[0.99]"
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', credit ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground')}>
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-foreground">{w.description ?? TYPE_LABEL[w.type] ?? w.type}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                  {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn('text-sm font-black', credit ? 'text-emerald-600' : 'text-foreground')}>
                  {credit ? '+' : '−'}{fmt(w.amount)}
                </p>
                <span className={cn('inline-block rounded-full px-2 py-0.5 text-[9px] font-bold', STATUS_STYLE[w.status] ?? 'bg-muted text-muted-foreground')}>
                  {w.status}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pb-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {t('wallet.prev')}
          </Button>
          <span className="text-[11px] font-extrabold text-muted-foreground">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            {t('wallet.next')}
          </Button>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History size={16} className="text-primary" /> {t('wallet.txnDetails')}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', selected.direction === 'in' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                  <Wallet size={18} />
                </span>
                <div>
                  <p className="text-sm font-black text-foreground">{selected.description ?? TYPE_LABEL[selected.type] ?? selected.type}</p>
                  <p className={cn('text-lg font-black', selected.direction === 'in' ? 'text-emerald-600' : 'text-foreground')}>
                    {selected.direction === 'in' ? '+' : '−'}{fmt(selected.amount)}
                  </p>
                </div>
              </div>
              <DetailRow label="Transaction ID" value={selected.id} mono />
              <DetailRow label="Type" value={selected.type} />
              <DetailRow label="Status" value={selected.status} />
              <DetailRow label="Date" value={new Date(selected.created_at).toLocaleString('en-IN')} />
              <DetailRow label="Reference" value={selected.reference_id ?? '—'} mono />
              <DetailRow label="Source" value={selected.source ?? '—'} />
              {selected.balance_after !== null && (
                <DetailRow label="Balance after" value={fmt(selected.balance_after)} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      <span className={cn('break-all text-right text-[11px] font-extrabold text-foreground', mono && 'font-mono text-[10px]')}>{value}</span>
    </div>
  );
}
