/**
 * Payments engine — local-first store + business rules.
 *
 * Single PaymentState persisted to localStorage (agri_payments_v1). All money
 * movement flows through this module: processPayment (with gateway attempt +
 * retry), refunds, wallet debit/credit, coupon validation, GST invoice
 * generation, subscriptions (create/renew/cancel/auto-renew/failed recovery)
 * and payment notifications. Every successful payment is mirrored into the
 * admin console store for back-office visibility.
 */

import type {
  Coupon,
  Invoice,
  InvoiceLine,
  PaymentAttempt,
  PaymentMethod,
  PaymentNotification,
  PaymentPurpose,
  PaymentState,
  PaymentTransaction,
  SavedPaymentMethod,
  SubscriptionStatus,
  UserSubscription,
} from './paymentTypes';
import {
  DEFAULT_GST_RATE,
  PAYMENT_SEED_VERSION,
  PAYMENT_STORAGE_KEY,
  SELLER_GSTIN,
  SELLER_NAME,
} from './paymentTypes';
import { buildSeedPaymentState } from './paymentSeed';
import { getDefaultGateway, type ChargeRequest } from './gateways';

const STORAGE_VERSION_KEY = 'agri_payments_version';
const MAX_NOTIFICATIONS = 50;

/* ── Persistence ──────────────────────────────────────────────────────── */

const isBrowser = (): boolean => typeof window !== 'undefined';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const loadStoredState = (): PaymentState | null => {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaymentState;
    if (!parsed || parsed.version !== PAYMENT_SEED_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
};

let state: PaymentState = loadStoredState() ?? buildSeedPaymentState();

const listeners = new Set<() => void>();

const persist = (next: PaymentState): void => {
  state = next;
  if (isBrowser()) {
    try {
      localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(STORAGE_VERSION_KEY, String(PAYMENT_SEED_VERSION));
    } catch {
      /* quota exceeded — keep in-memory state */
    }
  }
  listeners.forEach((l) => l());
};

const emit = (): void => listeners.forEach((l) => l());

/* ── Read API ─────────────────────────────────────────────────────────── */

export const getPaymentState = (): PaymentState => state;

export const subscribePaymentStore = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const resetPaymentData = (): void => {
  persist(buildSeedPaymentState());
};

/* ── Formatting ───────────────────────────────────────────────────────── */

export const fmtMoney = (value: number): string =>
  '₹' +
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/* ── Coupons ──────────────────────────────────────────────────────────── */

export interface CouponCheck {
  ok: boolean;
  reason?: string;
  coupon?: Coupon;
  discount?: number;
}

export const validateCoupon = (
  code: string,
  purpose: PaymentPurpose,
  subtotal: number,
): CouponCheck => {
  const coupon = state.coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  if (!coupon) return { ok: false, reason: 'Invalid coupon code' };
  if (!coupon.scope.includes(purpose)) return { ok: false, reason: 'Coupon not valid for this purchase' };
  if (coupon.validUntil && Date.parse(coupon.validUntil) < Date.now()) return { ok: false, reason: 'Coupon has expired' };
  if (coupon.validFrom && Date.parse(coupon.validFrom) > Date.now()) return { ok: false, reason: 'Coupon not active yet' };
  if (coupon.maxUses != null && coupon.used >= coupon.maxUses) return { ok: false, reason: 'Coupon usage limit reached' };
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    return { ok: false, reason: `Minimum order of ₹${coupon.minSubtotal} required` };
  }
  const discount =
    coupon.type === 'flat'
      ? Math.min(coupon.value, subtotal)
      : Math.min((subtotal * coupon.value) / 100, coupon.cap ?? Infinity);
  return { ok: true, coupon, discount: round2(discount) };
};

/* ── Amount computation ───────────────────────────────────────────────── */

export interface AmountBreakdown {
  subtotal: number;
  discount: number;
  couponCode?: string;
  gstRate: number;
  gstAmount: number;
  fee: number;
  total: number;
}

