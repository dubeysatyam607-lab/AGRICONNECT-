/**
 * Payments — domain types for the AgriConnect payment system.
 *
 * A single unified ledger (PaymentState) powers wallet balance, transactions,
 * GST invoices, coupons, subscriptions and notifications. It is persisted
 * locally (agri_payments_v1) and designed so a backend can take over later:
 * every mutation flows through the gateway adapter layer (see gateways.ts).
 */

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

export type PaymentPurpose = 'marketplace' | 'rental' | 'subscription' | 'wallet' | 'pay-per-acre';

export type PaymentStatus =
  | 'Initiated'
  | 'Processing'
  | 'Success'
  | 'Failed'
  | 'Expired'
  | 'RefundPending'
  | 'Refunded'
  | 'PartialRefund';

export type GatewayName = 'razorpay' | 'stripe' | 'simulated';

export interface PaymentAttempt {
  id: string;
  method: PaymentMethod;
  gateway: GatewayName;
  amount: number;
  status: 'Processing' | 'Success' | 'Failed';
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  gatewayRef?: string;
}

export interface PaymentRefund {
  amount: number;
  reason: string;
  initiatedAt: string;
  completedAt?: string;
  gatewayRef?: string;
}

/** Single unified payment transaction (superset of order/rental/sub charges). */
export interface PaymentTransaction {
  id: string;
  refId?: string;
  purpose: PaymentPurpose;
  description: string;
  method: PaymentMethod;
  subtotal: number;
  discount: number;
  couponCode?: string;
  gstRate: number;
  gstAmount: number;
  fee: number;
  total: number;
  currency: 'INR';
  status: PaymentStatus;
  gateway: GatewayName;
  gatewayRef?: string;
  attempts: PaymentAttempt[];
  failureReason?: string;
  upiId?: string;
  cardLast4?: string;
  bank?: string;
  initiatedAt: string;
  completedAt?: string;
  refund?: PaymentRefund;
  invoiceId?: string;
  customer?: { name?: string; phone?: string; email?: string };
  /** Optional structured metadata (acres/rate, plan id, order lines...). */
  meta?: Record<string, string | number | boolean>;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  refId?: string;
  note: string;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  updatedAt: string;
  transactions: WalletTransaction[];
}

export type SubscriptionStatus = 'Trial' | 'Active' | 'PastDue' | 'Expired' | 'Cancelled';

export interface UserSubscription {
  id: string;
  planId: string;
  planName: string;
  price: number;
  period: 'month' | 'year';
  status: SubscriptionStatus;
  start: string;
  renewAt: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  lastTxnId?: string;
  paymentMethod?: PaymentMethod;
}

export interface PlanDefinition {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  trialDays?: number;
  popular?: boolean;
}

export interface InvoiceLine {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  gstRate: number;
}

export interface Invoice {
  id: string;
  number: string;
  txnId: string;
  type: 'GST';
  sellerGstin: string;
  buyer: { name: string; gstin?: string; phone?: string; address?: string };
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  total: number;
  status: 'Issued' | 'Paid' | 'Refunded';
  issuedAt: string;
  paidAt?: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  cap?: number;
  minSubtotal?: number;
  maxUses?: number;
  used: number;
  scope: PaymentPurpose[];
  validFrom: string;
  validUntil: string;
}

export type NotificationKind = 'success' | 'failure' | 'refund' | 'renewal' | 'retry' | 'wallet';

export interface PaymentNotification {
  id: string;
  txnId?: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface SavedPaymentMethod {
  id: string;
  method: PaymentMethod;
  label: string;
  detail: string;
  isDefault: boolean;
  addedAt: string;
}

export interface PaymentState {
  version: number;
  wallet: Wallet;
  transactions: PaymentTransaction[];
  subscriptions: UserSubscription[];
  coupons: Coupon[];
  invoices: Invoice[];
  notifications: PaymentNotification[];
  savedMethods: SavedPaymentMethod[];
  plans: PlanDefinition[];
}

export const PAYMENT_STORAGE_KEY = 'agri_payments_v1';
export const PAYMENT_SESSION_KEY = 'agri_payments_session_v1';
export const PAYMENT_SEED_VERSION = 1;

/** GST applies to physical goods (marketplace) and services by default. */
export const DEFAULT_GST_RATE = 18;

export const SELLER_GSTIN = '07AAGCA9998B1Z3';
export const SELLER_NAME = 'AgriConnect Retail LLP';
