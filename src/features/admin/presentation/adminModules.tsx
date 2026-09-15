import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Tractor,
  Package,
  ShoppingCart,
  CalendarClock,
  Landmark,
  Newspaper,
  BookOpen,
  HelpCircle,
  Bot,
  Send,
  CloudSun,
  Wheat,
  Flag,
  BadgeCheck,
  Fingerprint,
  CreditCard,
  Layers,
  Wallet,
  Megaphone,
  LifeBuoy,
  BarChart3,
  Bug,
  ShieldCheck,
  UserCog,
  ClipboardList,
  Sprout,
} from 'lucide-react';
import { OverviewModule } from './modules/OverviewModule';
import { SoilTestingModule } from './modules/SoilTestingModule';
import { FarmersModule } from './modules/FarmersModule';
import { EquipmentOwnersModule } from './modules/EquipmentOwnersModule';
import { ProductsModule } from './modules/ProductsModule';
import { OrdersModule } from './modules/OrdersModule';
import { TractorRentalsModule } from './modules/TractorRentalsModule';
import { SchemesModule } from './modules/SchemesModule';
import { NewsModule } from './modules/NewsModule';
import { KnowledgeModule } from './modules/KnowledgeModule';
import { FaqModule } from './modules/FaqModule';
import { AiPromptsModule } from './modules/AiPromptsModule';
import { PushModule } from './modules/PushModule';
import { WeatherModule } from './modules/WeatherModule';
import { MandiModule } from './modules/MandiModule';
import { ReportsModule } from './modules/ReportsModule';
import { VerificationModule } from './modules/VerificationModule';
import { KycModule } from './modules/KycModule';
import { PaymentsModule } from './modules/PaymentsModule';
import { SubscriptionsModule } from './modules/SubscriptionsModule';
import { WalletModule } from './modules/WalletModule';
import { AdsModule } from './modules/AdsModule';
import { SupportModule } from './modules/SupportModule';
import { AppAnalyticsModule } from './modules/AppAnalyticsModule';
import { CrashModule } from './modules/CrashModule';
import { AuditModule } from './modules/AuditModule';
import { RolesModule } from './modules/RolesModule';
import { AdminUsersModule } from './modules/AdminUsersModule';
import { ImageManagementModule } from './modules/ImageManagementModule';
import { FoundingFarmersModule } from './modules/FoundingFarmersModule';
import { PaymentVerificationModule } from './modules/PaymentVerificationModule';
import { Image as ImageIcon } from 'lucide-react';

export interface AdminModule {
  key: string;
  label: string;
  icon: LucideIcon;
  group: string;
  component: React.ComponentType<{ onNavigate: (key: string) => void }>;
}

export const ADMIN_MODULES: AdminModule[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Dashboard', component: OverviewModule },

  { key: 'soilTesting', label: 'Soil Testing (Mitti Jaanch)', icon: Layers, group: 'Operations', component: SoilTestingModule },
  { key: 'farmers', label: 'Farmer Management', icon: Users, group: 'Users & Marketplace', component: FarmersModule },
  { key: 'equipmentOwners', label: 'Equipment Owners', icon: Tractor, group: 'Users & Marketplace', component: EquipmentOwnersModule },
  { key: 'products', label: 'Marketplace Products', icon: Package, group: 'Users & Marketplace', component: ProductsModule },
  { key: 'orders', label: 'Orders', icon: ShoppingCart, group: 'Users & Marketplace', component: OrdersModule },
  { key: 'tractorRentals', label: 'Tractor Rentals', icon: CalendarClock, group: 'Users & Marketplace', component: TractorRentalsModule },

  { key: 'schemes', label: 'Government Schemes', icon: Landmark, group: 'Content', component: SchemesModule },
  { key: 'news', label: 'News', icon: Newspaper, group: 'Content', component: NewsModule },
  { key: 'knowledge', label: 'Knowledge Hub', icon: BookOpen, group: 'Content', component: KnowledgeModule },
  { key: 'faqs', label: 'FAQ Management', icon: HelpCircle, group: 'Content', component: FaqModule },
  { key: 'aiPrompts', label: 'AI Prompts', icon: Bot, group: 'Content', component: AiPromptsModule },

  { key: 'push', label: 'Push Notifications', icon: Send, group: 'Operations', component: PushModule },
  { key: 'weather', label: 'Weather Monitoring', icon: CloudSun, group: 'Operations', component: WeatherModule },
  { key: 'mandi', label: 'Mandi Data', icon: Wheat, group: 'Operations', component: MandiModule },
  { key: 'ads', label: 'Advertisements', icon: Megaphone, group: 'Operations', component: AdsModule },

  { key: 'payments', label: 'Payments', icon: CreditCard, group: 'Finance', component: PaymentsModule },
  { key: 'subscriptions', label: 'Subscription Plans', icon: Layers, group: 'Finance', component: SubscriptionsModule },
  { key: 'foundingFarmers', label: 'Founding Farmers', icon: Sprout, group: 'Finance', component: FoundingFarmersModule },
  { key: 'paymentVerification', label: 'Payment Verification', icon: ShieldCheck, group: 'Finance', component: PaymentVerificationModule },
  { key: 'wallets', label: 'Wallets', icon: Wallet, group: 'Finance', component: WalletModule },

  { key: 'verification', label: 'User Verification', icon: BadgeCheck, group: 'Compliance & Support', component: VerificationModule },
  { key: 'kyc', label: 'KYC Records', icon: Fingerprint, group: 'Compliance & Support', component: KycModule },
  { key: 'reports', label: 'Reports & Complaints', icon: Flag, group: 'Compliance & Support', component: ReportsModule },
  { key: 'support', label: 'Support Tickets', icon: LifeBuoy, group: 'Compliance & Support', component: SupportModule },

  { key: 'appAnalytics', label: 'App Analytics', icon: BarChart3, group: 'Platform', component: AppAnalyticsModule },
  { key: 'crashes', label: 'Crash Reports', icon: Bug, group: 'Platform', component: CrashModule },
  { key: 'auditLogs', label: 'Audit Logs', icon: ClipboardList, group: 'Platform', component: AuditModule },
  { key: 'images', label: 'Image System & Pexels Cache', icon: ImageIcon, group: 'Platform', component: ImageManagementModule },
  { key: 'roles', label: 'Roles & Permissions', icon: ShieldCheck, group: 'Platform', component: RolesModule },
  { key: 'adminUsers', label: 'Admin Users', icon: UserCog, group: 'Platform', component: AdminUsersModule },
];

export const ADMIN_MODULE_GROUPS = [...new Set(ADMIN_MODULES.map((m) => m.group))];

export const getAdminModule = (key: string): AdminModule =>
  ADMIN_MODULES.find((m) => m.key === key) ?? ADMIN_MODULES[0];