export const computeAmounts = (input: {
  subtotal: number;
  purpose: PaymentPurpose;
  couponCode?: string;
  gstRate?: number;
  method: PaymentMethod;
}): AmountBreakdown => {
  const gstRate = input.gstRate ?? (input.purpose === 'wallet' ? 0 : DEFAULT_GST_RATE);
  const check = input.couponCode ? validateCoupon(input.couponCode, input.purpose, input.subtotal) : null;
  const discount = check?.ok ? (check.discount ?? 0) : 0;
  const couponCode = check?.ok ? check.coupon?.code : undefined;
  const gstAmount = round2(((input.subtotal - discount) * gstRate) / 100);
  const fee = input.method === 'card' ? round2(input.subtotal * 0.02) : 0;
  const total = round2(input.subtotal - discount + gstAmount + fee);
  return { subtotal: input.subtotal, discount, couponCode, gstRate, gstAmount, fee, total };
};

/* ── Wallet ───────────────────────────────────────────────────────────── */

export const getWalletBalance = (): number => state.wallet.balance;

export const getUnreadNotificationCount = (): number =>
  state.notifications.filter((n) => !n.read).length;

const debitWallet = (amount: number, note: string, refId?: string): boolean => {
  if (state.wallet.balance < amount) return false;
  const balanceAfter = round2(state.wallet.balance - amount);
  state = {
    ...state,
    wallet: {
      balance: balanceAfter,
      updatedAt: new Date().toISOString(),
      transactions: [
        { id: uid('W'), type: 'debit', amount, balanceAfter, note, refId, createdAt: new Date().toISOString() },
        ...state.wallet.transactions,
      ].slice(0, 100),
    },
  };
  persist(state);
  emit();
  return true;
};

const creditWallet = (amount: number, note: string, refId?: string): void => {
  const balanceAfter = round2(state.wallet.balance + amount);
  state = {
    ...state,
    wallet: {
      balance: balanceAfter,
      updatedAt: new Date().toISOString(),
      transactions: [
        { id: uid('W'), type: 'credit', amount, balanceAfter, note, refId, createdAt: new Date().toISOString() },
        ...state.wallet.transactions,
      ].slice(0, 100),
    },
  };
  persist(state);
  emit();
};

/* ── Notifications ────────────────────────────────────────────────────── */

const pushNotification = (
  kind: PaymentNotification['kind'],
  title: string,
  body: string,
  txnId?: string,
): void => {
  state = {
    ...state,
    notifications: [
      { id: uid('N'), kind, title, body, txnId, read: false, createdAt: new Date().toISOString() },
      ...state.notifications,
    ].slice(0, MAX_NOTIFICATIONS),
  };
};

export const markAllNotificationsRead = (): void => {
  persist({ ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) });
};

export const markNotificationRead = (id: string): void => {
  persist({
    ...state,
    notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
  });
};

/* ── Invoices ─────────────────────────────────────────────────────────── */

