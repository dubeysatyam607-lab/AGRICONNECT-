import { Banknote, CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { fmtMoney } from '../../domain/paymentStore';
import type { PaymentMethod } from '../../domain/paymentTypes';
import { useLanguage } from '@/contexts/LanguageContext';

const METHODS: { id: PaymentMethod; icon: typeof Smartphone }[] = [
  { id: 'upi', icon: Smartphone },
  { id: 'card', icon: CreditCard },
  { id: 'netbanking', icon: Landmark },
  { id: 'wallet', icon: Wallet },
];

const METHOD_LABEL_KEY: Record<PaymentMethod, string> = {
  upi: 'pay.upi',
  card: 'pay.card',
  netbanking: 'pay.netbanking',
  wallet: 'pay.walletMethod',
};

const METHOD_EN: Record<PaymentMethod, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
};

interface MethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  walletBalance: number;
  disabled?: boolean;
}

export function MethodPicker({ value, onChange, walletBalance, disabled }: MethodPickerProps) {
  const { t } = useLanguage();
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as PaymentMethod)}
      disabled={disabled}
      className="grid grid-cols-2 gap-2"
    >
      {METHODS.map((m) => {
        const Icon = m.icon;
        const active = value === m.id;
        return (
          <label
            key={m.id}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 p-3 transition-all',
              active
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/40',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <RadioGroupItem value={m.id} id={`method-${m.id}`} className="sr-only" />
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              <Icon size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-extrabold text-foreground">{t(METHOD_LABEL_KEY[m.id])}</span>
              {m.id === 'wallet' ? (
                <span className="block truncate text-[10px] font-semibold text-muted-foreground">{fmtMoney(walletBalance)} {t('pay.available')}</span>
              ) : (
                <span className="block truncate text-[10px] font-semibold text-muted-foreground">{METHOD_EN[m.id]}</span>
              )}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

export function MethodIcon({ method, className }: { method: PaymentMethod; className?: string }) {
  const Icon = method === 'upi' ? Smartphone : method === 'card' ? CreditCard : method === 'netbanking' ? Landmark : Banknote;
  return <Icon className={className} />;
}
