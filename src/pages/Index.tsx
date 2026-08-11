import React, { useState, useEffect, Suspense, lazy } from "react";
import BottomNav from "@/components/agri/BottomNav";
import { ChunkErrorBoundary } from "@/components/ui/ChunkErrorBoundary";
import ToastNotification from "@/components/agri/ToastNotification";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { LanguageProvider, useLanguage, LANGUAGE_NAMES, type Language } from "@/contexts/LanguageContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { FarmProvider } from "@/contexts/FarmContext";
import type { Tractor } from "@/lib/mock-data";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import InstallPWAButton from "@/components/agri/InstallPWAButton";
import { useOfflineSync } from "../../useOfflineSync";
import { SeoHead } from "@/components/seo/SeoHead";
import { homepageStructuredData } from "@/lib/structured-data";

const AgriConnectFooter = lazy(() => import("@/components/ui/AgriConnectFooter"));

const FarmerHome = lazy(() => import("@/components/agri/FarmerHome"));

// Lazy load heavy components for performance (Code Splitting)
const MandiPrices = lazy(() => import("@/components/agri/LiveMandi"));
const KisanChat = lazy(() => import("@/components/agri/KisanChat"));
const CropDoctor = lazy(() => import("@/components/agri/CropDoctor"));
const AgriStore = lazy(() => import("@/components/agri/AgriStore"));
const Schemes = lazy(() => import("@/components/agri/Schemes"));
const LoanCalculator = lazy(() => import("@/components/agri/LoanCalculator"));
const LaborHire = lazy(() => import("@/components/agri/LaborHire"));
const CattleMarket = lazy(() => import("@/components/agri/CattleMarket"));
const AuthPage = lazy(() => import("@/components/agri/AuthPage"));
const NotificationSettings = lazy(() => import("@/components/agri/NotificationSettings"));
const Transport = lazy(() => import("@/components/agri/Transport"));
const AgriNews = lazy(() => import("@/components/agri/AgriNews"));
const SoilTest = lazy(() => import("@/components/agri/SoilTest"));
const TractorList = lazy(() => import("@/components/agri/TractorMarket"));
const ProfileSettings = lazy(() => import("@/components/agri/ProfileSettings"));
const MandiFinder = lazy(() => import("@/components/agri/MandiFinder"));
const DigitalProfileDashboard = lazy(() =>
  import("@/features/profile/dashboard/presentation/DigitalProfileDashboard").then((m) => ({ default: m.DigitalProfileDashboard })),
);
const ColdStorage = lazy(() => import("@/components/agri/ColdStorage"));
const CommunityFeed = lazy(() => import("@/components/agri/CommunityFeed"));
const KrishiShorts = lazy(() => import("@/components/agri/KrishiShorts"));
const FarmLedger = lazy(() => import("@/components/agri/FarmLedger"));
const FasalBima = lazy(() => import("@/components/agri/FasalBima"));
const CropCalendar = lazy(() => import("@/components/agri/CropCalendar"));
const CropProfitCalculator = lazy(() => import("@/components/agri/CropProfitCalculator"));
const PriceAlerts = lazy(() => import("@/components/agri/PriceAlerts"));
const ServicesHub = lazy(() => import("@/components/agri/ServicesHub"));
const HardwareDashboard = lazy(() => import("@/components/agri/HardwareDashboard"));
const PaymentsHub = lazy(() =>
  import("@/features/payments/presentation/PaymentsHub").then((m) => ({ default: m.PaymentsHub })),
);
const NotificationCenter = lazy(() =>
  import("@/features/notifications/presentation/NotificationCenter").then((m) => ({ default: m.NotificationCenter })),
);
const AdvisorHub = lazy(() =>
  import("@/features/ai-advisor/presentation/AdvisorHub").then((m) => ({ default: m.AdvisorHub })),
);
const FarmerNetworkHub = lazy(() =>
  import("@/features/farmer-network/presentation/FarmerNetworkHub").then((m) => ({ default: m.FarmerNetworkHub })),
);
const FarmOsHub = lazy(() =>
  import("@/features/farm-os/presentation/FarmOsHub").then((m) => ({ default: m.FarmOsHub })),
);

