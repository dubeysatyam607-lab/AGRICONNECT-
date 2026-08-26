import type {
  Coupon,
  Invoice,
  PaymentNotification,
  PaymentState,
  PaymentTransaction,
  PlanDefinition,
  SavedPaymentMethod,
  UserSubscription,
  Wallet,
} from './paymentTypes';
import { PAYMENT_SEED_VERSION } from './paymentTypes';

const uid = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const iso = (daysAgo: number): string => {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString();
};

const seedWallet = (): Wallet => ({
  balance: 2500,
  updatedAt: iso(1),
  transactions: [
    { id: uid('W'), type: 'credit', amount: 500, balanceAfter: 2500, note: 'Referral bonus', createdAt: iso(6) },
    { id: uid('W'), type: 'credit', amount: 2000, balanceAfter: 2000, note: 'Wallet top-up (UPI)', createdAt: iso(12) },
    { id: uid('W'), type: 'debit', amount: 340, balanceAfter: 1660, note: 'Tractor rental — rotavator', createdAt: iso(9) },
  ],
});

const seedTransactions = (): PaymentTransaction[] => {
  const txns: PaymentTransaction[] = [
    {
      id: 'TXN-2026-001',
      refId: 'ORD-10240',
      purpose: 'marketplace',
      description: 'Agri store order — seeds & fertilizer',
      method: 'upi',
      subtotal: 1080,
      discount: 108,
      couponCode: 'KHETI10',
      gstRate: 18,
      gstAmount: 174.96,
      fee: 0,
      total: 1146.96,
      currency: 'INR',
      status: 'Success',
      gateway: 'razorpay',
      gatewayRef: 'pay_LIVE9f2ac11b',
      attempts: [{ id: 'AT-1', method: 'upi', gateway: 'razorpay', amount: 1146.96, status: 'Success', createdAt: iso(3), completedAt: iso(3), gatewayRef: 'pay_LIVE9f2ac11b' }],
      upiId: 'farmer.ravi@okhdfc',
      initiatedAt: iso(3),
      completedAt: iso(3),
      invoiceId: 'INV-2026-0003',
    },
    {
      id: 'TXN-2026-002',
      refId: 'SUB-2026-001',
      purpose: 'subscription',
      description: 'Kisan AI Pro — monthly plan',
      method: 'card',
      subtotal: 199,
      discount: 0,
      gstRate: 18,
      gstAmount: 35.82,
      fee: 3.94,
      total: 238.76,
      currency: 'INR',
      status: 'Success',
      gateway: 'razorpay',
      gatewayRef: 'pay_LIVE77cc320a',
      attempts: [{ id: 'AT-1', method: 'card', gateway: 'razorpay', amount: 238.76, status: 'Success', createdAt: iso(28), completedAt: iso(28), gatewayRef: 'pay_LIVE77cc320a' }],
      cardLast4: '4821',
      initiatedAt: iso(28),
      completedAt: iso(28),
      invoiceId: 'INV-2026-0001',
    },
    {
      id: 'TXN-2026-003',
      refId: 'BK-2026-0041',
      purpose: 'rental',
      description: 'Tractor rental — rotavator (3 hrs)',
      method: 'netbanking',
      subtotal: 800,
      discount: 0,
      gstRate: 18,
      gstAmount: 144,
      fee: 0,
      total: 944,
      currency: 'INR',
      status: 'Refunded',
      gateway: 'razorpay',
      gatewayRef: 'pay_LIVE55a1d9e0',
      attempts: [{ id: 'AT-1', method: 'netbanking', gateway: 'razorpay', amount: 944, status: 'Success', createdAt: iso(9), completedAt: iso(9), gatewayRef: 'pay_LIVE55a1d9e0' }],
      bank: 'State Bank of India',
      initiatedAt: iso(9),
      completedAt: iso(9),
      refund: { amount: 944, reason: 'Rental cancelled by farmer', initiatedAt: iso(7), completedAt: iso(7), gatewayRef: 'rfnd_LIVE88b2' },
      invoiceId: 'INV-2026-0002',
    },
    {
      id: 'TXN-2026-004',
      purpose: 'wallet',
      description: 'Wallet top-up',
      method: 'upi',
      subtotal: 1000,
      discount: 0,
      gstRate: 0,
      gstAmount: 0,
      fee: 0,
      total: 1000,
      currency: 'INR',
      status: 'Failed',
      gateway: 'simulated',
      attempts: [
        { id: 'AT-1', method: 'upi', gateway: 'simulated', amount: 1000, status: 'Failed', createdAt: iso(2), completedAt: iso(2), failureReason: 'UPI transaction rejected by bank' },
        { id: 'AT-2', method: 'upi', gateway: 'simulated', amount: 1000, status: 'Failed', createdAt: iso(2), completedAt: iso(2), failureReason: 'Invalid UPI PIN' },
      ],
      upiId: 'farmer.ravi@oksbi',
      initiatedAt: iso(2),
    },
    {
      id: 'TXN-2026-005',
      purpose: 'pay-per-acre',
      refId: 'PPA-2026-001',
      description: 'Land preparation — 6 acres × ₹450',
      method: 'wallet',
      subtotal: 2700,
      discount: 0,
      gstRate: 18,
      gstAmount: 486,
      fee: 0,
      total: 3186,
      currency: 'INR',
      status: 'Success',
      gateway: 'simulated',
      gatewayRef: 'pay_sim_4a1c',
      attempts: [{ id: 'AT-1', method: 'wallet', gateway: 'simulated', amount: 3186, status: 'Success', createdAt: iso(1), completedAt: iso(1), gatewayRef: 'pay_sim_4a1c' }],
      initiatedAt: iso(1),
      completedAt: iso(1),
      meta: { acres: 6, ratePerAcre: 450 },
    },
  ];
  return txns;
};

