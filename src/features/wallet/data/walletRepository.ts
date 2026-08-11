import { supabase } from '@/integrations/supabase/client';
import type {
  AddMoneyResult,
  AdminWalletRow,
  WalletSummary,
  WalletTransaction,
  WalletTransactionsPage,
} from '../domain/walletTypes';

const FUNC_URL =
  import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') +
  '/functions/v1/wallet';

async function postEdgeJson<T>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sign in required');
  }
  const res = await fetch(FUNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    throw new Error(json.error ?? `Wallet request failed (${res.status})`);
  }
  return json as T;
}

export interface WalletRepository {
  getSummary(): Promise<WalletSummary>;
  getTransactions(page?: number, pageSize?: number, typeFilter?: string): Promise<WalletTransactionsPage>;
  addMoney(amount: number): Promise<AddMoneyResult>;
  verifyPayment(args: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{ ok: boolean; transaction: WalletTransaction }>;
  adminList(): Promise<AdminWalletRow[]>;
  adminAdjust(userId: string, amount: number, direction: 'in' | 'out', reason: string): Promise<WalletTransaction>;
}

export const walletRepository: WalletRepository = {
  async getSummary() {
    const res = await postEdgeJson<{ wallet: WalletSummary }>({ action: 'summary' });
    return res.wallet;
  },
  async getTransactions(page = 1, pageSize = 20, typeFilter = 'all') {
    const res = await postEdgeJson<{ result: WalletTransactionsPage }>({
      action: 'transactions',
      page,
      pageSize,
      typeFilter,
    });
    return res.result;
  },
  async addMoney(amount) {
    const res = await postEdgeJson<AddMoneyResult>({ action: 'add-money', amount });
    return res;
  },
  async verifyPayment(args) {
    return postEdgeJson<{ ok: boolean; transaction: WalletTransaction }>({
      action: 'verify-payment',
      ...args,
    });
  },
  async adminList() {
    const res = await postEdgeJson<{ wallets: AdminWalletRow[] }>({ action: 'admin-list' });
    return res.wallets;
  },
  async adminAdjust(userId, amount, direction, reason) {
    const res = await postEdgeJson<{ ok: boolean; transaction: WalletTransaction }>({
      action: 'admin-adjust',
      userId,
      amount,
      direction,
      reason,
    });
    return res.transaction;
  },
};
