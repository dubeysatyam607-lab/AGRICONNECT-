import React, { useState, useEffect, Component, ReactNode } from "react";
import {
  User,
  Globe,
  CreditCard,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Smartphone,
  Check,
  Shield,
  Bell,
  ArrowLeft,
  AlertCircle,
  VolumeX,
  Volume2,
  MapPin,
  Sprout,
  ShoppingBag,
  LayoutDashboard,
  MessageSquare,
  Bookmark,
  Ruler,
  Leaf,
} from "lucide-react";
import { AgriCard } from "@/components/ui/agri-card";
import { EmptyState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";
import { useLanguage, Language, LANGUAGE_NAMES } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useAuth } from "@/hooks/useAuth";
import { useRole, UserRole } from "@/contexts/RoleContext";
import { useFarm, COMMON_CROPS, CROP_STAGES } from "@/contexts/FarmContext";
import AuditLogs from "./AuditLogs";
import NotificationSettings from "./NotificationSettings";
import { FarmerProfileView } from "@/features/profile/presentation/views/FarmerProfileView";
import { EditFarmerProfileView } from "@/features/profile/presentation/views/EditFarmerProfileView";
import { FarmerKYCVerificationView } from "@/features/profile/presentation/views/FarmerKYCVerificationView";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support-config";
import { submitWeb3Form } from "@/config/web3forms";

interface ProfileSettingsProps {
  selectedLanguage?: string;
  setSelectedLanguage?: (lang: string) => void;
  onSwitchRole?: () => void;
  userRole?: string;
  onNavigate?: (page: string) => void;
  onToast?: (message: string) => void;
}

