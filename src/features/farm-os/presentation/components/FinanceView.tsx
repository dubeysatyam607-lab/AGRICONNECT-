import React, { useState } from 'react';
import { IndianRupee, TrendingUp, Wallet, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ExpenseCategory } from '../../domain/farmOsTypes';
import type { UseFarmOsResult } from '../hooks/useFarmOs';
import { inr } from './shared';
import { SectionHead } from './OverviewView';

interface Props {
  data: UseFarmOsResult;
  onToast: (msg: string) => void;
}

const CATS: ExpenseCategory[] = ['seeds', 'fertilizer', 'pesticide', 'labour', 'machinery', 'transport', 'other'];

export const FinanceView: React.FC<Props> = ({ data, onToast }) => {
  const { t } = useLanguage();
  const { finance, state, activeFarm, actions } = data;
  const [sheet, setSheet] = useState<'expense' | 'sale' | null>(null);
  const [label, setLabel] = useState('');
  const [cat, setCat] = useState<ExpenseCategory>('fertilizer');
  const [amount, setAmount] = useState('');
  const [crop, setCrop] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');

  const totalCat = CATS.reduce((a, b) => a + finance.byCategory[b], 0);
  const maxCat = Math.max(...CATS.map((c) => finance.byCategory[c]), 1);
  const sales = state.sales.filter((s) => s.farmId === activeFarm.id);

  const submitExpense = () => {
    const amt = Number(amount);
    if (!label.trim() || !amt) return;
    actions.addExpense({ label: label.trim(), category: cat, amount: amt });
    setLabel('');
    setAmount('');
    setSheet(null);
    onToast(t('fos.toast.expense'));
  };

  const submitSale = () => {
    const q = Number(qty);
    const p = Number(price);
    if (!crop.trim() || !q || !p) return;
    actions.addSale({ crop: crop.trim(), qty: q, pricePerUnit: p, amount: q * p });
    setCrop('');
    setQty('');
    setPrice('');
    setSheet(null);
    onToast(t('fos.toast.sale'));
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <SectionHead title={t('fos.fin.title')} />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2">
        <Kpi icon={Wallet} value={inr(finance.totalExpense)} label={t('fos.fin.expense')} tint="bg-rose-500/10 text-rose-700 dark:text-rose-300" />
        <Kpi icon={TrendingUp} value={inr(finance.revenue)} label={t('fos.fin.revenue')} tint="bg-sky-500/10 text-sky-700 dark:text-sky-300" />
        <Kpi icon={IndianRupee} value={inr(finance.profit)} label={t('fos.fin.profit')} tint={finance.profit >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'} />
        <Kpi icon={Wallet} value={inr(finance.costPerAcre)} label={`${t('fos.fin.costPerAcre')} · ${finance.marginPct}% ${t('fos.fin.margin')}`} tint="bg-amber-500/10 text-amber-700 dark:text-amber-300" />
      </div>

      {/* Category breakdown */}
      <section>
        <SectionHead title={t('fos.fin.byCategory')} />
        {totalCat === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-6 text-center text-xs font-semibold text-muted-foreground">
            {t('fos.fin.empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3.5 shadow-card">
            {CATS.map((c) => {
              const v = finance.byCategory[c];
              const pct = Math.round((v / totalCat) * 100);
              return (
                <div key={c} className="flex items-center gap-2.5">
                  <span className="w-28 shrink-0 truncate text-[11px] font-bold text-muted-foreground">{t(`fos.fin.cat.${c}`)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(v / maxCat) * 100}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[11px] font-black text-foreground">{inr(v)}</span>
                  <span className="w-8 shrink-0 text-right text-[10px] font-bold text-muted-foreground">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sales */}
      <section>
        <SectionHead title={t('fos.fin.sales')} />
        {sales.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-6 text-center text-xs font-semibold text-muted-foreground">
            {t('fos.fin.saleEmpty')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sales.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-3.5 py-3 shadow-card">
                <div>
                  <p className="text-[13px] font-bold text-foreground">{s.crop}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">{s.qty} {s.unit} × ₹{s.pricePerUnit.toLocaleString('en-IN')}</p>
                </div>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{inr(s.qty * s.pricePerUnit)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setSheet('expense')} className="rounded-xl border border-dashed border-emerald-300 bg-emerald-500/5 py-3 text-sm font-black text-emerald-700 transition-colors hover:bg-emerald-500/10 dark:text-emerald-300">
          + {t('fos.fin.addExpense')}
        </button>
        <button onClick={() => setSheet('sale')} className="rounded-xl border border-dashed border-sky-300 bg-sky-500/5 py-3 text-sm font-black text-sky-700 transition-colors hover:bg-sky-500/10 dark:text-sky-300">
          + {t('fos.fin.addSale')}
        </button>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setSheet(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-black tracking-tight text-foreground">
                {sheet === 'expense' ? t('fos.fin.addExpense') : t('fos.fin.addSale')}
              </h3>
              <button onClick={() => setSheet(null)} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X size={15} />
              </button>
            </div>
            {sheet === 'expense' ? (
              <>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {CATS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCat(c)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-black transition-colors',
                        cat === c ? 'bg-forest text-primary-foreground' : 'border border-border bg-background text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t(`fos.fin.cat.${c}`)}
                    </button>
                  ))}
                </div>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t('fos.fin.labelPh')}
                  className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-emerald-400 focus:outline-none"
                />
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder={t('fos.fin.amountPh')}
                  className="mb-4 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-emerald-400 focus:outline-none"
                />
                <button onClick={submitExpense} disabled={!label.trim() || !Number(amount)} className="w-full rounded-xl bg-forest py-2.5 text-sm font-black text-primary-foreground disabled:opacity-40">
                  {t('fos.fin.submit')}
                </button>
              </>
            ) : (
              <>
                <input
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  placeholder={t('fos.fin.cropPh')}
                  className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-emerald-400 focus:outline-none"
                />
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <input
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    type="number"
                    placeholder={`${t('fos.fin.qty')} (${t('fos.unit.quintal')})`}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    type="number"
                    placeholder={t('fos.fin.pricePerUnit')}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                {Number(qty) > 0 && Number(price) > 0 && (
                  <p className="mb-3 text-right text-sm font-black text-emerald-700 dark:text-emerald-300">
                    = {inr(Number(qty) * Number(price))}
                  </p>
                )}
                <button onClick={submitSale} disabled={!crop.trim() || !Number(qty) || !Number(price)} className="w-full rounded-xl bg-forest py-2.5 text-sm font-black text-primary-foreground disabled:opacity-40">
                  {t('fos.fin.submit')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Kpi: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; value: string; label: string; tint: string }> = ({ icon: Icon, value, label, tint }) => (
  <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
    <span className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-lg', tint)}>
      <Icon size={15} />
    </span>
    <p className="truncate text-sm font-black tracking-tight text-foreground">{value}</p>
    <p className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
  </div>
);