// ── Per-tab SEO Metadata (dynamic title/description for SPA sections) ──
const TAB_SEO_META: Record<string, { title: string; description: string; path: string; noindex?: boolean }> = {
  home: {
    title: 'Farmer Dashboard — Smart Farming App for Indian Farmers',
    description:
      'Your free smart farming dashboard. Live mandi bhav, hyperlocal weather, AI crop health alerts, tractor rental, government schemes, and farm tasks — all in one place.',
    path: '/',
  },
  mandi: {
    title: 'Live Mandi Bhav Prices Today — India',
    description:
      'Check today\'s live mandi bhav prices for wheat, soybean, mustard, onion, cotton, and 100+ crops across Indian APMC mandis. Updated daily. Free.',
    path: '/mandi',
  },
  tractors: {
    title: 'Tractor Rental Near Me — Book Online at Affordable Rates',
    description:
      'Book tractors, harvesters, rotavators, and tillers near you. Compare hourly & per-acre rates from verified owners. Instant online tractor booking on AgriConnect.',
    path: '/tractors',
  },
  'ai-chat': {
    title: 'Kisan AI Assistant — Free Farmer AI Chat in 12 Languages',
    description:
      'Ask Kisan AI anything about farming — crop diseases, fertilizer doses, mandi selling advice, weather. Free AI assistant for Indian farmers in 12 languages.',
    path: '/kisan-ai',
    noindex: true,
  },
  'crop-doctor': {
    title: 'AI Crop Doctor — Crop Disease Detection by Photo',
    description:
      'Scan a sick leaf photo and get instant AI crop disease diagnosis with treatment recommendations. Free unlimited scans on AgriConnect Crop Doctor.',
    path: '/crop-doctor',
  },
  store: {
    title: 'Agri Store — Buy Seeds, Fertilizers & Farm Tools Online',
    description:
      'Shop for certified seeds, DAP/urea/NPK fertilizers, pesticides, sprayers, and drip irrigation kits at fair prices in the AgriConnect agri store.',
    path: '/store',
  },
  schemes: {
    title: 'Government Schemes for Farmers — PM-KISAN, KCC, Fasal Bima',
    description:
      'Explore active government schemes for farmers: PM-KISAN, Kisan Credit Card, PM Fasal Bima, Soil Health Card, PM-KUSUM. Eligibility, benefits, and application help.',
    path: '/schemes',
  },
  loans: {
    title: 'Farm Loan Calculator — Kisan Credit Card & Crop Loan EMI',
    description:
      'Calculate farm loan EMI, Kisan Credit Card interest, and subsidy benefits. Plan your crop loan for better farm finance decisions.',
    path: '/loans',
  },
  labor: {
    title: 'Farm Labor Hiring Near Me — Daily Wage Workers',
    description:
      'Hire farm laborers for harvesting, sowing, spraying, and weeding near you. Compare daily wage rates and skilled worker teams on AgriConnect.',
    path: '/labor',
  },
  cattle: {
    title: 'Cattle Market — Buy & Sell Cows, Buffaloes Online',
    description:
      'Browse verified cattle listings — Murrah buffalo, Gir cow, Jersey. Compare prices, breed, milk yield, and connect with sellers in your area.',
    path: '/cattle-market',
  },
  transport: {
    title: 'Farm Transport Booking — Tractor Trolley, Pickup, Trucks',
    description:
      'Book farm transport — Tata Ace, Bolero pickup, tractor trolley, trucks. Compare capacity and rates for moving your produce and machinery.',
    path: '/transport',
  },
  news: {
    title: 'Krishi News — Agriculture News India & Mandi Updates',
    description:
      'Latest agriculture news for India: MSP hikes, government schemes, weather alerts, crop advisory, and mandi market updates in Hindi & English.',
    path: '/news',
  },
  soil: {
    title: 'Soil Testing & Soil Health Card — Free Soil Test Guide',
    description:
      'Get your soil tested free under the Soil Health Card scheme. Understand your soil report and get customized fertilizer recommendations.',
    path: '/soil-test',
  },
  'mandi-finder': {
    title: 'Mandi Finder — Find Nearest APMC Mandi Near Me',
    description:
      'Find the nearest APMC mandi near your village. Compare distance, crops, and live prices to choose the best market for your produce.',
    path: '/mandi-finder',
  },
  'cold-storage': {
    title: 'Cold Storage Near Me — Post-Harvest Storage Facilities',
    description:
      'Find cold storage facilities near you for potatoes, onions, fruits, and vegetables. Compare capacity, temperature control, and storage rates.',
    path: '/cold-storage',
  },
  community: {
    title: 'Farmer Community — Krishi Charcha, Ask Experts & Farmers',
    description:
      'Join India\'s largest farmer community. Ask agri experts, share crop problems, and connect with farmers across states. Free and in your language.',
    path: '/community',
  },
  'krishi-shorts': {
    title: 'Krishi Shorts — Learn Farming in 60-Second Videos',
    description:
      'Watch short farming videos in Hindi and regional languages — crop care, disease treatment, organic farming tips, and new techniques.',
    path: '/krishi-shorts',
  },
  analytics: {
    title: 'Farm Ledger — Track Crop Expenses & Farm Income',
    description:
      'Track your farm expenses, crop income, and profits with the digital Farm Ledger. Make data-driven decisions for better farm returns.',
    path: '/farm-ledger',
  },
  insurance: {
    title: 'PM Fasal Bima Yojana — Crop Insurance for Farmers',
    description:
      'Learn about PM Fasal Bima Yojana crop insurance — premium rates, claim process, and coverage for kharif & rabi crops. Protect your harvest.',
    path: '/crop-insurance',
  },
  'crop-calendar': {
    title: 'Crop Calendar India — Sowing & Harvesting Season Guide',
    description:
      'Know the right sowing, irrigation, fertilizer, and harvesting time for kharif, rabi, and zaid crops across Indian states.',
    path: '/crop-calendar',
  },
  'profit-calculator': {
    title: 'Crop Profit Calculator — Estimate Farm Income & Cost',
    description:
      'Calculate expected crop yield, cost of cultivation, mandi selling price, and net profit for your crops. Make profitable farming decisions.',
    path: '/profit-calculator',
  },
  'price-alerts': {
    title: 'Mandi Price Alerts — Get SMS When Prices Rise',
    description:
      'Set custom mandi price alerts and get notified when crop prices cross your target rate. Never miss the best selling window.',
    path: '/price-alerts',
    noindex: true,
  },
  services: {
    title: 'All Farm Services — 25+ Tools for Indian Farmers',
    description:
      'Explore 25+ free farm services: mandi prices, tractor rental, AI crop doctor, weather, soil test, crop calendar, loans, insurance, transport, cattle, and more.',
    path: '/services',
  },
  profile: {
    title: 'Farmer Profile & Settings — AgriConnect',
    description: 'Manage your AgriConnect farmer profile, language preferences, notifications, and account settings.',
    path: '/profile',
    noindex: true,
  },
  settings: {
    title: 'Settings — AgriConnect',
    description: 'Manage language, notifications, and app preferences for your AgriConnect account.',
    path: '/settings',
    noindex: true,
  },
  wallet: {
    title: 'Wallet & Payments — AgriConnect',
    description: 'Wallet balance, UPI/card payments, GST invoices, subscriptions, and payment history for AgriConnect.',
    path: '/wallet',
    noindex: true,
  },
  notifications: {
    title: 'Notifications — AgriConnect',
    description: 'Personalized alerts for weather, mandi prices, schemes, payments, orders, equipment bookings, and farm reminders.',
    path: '/notifications',
    noindex: true,
  },
  advisor: {
    title: 'AI Farming Advisor — Personalized Daily & Weekly Insights',
    description: 'Your dedicated AI farm advisor — daily insights, weekly reports, market opportunities, risk alerts, disease warnings, yield, water, and profit recommendations with confidence and reasoning.',
    path: '/advisor',
    noindex: true,
  },
  network: {
    title: 'Farmer Network — Farmers, Service Providers & Buyers Near You',
    description: 'Connect with verified farmers, service providers and buyers in your village. Post requirements, book tractors, labour and cold storage, chat, and read community discussions.',
    path: '/network',
    noindex: true,
  },
  'farm-os': {
    title: 'Farm OS — Your Digital Farm Twin',
    description: 'A living digital twin of your farm — AI health score, smart calendar, personalized recommendations, expense & profit tracking, and auto-generated reports from sowing to selling.',
    path: '/farm-os',
    noindex: true,
  },
};

