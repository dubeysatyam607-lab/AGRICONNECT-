import { Printer, ReceiptText, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fmtMoney, shortDate } from '../../domain/paymentStore';
import type { Invoice } from '../../domain/paymentTypes';
import { SELLER_GSTIN, SELLER_NAME } from '../../domain/paymentTypes';
import { useLanguage } from '@/contexts/LanguageContext';

export function InvoiceView({ invoice }: { invoice: Invoice }) {
  const { t } = useLanguage();
  return (
    <div id="gst-invoice" className="rounded-2xl border border-border bg-card p-5 text-sm shadow-card print:border-none print:shadow-none">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary">
            <ReceiptText size={14} /> {t('pay.invoiceGst')}
          </p>
          <p className="mt-2 text-base font-black text-foreground">{SELLER_NAME}</p>
          <p className="text-[11px] font-semibold text-muted-foreground">{t('pay.gstin')}: {SELLER_GSTIN}</p>
          <p className="text-[11px] font-semibold text-muted-foreground">Jaipur, Rajasthan — India</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-foreground">{invoice.number}</p>
          <p className="text-[11px] font-semibold text-muted-foreground">{t('pay.issuedOn')} {shortDate(invoice.issuedAt)}</p>
          {invoice.paidAt && (
            <p className="text-[11px] font-semibold text-muted-foreground">{t('pay.paidOn')} {shortDate(invoice.paidAt)}</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-muted/50 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('pay.billedTo')}</p>
        <p className="mt-0.5 text-sm font-extrabold text-foreground">{invoice.buyer.name}</p>
        <p className="text-[11px] font-semibold text-muted-foreground">
          {invoice.buyer.phone ? `${invoice.buyer.phone}${invoice.buyer.address ? ' • ' : ''}` : ''}
          {invoice.buyer.address}
        </p>
      </div>

      <table className="mt-4 w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
            <th className="pb-2 pr-2 font-black">#</th>
            <th className="pb-2 pr-2 font-black">{t('pay.item')}</th>
            <th className="pb-2 pr-2 text-center font-black">{t('pay.qty')}</th>
            <th className="pb-2 pr-2 text-right font-black">{t('pay.rate')}</th>
            <th className="pb-2 text-right font-black">{t('pay.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, i) => (
            <tr key={line.id} className="border-b border-border/60">
              <td className="py-2 pr-2 font-semibold text-muted-foreground">{i + 1}</td>
              <td className="py-2 pr-2 font-bold text-foreground">{line.description}</td>
              <td className="py-2 pr-2 text-center font-semibold text-muted-foreground">{line.qty}</td>
              <td className="py-2 pr-2 text-right font-semibold text-muted-foreground">{fmtMoney(line.unitPrice)}</td>
              <td className="py-2 text-right font-bold text-foreground">{fmtMoney(line.unitPrice * line.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-full max-w-[220px] space-y-1 text-xs">
        <div className="flex justify-between font-semibold text-muted-foreground">
          <span>{t('pay.subtotal')}</span>
          <span>{fmtMoney(invoice.subtotal)}</span>
        </div>
        {invoice.discount > 0 && (
          <div className="flex justify-between font-semibold text-emerald-600">
            <span>{t('pay.discount')}</span>
            <span>−{fmtMoney(invoice.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-muted-foreground">
          <span>CGST @ {invoice.gstRate / 2}%</span>
          <span>{fmtMoney(invoice.cgst)}</span>
        </div>
        <div className="flex justify-between font-semibold text-muted-foreground">
          <span>SGST @ {invoice.gstRate / 2}%</span>
          <span>{fmtMoney(invoice.sgst)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1 text-sm font-black text-foreground">
          <span>{t('pay.total')}</span>
          <span>{fmtMoney(invoice.total)}</span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full gap-1.5 print:hidden"
        onClick={() => window.print()}
      >
        <Printer size={14} /> {t('pay.print')}
      </Button>
    </div>
  );
}

export function InvoiceModal({ invoice, open, onOpenChange }: { invoice: Invoice | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle className="text-base">GST {t('pay.invoice')}</DialogTitle>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-1 hover:bg-muted">
            <X size={16} />
          </button>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pt-1">{invoice && <InvoiceView invoice={invoice} />}</div>
      </DialogContent>
    </Dialog>
  );
}
