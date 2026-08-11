export type WalletTransactionType =
  | 'credit'
  | 'debit'
  | 'refund'
  | 'cashback'
  | 'reward'
  | 'payment'
  | 'withdrawal'
  | 'adjustment';

export type WalletDirection = 'in' | 'out';
export type WalletTxnStatus = 'pending' | 'completed' | 'failed' | 'reversed';
export type WalletCreditType = 'cash' | 'promo' | 'reward';
export type WalletStatus = 'active' | 'frozen' | 'closed';

export interface WalletSummary {
  wallet_id: string;
  currency: string;
  status: WalletStatus;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_spent: number;
  promo_credit: number;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: WalletTransactionType;
  direction: WalletDirection;
  amount: number;
  currency: string;
  status: WalletTxnStatus;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  credit_type: WalletCreditType | null;
  source: string | null;
  expiry: string | null;
  usage_restrictions: string | null;
  balance_after: number | null;
  created_at: string;
  updated_at: string;
}

export interface WalletTransactionsPage {
  rows: WalletTransaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface AddMoneyResult {
  orderId: string;
  amount: number;
  key: string;
}

export interface AdminWalletRow {
  wallet_id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  balance: number;
  status: WalletStatus;
  currency: string;
  created_at: string;
  updated_at: string;
}
