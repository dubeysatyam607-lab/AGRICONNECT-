/**
 * AgriConnect Admin — domain types for all 26 modules.
 * Local-first, English-only admin surface. Every collection persists in
 * localStorage via the admin store and is audited through adminAuditLogs.
 */

/* ── Cross-cutting ─────────────────────────────────────────────────────── */

export type AdminAuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'BULK'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'ASSIGN'
  | 'APPROVE'
  | 'REJECT'
  | 'STATUS'
  | 'SEND';

export interface AdminAuditLog {
  id: string;
  actor: string;
  action: AdminAuditAction;
  entity: string;
  entityId: string;
  summary: string;
  ip?: string;
  timestamp: string;
}

/* ── 1. Farmer Management ─────────────────────────────────────────────── */

export interface FarmerEntity {
  id: string;
  name: string;
  phone: string;
  village: string;
  district: string;
  state: string;
  landSize: number;
  unit: string;
  primaryCrop: string;
  joined: string;
  status: 'Active' | 'Suspended' | 'Pending';
  verification: 'Verified' | 'Unverified';
  orders: number;
  rating: number;
}

/* ── 2. Equipment Owners ──────────────────────────────────────────────── */

export interface EquipmentOwner {
  id: string;
  name: string;
  phone: string;
  location: string;
  state: string;
  machines: number;
  categories: string;
  rating: number;
  revenue: number;
  status: 'Active' | 'Suspended' | 'Pending';
  joined: string;
}

/* ── 3. Marketplace Products ──────────────────────────────────────────── */

export interface Product {
  id: string;
  name: string;
  category: 'Fertilizer' | 'Seed' | 'Pesticide' | 'Tool' | 'Feed' | 'Crop';
  seller: string;
  price: number;
  unit: string;
  stock: number;
  rating: number;
  status: 'Active' | 'Out of Stock' | 'Draft' | 'Hidden';
  added: string;
}

/* ── 4. Orders ────────────────────────────────────────────────────────── */

export interface Order {
  id: string;
  customer: string;
  items: string;
  total: number;
  paymentMethod: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded';
  placed: string;
}

/* ── 5. Tractor Rentals ───────────────────────────────────────────────── */

export interface TractorRental {
  id: string;
  farmer: string;
  tractor: string;
  owner: string;
  rate: number;
  duration: string;
  total: number;
  status: 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled';
  booked: string;
}

/* ── 6. Government Schemes ────────────────────────────────────────────── */

export interface SchemeEntity {
  id: string;
  title: string;
  ministry: string;
  benefit: string;
  eligibility: string;
  state: string;
  deadline: string;
  status: 'Active' | 'Closed' | 'Upcoming';
}

/* ── 7. News ──────────────────────────────────────────────────────────── */

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  category: string;
  published: string;
  views: number;
  status: 'Published' | 'Draft' | 'Archived';
}

/* ── 8. Knowledge Hub ─────────────────────────────────────────────────── */

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  author: string;
  language: string;
  published: string;
  views: number;
  status: 'Published' | 'Draft' | 'Archived';
}

/* ── 9. FAQ Management ────────────────────────────────────────────────── */

export interface FaqEntity {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  status: 'Published' | 'Draft';
}

/* ── 10. AI Prompt Management ─────────────────────────────────────────── */

export interface AiPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string;
  model: string;
  version: string;
  usage: number;
  status: 'Active' | 'Draft' | 'Disabled';
}

/* ── 11. Push Notifications ───────────────────────────────────────────── */

export interface PushCampaign {
  id: string;
  title: string;
  audience: string;
  message: string;
  scheduled: string;
  sent: number;
  opened: number;
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Failed';
}

/* ── 12. Weather Data Monitoring ──────────────────────────────────────── */

export interface WeatherReading {
  id: string;
  station: string;
  district: string;
  state: string;
  temp: number;
  humidity: number;
  rainfall: number;
  wind: number;
  condition: string;
  updated: string;
}

/* ── 13. Mandi Data Management ────────────────────────────────────────── */

export interface MandiEntry {
  id: string;
  crop: string;
  market: string;
  state: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  updated: string;
}

/* ── 14. Reports & Complaints ─────────────────────────────────────────── */