const seedSubscriptions = (): UserSubscription[] => [
  {
    id: 'SUB-2026-001',
    planId: 'plan-pro',
    planName: 'Kisan AI Pro',
    price: 199,
    period: 'month',
    status: 'Active',
    start: iso(28),
    renewAt: iso(-2),
    autoRenew: true,
    cancelAtPeriodEnd: false,
    lastTxnId: 'TXN-2026-002',
    paymentMethod: 'card',
  },
];

const seedPlans = (): PlanDefinition[] => [
  {
    id: 'plan-free',
    name: 'Kisan Free',
    tagline: 'Everything you need to get started',
    priceMonthly: 0,
    priceYearly: 0,
    features: ['Mandi prices & weather', 'Basic AI assistant (20 chats/mo)', 'Community access', 'Farm ledger'],
  },
  {
    id: 'plan-plus',
    name: 'Kisan Plus',
    tagline: 'For active farmers',
    priceMonthly: 49,
    priceYearly: 490,
    features: ['Unlimited AI assistant', 'Crop Doctor unlimited', 'Price alerts', 'Priority support', 'Reduced ads'],
  },
  {
    id: 'plan-pro',
    name: 'Kisan AI Pro',
    tagline: 'Best for serious farmers',
    priceMonthly: 99,
    priceYearly: 990,
    trialDays: 7,
    popular: true,
    features: ['Everything in Plus', 'AI crop advisor', 'Yield forecasting', 'Advanced analytics', 'Ad-free experience'],
  },
];

const seedCoupons = (): Coupon[] => [
  { id: 'C-1', code: 'WELCOME10', type: 'percent', value: 10, cap: 200, minSubtotal: 499, maxUses: 5000, used: 812, scope: ['marketplace', 'rental'], validFrom: iso(90), validUntil: iso(-90) },
  { id: 'C-2', code: 'KHETI10', type: 'percent', value: 10, cap: 250, minSubtotal: 999, maxUses: 2000, used: 344, scope: ['marketplace'], validFrom: iso(60), validUntil: iso(-60) },
  { id: 'C-3', code: 'SAVE150', type: 'flat', value: 150, minSubtotal: 1500, maxUses: 1000, used: 128, scope: ['marketplace', 'rental'], validFrom: iso(30), validUntil: iso(-30) },
  { id: 'C-4', code: 'AIWEEK', type: 'percent', value: 25, cap: 100, minSubtotal: 99, maxUses: 500, used: 61, scope: ['subscription'], validFrom: iso(14), validUntil: iso(14) },
  { id: 'C-5', code: 'ACRE25', type: 'flat', value: 25, minSubtotal: 500, maxUses: 3000, used: 402, scope: ['pay-per-acre'], validFrom: iso(45), validUntil: iso(-45) },
];

