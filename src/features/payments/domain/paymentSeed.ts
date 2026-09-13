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

const iso = (daysAgo: number): string => {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString();
};

const seedWallet = (): Wallet => ({
  balance: 0,
  updatedAt: new Date().toISOString(),
  transactions: [],
});

const seedTransactions = (): PaymentTransaction[] => [];

const seedSubscriptions = (): UserSubscription[] => [];

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

const seedInvoices = (): Invoice[] => [];

const seedNotifications = (): PaymentNotification[] => [];

const seedSavedMethods = (): SavedPaymentMethod[] => [];

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
