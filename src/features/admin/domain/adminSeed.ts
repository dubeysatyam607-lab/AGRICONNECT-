import type { AdminState, AdminRole, AdminUser } from './adminTypes';
import { ADMIN_SEED_VERSION } from './adminTypes';

export const uid = (): string =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

/* ── RBAC System Roles ─────────────────────────────────────────────────── */

export const seedAdminRoles: AdminRole[] = [
  {
    id: 'role-super',
    name: 'Super Admin',
    description: 'Unrestricted access across every module.',
    permissions: ['*'],
    memberCount: 1,
    protected: true,
  },
  {
    id: 'role-ops',
    name: 'Operations Manager',
    description: 'Manages users, orders, rentals and support tickets.',
    permissions: [
      'farmers.read', 'farmers.write', 'orders.read', 'orders.write',
      'rentals.read', 'rentals.write', 'support.read', 'support.write',
      'verification.read', 'verification.write', 'reports.read',
    ],
    memberCount: 1,
    protected: false,
  },
  {
    id: 'role-content',
    name: 'Content Editor',
    description: 'Publishes news, knowledge hub, FAQ and scheme content.',
    permissions: [
      'news.read', 'news.write', 'knowledge.read', 'knowledge.write',
      'faq.read', 'faq.write', 'schemes.read', 'schemes.write', 'push.read',
    ],
    memberCount: 1,
    protected: false,
  },
  {
    id: 'role-finance',
    name: 'Finance Officer',
    description: 'Owns payments, subscriptions and advertising budgets.',
    permissions: [
      'payments.read', 'payments.write', 'subscriptions.read',
      'subscriptions.write', 'ads.read', 'ads.write',
    ],
    memberCount: 1,
    protected: false,
  },
  {
    id: 'role-support',
    name: 'Support Admin',
    description: 'Handles customer queries, reports and verification requests.',
    permissions: [
      'support.read', 'support.write', 'reports.read', 'reports.write',
      'verification.read', 'verification.write',
    ],
    memberCount: 1,
    protected: false,
  },
  {
    id: 'role-analyst',
    name: 'Analyst',
    description: 'Read-only access to analytics, crash reports and weather.',
    permissions: [
      'analytics.read', 'crash.read', 'weather.read', 'mandi.read',
      'farmers.read', 'orders.read', 'audit.read',
    ],
    memberCount: 1,
    protected: false,
  },
];

export const seedAdminUsers: AdminUser[] = [
  {
    id: 'admin-owner-01',
    name: 'Satyam Dubey',
    email: 'dubeysatyam607@gmail.com',
    phone: '+91 99999 88888',
    roleId: 'role-super',
    status: 'Active',
    twoFactor: true,
    lastLogin: new Date().toISOString(),
    created: '2026-01-01T00:00:00.000Z',
  },
];

/* ── Clean Initial State (Strictly Zero Fake Data) ─────────────────────── */

export const buildSeedState = (): AdminState => ({
  version: ADMIN_SEED_VERSION,
  seededAt: new Date().toISOString(),
  farmers: [],
  equipmentOwners: [],
  products: [],
  orders: [],
  tractorRentals: [],
  schemes: [],
  newsArticles: [],
  knowledgeArticles: [],
  faqs: [],
  aiPrompts: [],
  pushCampaigns: [],
  weatherReadings: [],
  mandiPrices: [],
  reports: [],
  verificationRequests: [],
  kycRecords: [],
  payments: [],
  subscriptionPlans: [
    { id: 'plan-free', name: 'Kisan Basic', price: 0, interval: 'monthly', subscribers: 0, features: ['Daily Mandi Bhav', 'Weather Forecast', 'Community Feed'], active: true },
    { id: 'plan-pro', name: 'Kisan Pro', price: 199, interval: 'monthly', subscribers: 0, features: ['Unlimited AI Crop Doctor Scans', 'Priority Mandi Alerts', 'Zero Booking Fees'], active: true },
    { id: 'plan-enterprise', name: 'Agri Business', price: 999, interval: 'monthly', subscribers: 0, features: ['Fleet Management', 'Cold Storage Booking', 'Dedicated Agronomist'], active: true },
  ],
  userSubscriptions: [],
  ads: [],
  supportTickets: [],
  appAnalytics: [],
  crashReports: [],
  auditLogs: [],
  adminRoles: seedAdminRoles,
  adminUsers: seedAdminUsers,
});