const DEFAULT_TAB_META = TAB_SEO_META.home;

// Inner component that can access LanguageContext
const IndexInner: React.FC = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [userRole, setUserRole] = useState<"farmer" | "owner">("farmer");
  const { toastMessage, showToast } = useToastNotification();
  const { language, setLanguage, languageName } = useLanguage();
  const { user } = useAuth();
  const { queueCount } = useOfflineSync();

  // Map language code to full name for KisanChat (it uses full names for the AI prompt)
  const kisanChatLanguage = LANGUAGE_NAMES[language];

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const handleBookTractor = (_tractor: Tractor) => {
    setActiveTab("tractors");
  };

  // Every tab switch must open from the top — tabs share the document scroll
  // and would otherwise carry over the previous screen's scroll offset.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [activeTab]);

  // Securely fetch the user's role from the database or local user object
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      const localRole = (user as { role?: string }).role;
      if (localRole) {
        setUserRole(localRole as "farmer" | "owner");
        return;
      }
      try {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (data?.role) {
          setUserRole(data.role as "farmer" | "owner");
        }
      } catch (e) {
        console.error("Failed to fetch role from Supabase", e);
      }
    };
    fetchRole();
  }, [user]);

  const handleSwitchRole = async () => {
    const newRole = userRole === "farmer" ? "owner" : "farmer";
    setUserRole(newRole);
    if (user && user.id) {
      try {
        // Attempt to update Supabase if still linked
        await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
      } catch (e) {
        console.error("Supabase profile update failed", e);
      }
    }
    setActiveTab("home");
    showToast(`Switched to ${userRole === "farmer" ? "Owner" : "Farmer"} mode`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <FarmerHome
            onNavigate={handleNavigate}
            onBookTractor={handleBookTractor}
          />
        );
      case "tractors":
        return <TractorList />;
      case "mandi":
        return <MandiPrices onToast={showToast} onNavigateToAuth={() => setActiveTab("auth")} />;
      case "ai-chat":
        return <KisanChat onClose={() => setActiveTab("home")} selectedLanguage={kisanChatLanguage} />;
      case "crop-doctor":
        return <CropDoctor />;
      case "store":
        return <AgriStore onToast={showToast} />;
      case "schemes":
        return <Schemes onToast={showToast} />;
      case "loans":
        return <LoanCalculator />;
      case "labor":
        return <LaborHire onToast={showToast} />;
      case "cattle":
        return <CattleMarket />;
      case "auth":
        return <AuthPage onBack={() => setActiveTab("home")} onSuccess={() => setActiveTab("home")} />;
      case "notification-settings":
        return <NotificationSettings onToast={showToast} />;
      case "transport":
        return <Transport onToast={showToast} />;
      case "news":
        return <AgriNews />;
      case "soil":
        return <SoilTest onToast={showToast} />;
      case "mandi-finder":
        return <MandiFinder onToast={showToast} />;
      case "cold-storage":
        return <ColdStorage onToast={showToast} />;
      case "community":
        return <CommunityFeed onToast={showToast} />;
      case "krishi-shorts":
        return <KrishiShorts onToast={showToast} onClose={() => setActiveTab("home")} />;
      case "analytics":
        return <FarmLedger onToast={showToast} />;
      case "insurance":
        return <FasalBima onClose={() => setActiveTab("home")} />;
      case "crop-calendar":
        return <CropCalendar onToast={showToast} />;
      case "profit-calculator":
        return <CropProfitCalculator onToast={showToast} />;
      case "price-alerts":
        return <PriceAlerts onNavigateToAuth={() => setActiveTab("auth")} />;
      case "services":
        return <ServicesHub onNavigate={handleNavigate} />;
      case "hardware-dashboard":
        return <HardwareDashboard />;
      case "profile":
        return <DigitalProfileDashboard onNavigate={handleNavigate} />;
      case "wallet":
        return <PaymentsHub onNavigate={handleNavigate} onToast={showToast} />;
      case "notifications":
        return <NotificationCenter onNavigate={handleNavigate} onToast={showToast} />;
      case "advisor":
        return <AdvisorHub onNavigate={handleNavigate} onToast={showToast} />;
      case "network":
        return <FarmerNetworkHub onNavigate={handleNavigate} onToast={showToast} />;
      case "farm-os":
        return <FarmOsHub onNavigate={handleNavigate} onToast={showToast} />;
      case "settings":
        return (
          <ProfileSettings
            selectedLanguage={languageName}
            setSelectedLanguage={(langName: string) => {
              // Find language code from full name
              const code = Object.entries(LANGUAGE_NAMES).find(([, name]) => name === langName)?.[0] as Language | undefined;
              if (code) setLanguage(code);
            }}
            onSwitchRole={handleSwitchRole}
            userRole={userRole}
            onNavigate={handleNavigate}
            onToast={showToast}
          />
        );
      default:
        return (
          <FarmerHome
            onNavigate={handleNavigate}
            onBookTractor={handleBookTractor}
          />
        );
    }
  };

  const isFullScreen = activeTab === "ai-chat" || activeTab === "krishi-shorts";

  // Resolve per-tab SEO metadata
  const seoMeta = TAB_SEO_META[activeTab] || DEFAULT_TAB_META;

  return (
    <div className="min-h-screen w-full bg-background relative overflow-x-hidden">
      <SeoHead
        title={seoMeta.title}
        description={seoMeta.description}
        canonical={seoMeta.path}
        noindex={seoMeta.noindex}
        jsonLd={activeTab === 'home' ? homepageStructuredData() : undefined}
      />
      {!isFullScreen && <ToastNotification message={toastMessage} />}

      {/* Floating Action Area for PWA Install & Sync Badge */}
      {!isFullScreen && (
        <div className="fixed bottom-24 right-4 z-50 pointer-events-none flex flex-col gap-3 items-end">
          {queueCount > 0 && (
            <div className="pointer-events-auto bg-orange-500 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              {queueCount} Offline Updates
            </div>
          )}
          <div className="pointer-events-auto">
            <InstallPWAButton />
          </div>
        </div>
      )}
      
      {/* Full-width responsive container */}
      <main id="main-content" className={isFullScreen ? "w-full h-screen" : "w-full mx-auto max-w-screen-2xl px-6 md:px-8"}>
        <h1 className="sr-only">AgriConnect Dashboard</h1>
        <ChunkErrorBoundary label="Dashboard">
          <Suspense fallback={
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
              <span className="h-10 w-10 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin mb-3" />
              <span className="text-sm font-bold text-emerald-800">Loading AgriConnect Dashboard...</span>
            </div>
          }>
            {renderContent()}
          </Suspense>
        </ChunkErrorBoundary>
      </main>

      {!isFullScreen && (
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
      {!isFullScreen && (
        <Suspense fallback={null}>
          <AgriConnectFooter />
        </Suspense>
      )}
    </div>
  );
};

const Index: React.FC = () => (
  <RoleProvider>
    <LanguageProvider>
      <FarmProvider>
        <IndexInner />
      </FarmProvider>
    </LanguageProvider>
  </RoleProvider>
);

export default Index;