const nextInvoiceNumber = (): string => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const max = state.invoices.reduce((m, inv) => {
    const n = Number(inv.number.split('-').pop());
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
};

export const generateInvoiceForTxn = (
  txn: PaymentTransaction,
  buyer: Invoice['buyer'],
): Invoice => {
  const line: InvoiceLine = {
    id: uid('L'),
    description: txn.description,
    qty: 1,
    unitPrice: round2(txn.subtotal - txn.discount),
    gstRate: txn.gstRate,
  };
  const taxBase = round2(txn.subtotal - txn.discount);
  const cgst = round2((taxBase * txn.gstRate) / 100 / 2);
  const sgst = round2((taxBase * txn.gstRate) / 100 / 2);
  const invoice: Invoice = {
    id: uid('INV'),
    number: nextInvoiceNumber(),
    txnId: txn.id,
    type: 'GST',
    sellerGstin: SELLER_GSTIN,
    buyer,
    lines: [line],
    subtotal: round2(txn.subtotal - txn.discount),
    discount: txn.discount,
    gstRate: txn.gstRate,
    cgst,
    sgst,
    total: txn.total,
    status: 'Paid',
    issuedAt: new Date().toISOString(),
    paidAt: txn.completedAt ?? new Date().toISOString(),
  };
  state = { ...state, invoices: [invoice, ...state.invoices] };
  return invoice;
};

/* ── Subscription helpers ─────────────────────────────────────────────── */

const periodMs = (period: 'month' | 'year'): number =>
  period === 'month' ? 30 * 86400000 : 365 * 86400000;

const upsertSubscription = (
  input: {
    planId: string;
    planName: string;
    price: number;
    period: 'month' | 'year';
    paymentMethod?: PaymentMethod;
    lastTxnId?: string;
    trial?: boolean;
  },
): UserSubscription => {
  const existing = state.subscriptions.find((s) => s.planId === input.planId);
  const start = existing?.id ? existing.start : new Date().toISOString();
  const renewAt = new Date(Date.now() + periodMs(input.period)).toISOString();
  const next: UserSubscription = existing
    ? {
        ...existing,
        price: input.price,
        period: input.period,
        status: input.trial ? 'Trial' : 'Active',
        renewAt,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        lastTxnId: input.lastTxnId ?? existing.lastTxnId,
        paymentMethod: input.paymentMethod ?? existing.paymentMethod,
      }
    : {
        id: uid('SUB'),
        planId: input.planId,
        planName: input.planName,
        price: input.price,
        period: input.period,
        status: input.trial ? 'Trial' : 'Active',
        start,
        renewAt,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        lastTxnId: input.lastTxnId,
        paymentMethod: input.paymentMethod,
      };
  const others = state.subscriptions.filter((s) => s.planId !== input.planId);
  state = { ...state, subscriptions: [next, ...others] };
  return next;
};

/** Marks overdue renewals PastDue (failed recovery) and stale subs Expired. */
export const evaluateSubscriptionStates = (): void => {
  const now = Date.now();
  let changed = false;
  const subscriptions = state.subscriptions.map((s) => {
    if (s.status === 'Active' && Date.parse(s.renewAt) < now && s.autoRenew) {
      changed = true;
      pushNotification('failure', 'Renewal payment failed', `${s.planName} renewal could not be charged. Tap to retry.`);
      return { ...s, status: 'PastDue' as SubscriptionStatus };
    }
    if (s.status === 'PastDue' && Date.parse(s.renewAt) < now - 30 * 86400000) {
      changed = true;
      return { ...s, status: 'Expired' as SubscriptionStatus };
    }
    return s;
  });
  if (changed) persist({ ...state, subscriptions });
};

/* ── Core: process a payment ──────────────────────────────────────────── */

export interface ProcessPaymentInput {
  purpose: PaymentPurpose;
  subtotal: number;
  description: string;
  method: PaymentMethod;
  couponCode?: string;
  gstRate?: number;
  refId?: string;
  upiId?: string;
  cardLast4?: string;
  bank?: string;
  customer?: { name?: string; phone?: string; email?: string };
  meta?: Record<string, string | number | boolean>;
}

const buildAttempt = (method: PaymentMethod, amount: number): PaymentAttempt => ({
  id: uid('AT'),
  method,
  gateway: getDefaultGateway().name,
  amount,
  status: 'Processing',
  createdAt: new Date().toISOString(),
});

const applySideEffects = (txn: PaymentTransaction): PaymentState => {
  const txnExists = state.transactions.some((t) => t.id === txn.id);
  let next: PaymentState = {
    ...state,
    transactions: txnExists
      ? state.transactions.map((t) => (t.id === txn.id ? txn : t))
      : [txn, ...state.transactions],
  };
  if (txn.couponCode) {
    next = {
      ...next,
      coupons: next.coupons.map((c) =>
        c.code.toUpperCase() === txn.couponCode!.toUpperCase() ? { ...c, used: c.used + 1 } : c,
      ),
    };
  }
  if (txn.purpose === 'wallet') {
    creditWallet(txn.total, txn.description, txn.refId);
    next = { ...next, wallet: state.wallet };
    pushNotification('wallet', 'Wallet updated', `₹${txn.total.toFixed(2)} ${txn.description}`, txn.id);
    next = { ...next, notifications: state.notifications };
  } else if (txn.purpose === 'subscription') {
    const planId = String(txn.meta?.planId ?? '');
    const plan = state.plans.find((p) => p.id === planId);
    if (plan) {
      const period = txn.meta?.period === 'year' ? 'year' : 'month';
      upsertSubscription({
        planId: plan.id,
        planName: plan.name,
        price: period === 'year' ? plan.priceYearly : plan.priceMonthly,
        period,
        paymentMethod: txn.method,
        lastTxnId: txn.id,
      });
      next = { ...next, subscriptions: state.subscriptions };
    }
    pushNotification('success', 'Subscription active', `${txn.description} is now active.`, txn.id);
    next = { ...next, notifications: state.notifications };
  } else {
    pushNotification('success', 'Payment successful', `${txn.description} — ₹${txn.total.toFixed(2)}`, txn.id);
    next = { ...next, notifications: state.notifications };
  }
  if (txn.gstRate > 0 && !txn.invoiceId) {
    const invoice = generateInvoiceForTxn(txn, {
      name: txn.customer?.name ?? 'AgriConnect Farmer',
      phone: txn.customer?.phone,
    });
    next = {
      ...next,
      invoices: state.invoices,
      transactions: next.transactions.map((t) => (t.id === txn.id ? { ...t, invoiceId: invoice.id } : t)),
    };
  }
  syncPaymentToAdmin(txn);
  return next;
};

export const processPayment = async (input: ProcessPaymentInput): Promise<PaymentTransaction> => {
  if (!Number.isFinite(input.subtotal) || input.subtotal <= 0) {
    throw new Error('Invalid payment amount');
  }
  const amounts = computeAmounts({
    subtotal: input.subtotal,
    purpose: input.purpose,
    couponCode: input.couponCode,
    gstRate: input.gstRate,
    method: input.method,
  });
  const gateway = getDefaultGateway();
  const txnId = uid('TXN');
  const txn: PaymentTransaction = {
    id: txnId,
    refId: input.refId,
    purpose: input.purpose,
    description: input.description,
    method: input.method,
    subtotal: amounts.subtotal,
    discount: amounts.discount,
    couponCode: amounts.couponCode,
    gstRate: amounts.gstRate,
    gstAmount: amounts.gstAmount,
    fee: amounts.fee,
    total: amounts.total,
    currency: 'INR',
    status: 'Processing',
    gateway: gateway.name,
    attempts: [buildAttempt(input.method, amounts.total)],
    upiId: input.upiId,
    cardLast4: input.cardLast4,
    bank: input.bank,
    initiatedAt: new Date().toISOString(),
    meta: input.meta,
    customer: input.customer,
  };

  /* Wallet method debits immediately (a "hold") and is released on failure. */
  if (input.method === 'wallet' && input.purpose !== 'wallet') {
    if (!debitWallet(amounts.total, txn.description, txnId)) {
      txn.status = 'Failed';
      txn.failureReason = 'Insufficient wallet balance';
      persist({ ...state, transactions: [txn, ...state.transactions] });
      pushNotification('failure', 'Payment failed', 'Insufficient wallet balance for this payment.', txnId);
      return txn;
    }
  }

  persist({ ...state, transactions: [txn, ...state.transactions] });

  const chargeReq: ChargeRequest = {
    amount: amounts.total,
    method: input.method,
    orderId: txnId,
    description: input.description,
    upiId: input.upiId,
    cardLast4: input.cardLast4,
    bank: input.bank,
    customer: input.customer,
    meta: { ...(input.meta ?? {}), attempt: 0 },
  };

  const result = await gateway.charge(chargeReq);

  txn.attempts[0].status = result.success ? 'Success' : 'Failed';
  txn.attempts[0].completedAt = new Date().toISOString();
  txn.attempts[0].gatewayRef = result.gatewayRef;
  txn.attempts[0].failureReason = result.failureReason;

  if (result.success) {
    txn.status = 'Success';
    txn.completedAt = new Date().toISOString();
    txn.gatewayRef = result.gatewayRef;
    state = applySideEffects(txn);
    persist(state);
  } else {
    txn.status = 'Failed';
    txn.failureReason = result.failureReason ?? 'Payment failed';
    if (input.method === 'wallet' && input.purpose !== 'wallet') {
      creditWallet(amounts.total, `Refund of failed payment ${txnId}`, txnId);
      pushNotification('failure', 'Wallet hold released', `₹${amounts.total.toFixed(2)} returned to your wallet.`, txnId);
    } else {
      pushNotification('failure', 'Payment failed', `${txn.description} — ${txn.failureReason}.`, txnId);
    }
    const failedExists = state.transactions.some((t) => t.id === txn.id);
    persist({
      ...state,
      transactions: failedExists
        ? state.transactions.map((t) => (t.id === txn.id ? txn : t))
        : [txn, ...state.transactions],
    });
  }
  return txn;
};

/* ── Retry logic ──────────────────────────────────────────────────────── */

export const retryTransaction = async (txnId: string): Promise<PaymentTransaction | null> => {
  const index = state.transactions.findIndex((t) => t.id === txnId);
  if (index < 0) return null;
  const existing = state.transactions[index];
  if (existing.status !== 'Failed' && existing.status !== 'Expired') return existing;

  const gateway = getDefaultGateway();
  const attempt = buildAttempt(existing.method, existing.total);
  existing.attempts = [...existing.attempts, attempt];
  existing.status = 'Processing';
  existing.failureReason = undefined;
  persist({ ...state, transactions: state.transactions.map((t, i) => (i === index ? existing : t)) });

  const chargeReq: ChargeRequest = {
    amount: existing.total,
    method: existing.method,
    orderId: existing.id,
    description: existing.description,
    upiId: existing.upiId,
    cardLast4: existing.cardLast4,
    bank: existing.bank,
    meta: { ...(existing.meta ?? {}), attempt: existing.attempts.length - 1 },
  };
  const result = await gateway.charge(chargeReq);

  const attemptIndex = existing.attempts.length - 1;
  existing.attempts[attemptIndex].status = result.success ? 'Success' : 'Failed';
  existing.attempts[attemptIndex].completedAt = new Date().toISOString();
  existing.attempts[attemptIndex].gatewayRef = result.gatewayRef;
  existing.attempts[attemptIndex].failureReason = result.failureReason;

  if (result.success) {
    existing.status = 'Success';
    existing.completedAt = new Date().toISOString();
    existing.gatewayRef = result.gatewayRef;
    state = applySideEffects(existing);
    pushNotification('retry', 'Payment recovered', `${existing.description} succeeded on retry.`, existing.id);
    persist(state);
  } else {
    existing.status = 'Failed';
    existing.failureReason = result.failureReason ?? 'Payment failed';
    pushNotification('failure', 'Retry failed', `${existing.description} — ${existing.failureReason}.`, existing.id);
    persist({ ...state, transactions: state.transactions.map((t, i) => (i === index ? existing : t)) });
  }
  return existing;
};

/* ── Refunds ──────────────────────────────────────────────────────────── */

export const processRefund = async (
  txnId: string,
  reason: string,
  amount?: number,
): Promise<PaymentTransaction | null> => {
  const index = state.transactions.findIndex((t) => t.id === txnId);
  if (index < 0) return null;
  const txn = state.transactions[index];
  if (txn.status !== 'Success' && txn.status !== 'RefundPending') return txn;
  const refundAmount = amount && amount < txn.total ? amount : txn.total;

  txn.status = 'RefundPending';
  txn.refund = { amount: refundAmount, reason, initiatedAt: new Date().toISOString() };
  persist({ ...state, transactions: state.transactions.map((t, i) => (i === index ? txn : t)) });

  const gateway = getDefaultGateway();
  const result = await (gateway.refund
    ? gateway.refund(txn.gatewayRef ?? txn.id, refundAmount, reason)
    : { success: true });

  if (result.success) {
    txn.status = refundAmount < txn.total ? 'PartialRefund' : 'Refunded';
    txn.refund!.completedAt = new Date().toISOString();
    txn.refund!.gatewayRef = result.gatewayRef;
    creditWallet(refundAmount, `Refund — ${txn.description}`, txnId);
    if (txn.invoiceId) {
      const invIndex = state.invoices.findIndex((inv) => inv.id === txn.invoiceId);
      if (invIndex >= 0) {
        const invoices = state.invoices.map((inv, i) =>
          i === invIndex ? { ...inv, status: 'Refunded' as const } : inv,
        );
        state = { ...state, invoices };
      }
    }
    pushNotification('refund', 'Refund processed', `₹${refundAmount.toFixed(2)} refunded to your wallet.`, txnId);
  } else {
    txn.status = 'Success';
    txn.refund = undefined;
    pushNotification('failure', 'Refund failed', `Refund for ${txn.description} could not be processed.`, txnId);
  }
  const finalIndex = state.transactions.findIndex((t) => t.id === txnId);
  const transactions = state.transactions.map((t, i) => (i === finalIndex ? txn : t));
  persist({ ...state, transactions });
  return txn;
};

/* ── Wallet top-up ────────────────────────────────────────────────────── */

export const addWalletMoney = async (
  amount: number,
  method: PaymentMethod,
  upiId?: string,
): Promise<PaymentTransaction> =>
  processPayment({
    purpose: 'wallet',
    subtotal: amount,
    description: 'Wallet top-up',
    method,
    upiId,
    gstRate: 0,
  });

/* ── Subscriptions ────────────────────────────────────────────────────── */

export const subscribeToPlan = async (input: {
  planId: string;
  period: 'month' | 'year';
  method: PaymentMethod;
  couponCode?: string;
}): Promise<{ txn?: PaymentTransaction; subscription: UserSubscription; wasFree: boolean }> => {
  const plan = state.plans.find((p) => p.id === input.planId);
  if (!plan) throw new Error('Plan not found');
  const price = input.period === 'year' ? plan.priceYearly : plan.priceMonthly;

  if (price <= 0) {
    const subscription = upsertSubscription({
      planId: plan.id,
      planName: plan.name,
      price: 0,
      period: input.period,
      paymentMethod: input.method,
      trial: false,
    });
    pushNotification('success', 'Plan active', `${plan.name} is now active.`, subscription.id);
    persist({ ...state });
    return { subscription, wasFree: true };
  }

  const txn = await processPayment({
    purpose: 'subscription',
    subtotal: price,
    description: `${plan.name} — ${input.period === 'year' ? 'yearly' : 'monthly'} plan`,
    method: input.method,
    couponCode: input.couponCode,
    refId: input.planId,
    meta: { planId: plan.id, period: input.period },
  });

  const subscription =
    state.subscriptions.find((s) => s.planId === plan.id) ??
    upsertSubscription({
      planId: plan.id,
      planName: plan.name,
      price,
      period: input.period,
      paymentMethod: input.method,
      lastTxnId: txn.id,
    });
  persist({ ...state, subscriptions: state.subscriptions.map((s) => (s.id === subscription.id ? subscription : s)) });
  return { txn, subscription, wasFree: false };
};

export const renewSubscription = async (
  subscriptionId: string,
  method?: PaymentMethod,
): Promise<{ txn: PaymentTransaction; subscription: UserSubscription } | null> => {
  const sub = state.subscriptions.find((s) => s.id === subscriptionId);
  if (!sub) return null;
  const plan = state.plans.find((p) => p.id === sub.planId);
  const price = sub.period === 'year' ? (plan?.priceYearly ?? sub.price) : (plan?.priceMonthly ?? sub.price);

  const txn = await processPayment({
    purpose: 'subscription',
    subtotal: price,
    description: `${sub.planName} renewal — ${sub.period === 'year' ? 'yearly' : 'monthly'}`,
    method: method ?? sub.paymentMethod ?? 'upi',
    refId: sub.planId,
    meta: { planId: sub.planId, period: sub.period },
  });

  const index = state.subscriptions.findIndex((s) => s.id === subscriptionId);
  const subscriptions = state.subscriptions.map((s, i) =>
    i === index
      ? {
          ...s,
          status: (txn.status === 'Success' ? 'Active' : 'PastDue') as SubscriptionStatus,
          renewAt: txn.status === 'Success' ? new Date(Date.now() + periodMs(s.period)).toISOString() : s.renewAt,
          lastTxnId: txn.id,
          paymentMethod: method ?? s.paymentMethod,
        }
      : s,
  );
  persist({ ...state, subscriptions });
  return { txn, subscription: subscriptions[index] };
};

export const cancelSubscription = (subscriptionId: string): void => {
  state = {
    ...state,
    subscriptions: state.subscriptions.map((s) =>
      s.id === subscriptionId ? { ...s, cancelAtPeriodEnd: true, autoRenew: false } : s,
    ),
  };
  pushNotification('renewal', 'Subscription updated', 'Your subscription will end after the current period.');
  persist({ ...state });
};

export const setAutoRenew = (subscriptionId: string, enabled: boolean): void => {
  persist({
    ...state,
    subscriptions: state.subscriptions.map((s) =>
      s.id === subscriptionId ? { ...s, autoRenew: enabled, cancelAtPeriodEnd: !enabled } : s,
    ),
  });
};

export const recoverFailedSubscription = async (
  subscriptionId: string,
): Promise<PaymentTransaction | null> => {
  const sub = state.subscriptions.find((s) => s.id === subscriptionId);
  if (!sub || !sub.lastTxnId) return null;
  return retryTransaction(sub.lastTxnId);
};

/* ── Saved methods ────────────────────────────────────────────────────── */

export const addSavedMethod = (method: PaymentMethod, label: string, detail: string): void => {
  const next: SavedPaymentMethod = {
    id: uid('M'),
    method,
    label,
    detail,
    isDefault: state.savedMethods.length === 0,
    addedAt: new Date().toISOString(),
  };
  persist({ ...state, savedMethods: [next, ...state.savedMethods].slice(0, 6) });
};

export const removeSavedMethod = (id: string): void => {
  persist({ ...state, savedMethods: state.savedMethods.filter((m) => m.id !== id) });
};

/* ── Admin console sync ───────────────────────────────────────────────── */

const syncPaymentToAdmin = (txn: PaymentTransaction): void => {
  if (!isBrowser()) return;
  try {
    // Dynamic import keeps the payments bundle independent of the admin console.
    void import('../../admin/domain/adminStore').then((admin) => {
      const status =
        txn.status === 'Success' ? 'Success' : txn.status === 'Refunded' || txn.status === 'PartialRefund' ? 'Refunded' : 'Failed';
      admin.mutateCollection('payments', (rows) => [
        {
          id: txn.id,
          payer: txn.customer?.name ?? 'Farmer (app)',
          purpose: txn.description,
          method: txn.method,
          amount: txn.total,
          fee: txn.fee,
          status,
          date: txn.initiatedAt,
        },
        ...rows,
      ]);
      admin.logAdminAudit({
        action: 'CREATE',
        entity: 'payments',
        entityId: txn.id,
        summary: `${txn.description} — ${txn.status}`,
      });
    });
  } catch {
    /* admin store unavailable — payments still recorded in own ledger */
  }
};