type SettingsView = 'main' | 'audit-logs' | 'notifications' | 'edit-profile' | 'view-profile' | 'kyc-verification' | 'payment-methods' | 'my-bookings' | 'help-support' | 'farm-details' | 'orders' | 'saved-chats' | 'bookmarks';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class SidebarErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Sidebar menu crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full bg-card p-4 rounded-xl border border-border shadow-card flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3 min-w-0 w-full">
            <div className="w-5 h-5 rounded-full bg-muted shrink-0" />
            <div className="h-4 bg-muted rounded w-1/3" />
          </div>
          <div className="w-4 h-4 rounded-full bg-muted shrink-0" />
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main Component ---
const ProfileSettingsContent: React.FC<ProfileSettingsProps> = ({
  onNavigate = () => {},
  onToast,
  userRole,
}) => {
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const { language, setLanguage, t } = useLanguage() || {};
  const { toast } = useToast() || {};
  const { logEvent } = useAuditLog() || {};
  const { user, signOut } = useAuth() || {};
  const { activeRole, setActiveRole, isMuted, toggleMute } = useRole();
  const { profile: farm, updateProfile } = useFarm();
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  const ALL_ROLES: UserRole[] = [
    'Farmer', 'Labour', 'Store Owner', 'Tractor Owner', 'Cattle Owner', 'Transport Owner', 'Soil Tester'
  ];

  useEffect(() => {
    // Simulate data loading to prevent synchronous crashes and show skeleton
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const showToastMsg = (msg: string, desc?: string) => {
    if (onToast) {
      onToast(msg);
    } else if (toast) {
      toast({ title: msg, description: desc || msg });
    }
  };

  const handleUnderConstruction = (feature: string) => {
    showToastMsg(tr('profile.toast.comingSoon', 'Coming Soon'), `${feature} is currently under construction`);
  };

  const tr = (key: string, fallback: string) => {
    const v = t?.(key);
    return v && v !== key ? v : fallback;
  };

  const menuSections = [
    {
      title: tr('profile.section.account', 'Account'),
      items: [
        { icon: User, label: tr('profile.menu.viewProfile', 'My Agricultural Identity'), sub: tr('profile.menu.viewProfileSubtitle', '14 farm specs & GPS map'), tint: 'text-primary', action: () => setCurrentView('view-profile') },
        { icon: User, label: tr('profile.menu.editProfile', 'Edit Profile Wizard'), sub: tr('profile.menu.editProfileSubtitle', 'Update farm & personal details'), tint: 'text-primary', action: () => setCurrentView('edit-profile') },
        { icon: Shield, label: tr('profile.menu.kycVerification', 'Govt ID & KYC Verification'), sub: tr('profile.menu.kycVerificationSub', 'Aadhaar & Kisan Credit Card (KCC)'), tint: 'text-emerald-500', action: () => setCurrentView('kyc-verification') },
        { icon: MapPin, label: tr('profile.menu.farmDetails', 'Farm Details'), sub: tr('profile.menu.farmDetailsSubtitle', 'Land, crops & location'), tint: 'text-feature-mandi', action: () => setCurrentView('farm-details') },
      ],
    },
    {
      title: tr('profile.section.ordersActivity', 'Orders & Activity'),
      items: [
        { icon: CreditCard, label: tr('profile.menu.paymentMethods', 'Payment Methods'), sub: tr('profile.menu.paymentMethodsSubtitle', 'UPI, cards & farm khata'), tint: 'text-feature-loans', action: () => setCurrentView('payment-methods') },
        { icon: FileText, label: tr('profile.menu.myBookings', 'My Bookings'), sub: tr('profile.menu.myBookingsSubtitle', 'Tractors, labour & services'), tint: 'text-feature-tractor', action: () => setCurrentView('my-bookings') },
        { icon: ShoppingBag, label: tr('profile.menu.myOrders', 'My Orders'), sub: tr('profile.menu.myOrdersSubtitle', 'Agri store purchases'), tint: 'text-feature-store', action: () => setCurrentView('orders') },
        { icon: MessageSquare, label: tr('profile.menu.savedAiChats', 'Saved AI Chats'), sub: tr('profile.menu.savedAiChatsSubtitle', 'Ask Kisan AI history'), tint: 'text-feature-ai', action: () => setCurrentView('saved-chats') },
        { icon: Bookmark, label: tr('profile.menu.savedBookmarks', 'Saved & Bookmarks'), sub: tr('profile.menu.savedBookmarksSubtitle', 'Articles, prices & alerts'), tint: 'text-feature-news', action: () => setCurrentView('bookmarks') },
      ],
    },
    {
      title: tr('profile.section.preferencesSecurity', 'Preferences & Security'),
      items: [
        { icon: LayoutDashboard, label: tr('profile.menu.adminConsole', 'Executive Admin Console'), sub: tr('profile.menu.adminConsoleSubtitle', 'KPI metrics & platform control'), tint: 'text-emerald-600', action: () => { setActiveRole('Admin'); if (typeof window !== 'undefined') localStorage.setItem('agri_admin_session', 'true'); onNavigate('admin'); } },
        { icon: Bell, label: tr('profile.menu.notificationSettings', 'Notification Settings'), sub: tr('profile.menu.notificationSettingsSubtitle', 'Alerts & reminders'), tint: 'text-feature-schemes', action: () => setCurrentView('notifications') },
        { icon: Shield, label: tr('profile.menu.auditLogs', 'Audit Logs'), sub: tr('profile.menu.auditLogsSubtitle', 'Security activity history'), tint: 'text-primary', action: () => setCurrentView('audit-logs') },
        { icon: HelpCircle, label: tr('profile.menu.helpSupport', 'Help & Support'), sub: tr('profile.menu.helpSupportSubtitle', 'Helpline, WhatsApp & FAQ'), tint: 'text-feature-community', action: () => setCurrentView('help-support') },
        { icon: LogOut, label: tr('profile.menu.logout', 'Logout'), sub: tr('profile.menu.logoutSubtitle', 'Sign out from this account'), tint: 'text-destructive', action: handleLogout },
      ],
    },
  ];

  const handleLanguageChange = (lang: Language) => {
    if (!setLanguage || !language) return;
    const oldLanguage = language;
    setLanguage(lang);
    
    // Log language change safely
    if (user && logEvent) {
      logEvent({
        action: 'UPDATE_LANGUAGE',
        tableName: 'profiles',
        recordId: user?.id,
        oldData: { language: oldLanguage },
        newData: { language: lang },
      });
    }
    showToastMsg(tr('profile.toast.languageChangedTitle', 'Language Changed'), `Switched to ${LANGUAGE_NAMES?.[lang] || lang}`);
  };

  const handleSwitchMode = (newRole: UserRole) => {
    const oldRole = activeRole;
    setActiveRole(newRole);
    setShowRoleSelector(false);
    
    // Log role switch safely
    if (user && logEvent) {
      logEvent({
        action: 'SWITCH_ROLE',
        tableName: 'profiles',
        recordId: user?.id,
        oldData: { role: oldRole },
        newData: { role: newRole },
      });
    }
    showToastMsg(tr('profile.toast.roleChangedTitle', 'Role Changed'), `Switched to ${newRole} Dashboard`);
  };

  const handleLogout = async () => {
    showToastMsg('Logging out...');
    if (signOut) {
      try {
        await signOut();
      } catch (err) {
        console.error("Logout failed safely:", err);
      }
    } else {
      // Fallback manual cleanup if context fails
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    }
    onNavigate('auth');
  };

  const handleLogoutAllDevices = async () => {
    showToastMsg('Logging out from all devices...');
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
    } catch (err) {
      console.error("Global logout failed:", err);
      showToastMsg('Could not sign out from all devices. Try again.');
      return;
    }
    onNavigate('auth');
  };

  // Render sub-views safely
  if (currentView === 'audit-logs') {
    return (
      <div className="pb-24 pt-4 px-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-primary mb-4 hover:underline"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Settings</span>
        </button>
        <SidebarErrorBoundary>
          <AuditLogs onNavigate={onNavigate} />
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (currentView === 'notifications') {
    return (
      <div className="pb-24 pt-4 px-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-primary mb-4 hover:underline"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Settings</span>
        </button>
        <SidebarErrorBoundary>
          <NotificationSettings onToast={onToast || (() => {})} />
        </SidebarErrorBoundary>
      </div>
    );
  }

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const submitSupportQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const phone = String(fd.get('callbackPhone') || '').replace(/\D/g, '');
    if (phone.length < 10) {
      showToastMsg("Invalid Number", "Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      await submitWeb3Form({
        subject: "Request a Callback from AgriConnect app",
        from_name: user?.user_metadata?.full_name || user?.email || "AgriConnect user",
        phone,
        request_source: "Help & Support → Request a Callback",
      });
      showToastMsg("Support Query Submitted", "Our agronomist will call you back within 4 hours.");
    } catch (error) {
      console.error("[Support] callback request failed:", error);
      showToastMsg("Could Not Send", "Please check your connection and try again.");
    }
    setCurrentView('main');
  };

  if (currentView === 'view-profile') {
    return (
      <div className="pb-24 pt-4 px-4">
        <SidebarErrorBoundary>
          <FarmerProfileView
            onEditProfile={() => setCurrentView('edit-profile')}
            onOpenKyc={() => setCurrentView('kyc-verification')}
            onBack={() => setCurrentView('main')}
          />
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (currentView === 'edit-profile') {
    return (
      <div className="pb-24 pt-4 px-4">
        <SidebarErrorBoundary>
          <EditFarmerProfileView
            onSuccess={() => {
              showToastMsg("Profile Updated", "Your agricultural identity has been saved and synced.");
              setCurrentView('view-profile');
            }}
            onCancel={() => setCurrentView('view-profile')}
          />
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (currentView === 'kyc-verification') {
    return (
      <div className="pb-24 pt-4 px-4">
        <SidebarErrorBoundary>
          <FarmerKYCVerificationView
            onBack={() => setCurrentView('main')}
            onSuccess={() => {
              showToastMsg("KYC Updated", "Verification details saved and badges awarded.");
            }}
          />
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (currentView === 'payment-methods') {
    return (
      <div className="pb-24 pt-4 px-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-primary mb-4 hover:underline"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Settings</span>
        </button>
        <SidebarErrorBoundary>
          <AgriCard>
            <h3 className="font-bold text-lg mb-4">Payment Methods</h3>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg flex items-center justify-between">
                <span className="font-medium">UPI (Google Pay, PhonePe, Paytm)</span>
                <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">Active</span>
              </div>
              <div className="p-3 border rounded-lg flex items-center justify-between">
                <span className="font-medium">Debit / Credit Card</span>
                <span className="text-xs text-muted-foreground border px-2 py-1 rounded">Link</span>
              </div>
              <div className="p-3 border rounded-lg flex items-center justify-between">
                <span className="font-medium">EMI / Tractor Loan</span>
                <span className="text-xs text-muted-foreground border px-2 py-1 rounded">Apply</span>
              </div>
              <div className="p-3 border rounded-lg flex items-center justify-between">
                <span className="font-medium">Pay Later (Farm Khata)</span>
                <span className="text-xs text-muted-foreground border px-2 py-1 rounded">Setup</span>
              </div>
            </div>
          </AgriCard>
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (currentView === 'my-bookings') {
    return (
      <div className="pb-24 pt-4 px-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-primary mb-4 hover:underline"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Settings</span>
        </button>
        <SidebarErrorBoundary>
          <AgriCard>
            <h3 className="font-bold text-lg mb-4">My Bookings</h3>
            <div className="space-y-4">
              <div className="border-b pb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold">Tractor Rental (Mahindra 575 DI)</span>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Completed</span>
                </div>
                <p className="text-sm text-muted-foreground">Date: 12 June 2026</p>
              </div>
              <div className="border-b pb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold">Soil Test Request</span>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending</span>
                </div>
                <p className="text-sm text-muted-foreground">Date: 15 June 2026</p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold">Labour Hire (3 Workers)</span>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Upcoming</span>
                </div>
                <p className="text-sm text-muted-foreground">Date: 20 June 2026</p>
              </div>
            </div>
          </AgriCard>
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (currentView === 'help-support') {
    return (
      <div className="pb-24 pt-4 px-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-primary mb-4 hover:underline"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Settings</span>
        </button>
        <SidebarErrorBoundary>
          <AgriCard>
            <h3 className="font-bold text-lg mb-4">Help & Support</h3>
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-bold mb-1">Call our Kisan Helpline</h4>
                <p>Dial 1800-XXX-XXXX (Toll-Free).</p>
                <p className="text-xs text-muted-foreground">Available Monday to Saturday, 8:00 AM to 8:00 PM.</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/40 rounded-lg text-green-900 dark:text-green-100">
                <h4 className="font-bold mb-1">Chat on WhatsApp</h4>
                <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="underline">Tap here to open a WhatsApp chat with our support team.</a>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-bold mb-1">Request a Callback</h4>
                <p className="text-muted-foreground mb-2">Leave your mobile number below, and our agronomist will call you back within 4 hours.</p>
                <form onSubmit={submitSupportQuery} className="flex gap-2">
                  <input type="tel" name="callbackPhone" placeholder="Mobile Number" inputMode="numeric" maxLength={10} required className="flex-1 border rounded px-3 py-2 text-base sm:text-sm" />
                  <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold">Request</button>
                </form>
              </div>
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-bold mb-2">Frequently Asked Questions (Offline Cached)</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>How to navigate the app?</li>
                  <li>Emergency contact numbers</li>
                  <li>Basic troubleshooting for offline mode</li>
                </ul>
              </div>
            </div>
          </AgriCard>
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (currentView === 'farm-details') {
    const meta = user?.user_metadata || {};
    const statCards = [
      { icon: MapPin, label: 'Village', value: meta?.village || (t ? t('home.guestVillage') : '—') },
      { icon: Ruler, label: 'Farm Area', value: `${farm.farmArea} acres` },
      { icon: Sprout, label: 'Active Crop', value: farm.crop },
      { icon: Leaf, label: 'Crop Stage', value: farm.stage },
    ];
    return (
      <div className="pb-24 pt-4 px-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-primary mb-4 hover:underline"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Settings</span>
        </button>
        <SidebarErrorBoundary>
          <AgriCard>
            <h3 className="font-bold text-lg mb-1">Farm Details</h3>
            <p className="text-sm text-muted-foreground mb-4">Your Home dashboard uses these details to personalise advice.</p>
            <div className="grid grid-cols-2 gap-3">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-background/60 p-3.5">
                  <s.icon size={17} className="text-feature-mandi mb-2" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-[15px] font-black text-foreground mt-0.5 truncate">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Active crop picker */}
            <div className="mt-5">
              <p className="text-[12px] font-bold text-foreground mb-2">Active Crop</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {COMMON_CROPS.map((crop) => (
                  <button
                    key={crop}
                    onClick={() => updateProfile({ crop: crop as string })}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all ${
                      farm.crop === crop
                        ? "border-feature-mandi bg-feature-mandi text-white shadow-colorful"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {crop}
                  </button>
                ))}
              </div>
            </div>

            {/* Crop stage picker */}
            <div className="mt-4">
              <p className="text-[12px] font-bold text-foreground mb-2">Crop Stage</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {CROP_STAGES.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => updateProfile({ stage })}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all ${
                      farm.stage === stage
                        ? "border-emerald-700 bg-emerald-700 text-white shadow-colorful"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>

            {/* Farm area picker */}
            <div className="mt-4">
              <p className="text-[12px] font-bold text-foreground mb-2">Farm Area (acres)</p>
              <div className="flex gap-2">
                {[1, 2, 3, 5, 10].map((area) => (
                  <button
                    key={area}
                    onClick={() => updateProfile({ farmArea: area })}
                    className={`flex-1 rounded-xl border py-2.5 text-[13px] font-bold transition-all ${
                      farm.farmArea === area
                        ? "border-feature-loans bg-feature-loans/15 text-feature-loans"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {area} ac
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setCurrentView('edit-profile')}
              className="mt-5 w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-bold text-sm active:scale-[0.98] transition-transform"
            >
              Edit Full Agricultural Identity
            </button>
          </AgriCard>
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (currentView === 'orders') {
    return (
      <div className="pb-24 pt-4 px-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-primary mb-4 hover:underline"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Settings</span>
        </button>
        <SidebarErrorBoundary>
          <AgriCard>
            <h3 className="font-bold text-lg mb-1">My Orders</h3>
            <p className="text-sm text-muted-foreground mb-2">Seeds, fertilizers & tools you've bought.</p>
            <EmptyState
              emoji="🛒"
              title="No orders yet"
              subtitle="When you buy from the Agri Store, your orders and delivery tracking will appear here."
              actionLabel="Browse Agri Store"
              onAction={() => onNavigate('store')}
            />
          </AgriCard>
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (currentView === 'saved-chats') {
    return (
      <div className="pb-24 pt-4 px-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-primary mb-4 hover:underline"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Settings</span>
        </button>
        <SidebarErrorBoundary>
          <AgriCard>
            <h3 className="font-bold text-lg mb-1">Saved AI Chats</h3>
            <p className="text-sm text-muted-foreground mb-2">Your conversations with Kisan AI.</p>
            <EmptyState
              emoji="🤖"
              title="No saved chats yet"
              subtitle="Ask Kisan AI about your crops or weather, then save the chat to revisit it here."
              actionLabel="Ask Kisan AI"
              onAction={() => onNavigate('ai-chat')}
            />
          </AgriCard>
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (currentView === 'bookmarks') {
    return (
      <div className="pb-24 pt-4 px-4">
        <button
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-primary mb-4 hover:underline"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Settings</span>
        </button>
        <SidebarErrorBoundary>
          <AgriCard>
            <h3 className="font-bold text-lg mb-1">Saved & Bookmarks</h3>
            <p className="text-sm text-muted-foreground mb-2">Articles, mandi prices and alerts you've saved.</p>
            <EmptyState
              emoji="🔖"
              title="Nothing bookmarked yet"
              subtitle="Tap the bookmark icon on mandi prices, news and articles to save them here."
              actionLabel="Browse Mandi Prices"
              onAction={() => onNavigate('mandi')}
            />
          </AgriCard>
        </SidebarErrorBoundary>
      </div>
    );
  }

  if (isLoading || typeof user === 'undefined') {
    return (
      <div className="pb-24 pt-4 px-4 space-y-6">
        <div className="bg-card p-4 rounded-2xl border border-border shadow-card flex gap-4 items-center animate-pulse">
          <div className="w-16 h-16 bg-muted rounded-full shrink-0"></div>
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-14 bg-card rounded-xl border border-border animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4">
      {/* Profile Header */}
      <div onClick={() => setCurrentView('view-profile')} className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]">
        <AgriCard className="mb-6 overflow-hidden border-2 border-emerald-500/20 hover:border-emerald-500/50 shadow-md">
          <div className="relative overflow-hidden">
            <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl" aria-hidden="true" />
            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-sm">
                {user?.email?.[0]?.toUpperCase() || "R"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground truncate">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Not available"}
                  </h2>
                  {(user?.email_confirmed_at || user?.user_metadata?.email_verified) && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-500/20 shrink-0">
                    Verified ID
                  </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{user?.phone || user?.email || "Not available"}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="inline-block bg-accent text-accent-foreground text-xs font-medium px-2 py-0.5 rounded-full capitalize">
                    {userRole}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <span>View Agri Identity</span>
                    <span>→</span>
                  </span>
                </div>
                <div className="mt-2 flex justify-end">
                  <button onClick={handleLogout} className="flex items-center gap-2 text-destructive hover:underline">
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-background/50 p-2.5">
              {[
                { label: tr('profile.header.village', 'Village'), value: user?.user_metadata?.village || (t ? t('home.guestVillage') : '—') },
                { label: tr('profile.header.farm', 'Farm'), value: `${farm.farmArea} acres` },
                { label: tr('profile.header.crop', 'Crop'), value: farm.crop },
              ].map((s, i) => (
                <div key={s.label} className={cn("text-center", i === 1 && "border-x border-border/50")}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-[12px] font-bold text-foreground truncate mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </AgriCard>
      </div>

      {/* Language Selection */}
      {LANGUAGE_NAMES && (
        <AgriCard className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe size={20} className="text-primary shrink-0" />
            <h3 className="font-semibold text-foreground">{getTranslated('settings.languageToggle', 'Language')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(LANGUAGE_NAMES) as [Language, string][]).map(([code, name]) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                  language === code
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-card border-border text-foreground hover:bg-accent'
                }`}
              >
                <span className="text-sm font-medium truncate">{name}</span>
                {language === code && <Check size={16} className="flex-shrink-0 ml-1" />}
              </button>
            ))}
          </div>
        </AgriCard>
      )}

      {/* Menu Sections */}
      {menuSections.map((section) => (
        <div key={section.title} className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground px-1 mb-2">
            {section.title}
          </p>
          <div className="space-y-2">
            {section.items.map((item, idx) => (
              <button
                key={`${section.title}-${idx}`}
                onClick={item.action}
                className="w-full bg-card p-4 rounded-2xl border border-border shadow-card flex items-center justify-between hover:shadow-soft hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60", item.tint)}>
                    <item.icon size={18} className="shrink-0" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground truncate">{item.label}</span>
                    <span className="block text-[11px] font-semibold text-muted-foreground truncate">{item.sub}</span>
                  </span>
                </div>
                <ChevronRight size={18} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Switch Role Dropdown */}
      <div className="bg-feature-ai/10 p-4 rounded-xl border border-feature-ai/20 mb-4">
        <button
          onClick={() => setShowRoleSelector(!showRoleSelector)}
          className="w-full flex items-center justify-between hover:bg-feature-ai/15 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Smartphone size={20} className="text-feature-ai shrink-0 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-foreground truncate">
              {getTranslated('settings.switchMode', 'Switch Mode')} - <span className="text-primary">{activeRole}</span>
            </span>
          </div>
          <ChevronRight size={18} className={`text-feature-ai shrink-0 transition-transform ${showRoleSelector ? 'rotate-90' : ''}`} />
        </button>
        
        {showRoleSelector && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {ALL_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => handleSwitchMode(role)}
                className={`p-2 rounded-lg text-sm font-medium border text-left transition-colors ${
                  activeRole === role 
                  ? 'bg-primary/20 border-primary text-primary' 
                  : 'bg-card border-border hover:bg-accent text-foreground'
                }`}
              >
                {role}
                {activeRole === role && <Check size={14} className="inline-block float-right" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Global Mute */}
      <button
        onClick={toggleMute}
        className="w-full bg-card p-4 rounded-2xl border border-border shadow-card flex items-center justify-between mb-4 hover:shadow-soft transition-shadow group"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isMuted ? (
            <VolumeX size={20} className="text-destructive shrink-0" />
          ) : (
            <Volume2 size={20} className="text-primary shrink-0" />
          )}
          <span className="font-medium text-foreground truncate">
            {isMuted ? 'Voice Assistant Muted' : 'Voice Assistant Active'}
          </span>
        </div>
        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isMuted ? 'bg-muted' : 'bg-primary'}`}>
          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isMuted ? 'translate-x-0' : 'translate-x-4'}`} />
        </div>
      </button>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="w-full bg-destructive/10 p-4 rounded-xl border border-destructive/20 flex items-center gap-3 hover:bg-destructive/15 transition-colors group"
      >
        <LogOut size={20} className="text-red-600 dark:text-red-400 shrink-0 group-hover:scale-110 transition-transform" />
        <span className="font-medium text-red-700 dark:text-red-400 truncate">{tr('profile.menu.logout', 'Logout')}</span>
      </button>

      {/* Logout from all devices */}
      <button
        onClick={handleLogoutAllDevices}
        className="w-full border border-border p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut size={14} />
        Logout from all devices
      </button>
    </div>
  );
};

const ProfileSettings: React.FC<ProfileSettingsProps> = (props) => {
  return (
    <SidebarErrorBoundary>
      <ProfileSettingsContent {...props} />
    </SidebarErrorBoundary>
  );
};
export default ProfileSettings;