const seedInvoices = (): Invoice[] => [
  {
    id: 'INV-2026-0001',
    number: 'INV-2026-0001',
    txnId: 'TXN-2026-002',
    type: 'GST',
    sellerGstin: '07AAGCA9998B1Z3',
    buyer: { name: 'Ravi Kumar', gstin: '', phone: '+91 98xxxxxx10', address: 'Village Ladpura, Jaipur, Rajasthan' },
    lines: [{ id: 'L1', description: 'Kisan AI Pro — monthly subscription', qty: 1, unitPrice: 199, gstRate: 18 }],
    subtotal: 199,
    discount: 0,
    gstRate: 18,
    cgst: 17.91,
    sgst: 17.91,
    total: 238.76,
    status: 'Paid',
    issuedAt: iso(28),
    paidAt: iso(28),
  },
  {
    id: 'INV-2026-0002',
    number: 'INV-2026-0002',
    txnId: 'TXN-2026-003',
    type: 'GST',
    sellerGstin: '07AAGCA9998B1Z3',
    buyer: { name: 'Ravi Kumar', phone: '+91 98xxxxxx10' },
    lines: [{ id: 'L1', description: 'Tractor rental — rotavator (3 hrs)', qty: 1, unitPrice: 944, gstRate: 18 }],
    subtotal: 944,
    discount: 0,
    gstRate: 18,
    cgst: 84.96,
    sgst: 84.96,
    total: 944,
    status: 'Refunded',
    issuedAt: iso(9),
    paidAt: iso(9),
  },
  {
    id: 'INV-2026-0003',
    number: 'INV-2026-0003',
    txnId: 'TXN-2026-001',
    type: 'GST',
    sellerGstin: '07AAGCA9998B1Z3',
    buyer: { name: 'Ravi Kumar', phone: '+91 98xxxxxx10' },
    lines: [
      { id: 'L1', description: 'Wheat seeds (Hy-S 511) — 10 kg', qty: 1, unitPrice: 480, gstRate: 5 },
      { id: 'L2', description: 'DAP Fertilizer — 25 kg', qty: 1, unitPrice: 600, gstRate: 5 },
    ],
    subtotal: 1080,
    discount: 108,
    gstRate: 18,
    cgst: 87.48,
    sgst: 87.48,
    total: 1146.96,
    status: 'Paid',
    issuedAt: iso(3),
    paidAt: iso(3),
  },
];

const seedNotifications = (): PaymentNotification[] => [
  { id: uid('N'), txnId: 'TXN-2026-005', kind: 'success', title: 'Payment successful', body: 'Pay-per-acre ₹3,186 paid via Wallet balance.', read: false, createdAt: iso(1) },
  { id: uid('N'), kind: 'renewal', title: 'Subscription renews in 3 days', body: 'Kisan AI Pro (₹199/mo) will auto-renew. Add funds or manage below.', read: false, createdAt: iso(0.5) },
  { id: uid('N'), txnId: 'TXN-2026-004', kind: 'failure', title: 'Payment failed', body: 'Wallet top-up of ₹1,000 failed. Tap to retry.', read: true, createdAt: iso(2) },
];

const seedSavedMethods = (): SavedPaymentMethod[] => [
  { id: uid('M'), method: 'upi', label: 'UPI', detail: 'farmer.ravi@okhdfc', isDefault: true, addedAt: iso(60) },
  { id: uid('M'), method: 'card', label: 'HDFC Card', detail: '•••• 4821', isDefault: false, addedAt: iso(45) },
];

export const buildSeedPaymentState = (): PaymentState => ({
  version: PAYMENT_SEED_VERSION,
  wallet: seedWallet(),
  transactions: seedTransactions(),
  subscriptions: seedSubscriptions(),
  coupons: seedCoupons(),
  invoices: seedInvoices(),
  notifications: seedNotifications(),
  savedMethods: seedSavedMethods(),
  plans: seedPlans(),
});