export interface ReportEntity {
  id: string;
  reporter: string;
  type: 'Complaint' | 'Report';
  category: string;
  subject: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  created: string;
}

/* ── 15. User Verification ────────────────────────────────────────────── */

export interface VerificationRequest {
  id: string;
  user: string;
  type: 'Farmer' | 'Tractor Owner' | 'Store Owner' | 'Cattle Owner';
  document: string;
  submitted: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

/* ── 16. KYC ──────────────────────────────────────────────────────────── */

export interface KycRecord {
  id: string;
  user: string;
  idType: string;
  riskScore: number;
  submitted: string;
  expires: string;
  status: 'Verified' | 'Pending' | 'Rejected' | 'Expired';
}

/* ── 17. Payments ─────────────────────────────────────────────────────── */

export interface Payment {
  id: string;
  payer: string;
  purpose: string;
  method: string;
  amount: number;
  fee: number;
  status: 'Success' | 'Pending' | 'Failed' | 'Refunded';
  date: string;
}

/* ── 18. Subscription Plans ───────────────────────────────────────────── */

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string;
  subscribers: number;
  status: 'Active' | 'Archived' | 'Draft';
}

/* ── 19. User Subscriptions ───────────────────────────────────────────── */

export interface UserSubscription {
  id: string;
  user: string;
  plan: string;
  start: string;
  renew: string;
  status: 'Active' | 'Expired' | 'Cancelled' | 'Trial';
}

/* ── 20. Advertisement Management ─────────────────────────────────────── */

export interface AdEntity {
  id: string;
  title: string;
  advertiser: string;
  placement: string;
  budget: number;
  impressions: number;
  clicks: number;
  status: 'Active' | 'Paused' | 'Ended';
}

/* ── 21. Support Tickets ──────────────────────────────────────────────── */

export interface SupportTicket {
  id: string;
  user: string;
  subject: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Waiting' | 'Resolved' | 'Closed';
  agent: string;
  created: string;
}

/* ── 22. App Analytics (daily snapshot) ───────────────────────────────── */

export interface AppAnalyticsDay {
  date: string;
  activeUsers: number;
  newSignups: number;
  sessions: number;
  orders: number;
  retention: number;
}

/* ── 23. Crash Reports ────────────────────────────────────────────────── */

export interface CrashReport {
  id: string;
  version: string;
  platform: 'Android' | 'iOS' | 'Web';
  error: string;
  count: number;
  usersAffected: number;
  lastOccurred: string;
  status: 'New' | 'Investigating' | 'Fixed' | 'Ignored';
}

/* ── 24. Audit Logs / 25. RBAC ────────────────────────────────────────── */

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  memberCount: number;
  protected: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  twoFactor: boolean;
}

/* ── Root state ───────────────────────────────────────────────────────── */

export interface AdminState {
  version: number;
  seededAt: string;
  farmers: FarmerEntity[];
  equipmentOwners: EquipmentOwner[];
  products: Product[];
  orders: Order[];
  tractorRentals: TractorRental[];
  schemes: SchemeEntity[];
  newsArticles: NewsArticle[];
  knowledgeArticles: KnowledgeArticle[];
  faqs: FaqEntity[];
  aiPrompts: AiPrompt[];
  pushCampaigns: PushCampaign[];
  weatherReadings: WeatherReading[];
  mandiPrices: MandiEntry[];
  reports: ReportEntity[];
  verificationRequests: VerificationRequest[];
  kycRecords: KycRecord[];
  payments: Payment[];
  subscriptionPlans: SubscriptionPlan[];
  userSubscriptions: UserSubscription[];
  ads: AdEntity[];
  supportTickets: SupportTicket[];
  appAnalytics: AppAnalyticsDay[];
  crashReports: CrashReport[];
  auditLogs: AdminAuditLog[];
  adminRoles: AdminRole[];
  adminUsers: AdminUser[];
}

export type AdminCollectionKey = Exclude<keyof AdminState, 'version' | 'seededAt'>;

export const ADMIN_STORAGE_KEY = 'agri_admin_state_v1';
export const ADMIN_SESSION_KEY = 'agri_admin_session';
export const ADMIN_SEED_VERSION = 1;
