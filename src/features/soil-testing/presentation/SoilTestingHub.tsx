import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  FlaskConical,
  Sparkles,
  BookOpen,
  PlusCircle,
  Truck,
  FileCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  Package,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { AgriCard } from '@/components/ui/agri-card';
import { AgriButton } from '@/components/ui/agri-button';
import { SoilTestPackageCard } from './components/SoilTestPackageCard';
import { SoilSamplingGuideModal } from './SoilSamplingGuideModal';
import { SoilTestBookingModal } from './SoilTestBookingModal';
import { SoilTestOrderDetailView } from './SoilTestOrderDetailView';
import { SOIL_TEST_PACKAGES } from '../domain/soilTestingPricing';
import { SoilTestOrder, SoilTestPackage, SoilTestType } from '../domain/soilTestingTypes';
import { soilTestingService } from '../domain/soilTestingService';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface SoilTestingHubProps {
  onToast?: (message: string) => void;
}

export const SoilTestingHub: React.FC<SoilTestingHubProps> = ({ onToast }) => {
  const { user } = useAuth();
  const { t, formatDate } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState<SoilTestOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState<SoilTestType>('standard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Check if URL has specific order ID
  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'soil-test' && parts[1] && parts[1] !== 'agent') {
      setSelectedOrderId(parts[1]);
    }
  }, [location.pathname]);

  const loadMyOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    const res = await soilTestingService.getFarmerOrders(user.id);
    setOrders(res.data);
    setLoadingOrders(false);
  };

  useEffect(() => {
    loadMyOrders();
  }, [user?.id]);

  const handleSelectPackage = (pkg: SoilTestPackage) => {
    setSelectedTestType(pkg.type);
    setBookingModalOpen(true);
  };

  const handleBookingSuccess = (newOrder: SoilTestOrder) => {
    if (onToast) onToast(`Soil test ${newOrder.order_number} booked successfully!`);
    loadMyOrders();
    setSelectedOrderId(newOrder.id);
  };

  // If farmer opened a specific order detail
  if (selectedOrderId) {
    return (
      <SoilTestOrderDetailView
        orderIdOrNumber={selectedOrderId}
        onBack={() => {
          setSelectedOrderId(null);
          navigate('/soil-test');
        }}
      />
    );
  }

  return (
    <div className="pb-28 pt-4 px-4 sm:px-6 max-w-6xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 text-white p-6 sm:p-10 shadow-xl border border-emerald-600/30">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold tracking-wide border border-white/20">
            <FlaskConical className="w-3.5 h-3.5 text-emerald-300" />
            <span>{t('soil.hero.badge') || 'Certified ICAR-Compliant Soil Laboratory'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {t('soil.hero.title') || 'Mitti Jaanch — Book Lab Test for Soil Health'}
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-xl">
            {t('soil.hero.subtitle') ||
              'Get your soil tested and receive a certified soil health card with tailored fertilizer doses, crop suitability, and Kisan AI insights.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <AgriButton
              onClick={() => {
                setSelectedTestType('standard');
                setBookingModalOpen(true);
              }}
              variant="primary"
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>{t('soil.cta.bookSoilTest') || 'Book Soil Test'}</span>
            </AgriButton>

            <AgriButton
              onClick={() => setGuideModalOpen(true)}
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 font-bold px-5 py-3 rounded-2xl backdrop-blur-sm flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('soil.cta.viewSamplingGuide') || 'View Sampling Guide'}</span>
            </AgriButton>
          </div>
        </div>

        {/* Decorative Badge */}
        <div className="absolute right-6 -bottom-6 hidden md:flex opacity-15 pointer-events-none">
          <FlaskConical className="w-72 h-72 text-white" />
        </div>
      </div>

      {/* "My Soil Tests" Dashboard Section */}
      {user && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-black text-foreground">
                {t('soil.myTests.title') || 'My Soil Tests'}
              </h2>
              {orders.length > 0 && (
                <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  {orders.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={loadMyOrders}
              disabled={loadingOrders}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingOrders ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingOrders ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-muted/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <AgriCard className="p-6 rounded-2xl border border-dashed border-border/80 text-center bg-card">
              <Package className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-foreground">No Soil Tests Booked Yet</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Test your soil before the upcoming sowing season to save up to 30% on fertilizer costs and boost crop yield.
              </p>
              <AgriButton
                onClick={() => setBookingModalOpen(true)}
                variant="outline"
                size="sm"
                className="mt-3 font-bold text-xs"
              >
                + Book Your First Test
              </AgriButton>
            </AgriCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => {
                const isReady =
                  order.order_status === 'report_ready' || order.order_status === 'report_delivered';

                return (
                  <AgriCard
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="p-5 rounded-2xl border border-border/70 hover:border-emerald-500/50 hover:shadow-lg transition-all cursor-pointer bg-card flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-extrabold text-foreground">
                          {order.order_number}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isReady
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : order.order_status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {order.order_status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground capitalize">
                        {order.test_type} Soil Test
                      </h4>

                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <div>Plot: {order.farm_name || order.district} ({order.crop || 'Field Crop'})</div>
                        {order.pickup_required && (
                          <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                            Pickup: {order.confirmed_pickup_date || order.preferred_pickup_date || 'Scheduled'} (₹{order.pickup_fee})
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span>{isReady ? 'View Soil Health Card' : 'Track Status'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </AgriCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Laboratory Test Packages Section */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Official Testing Catalog
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1">
            Choose Your Laboratory Test Package
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Conducted by certified agronomists using advanced spectrophotometry and atomic absorption spectroscopy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SOIL_TEST_PACKAGES.map((pkg) => (
            <SoilTestPackageCard
              key={pkg.type}
              pkg={pkg}
              onSelect={handleSelectPackage}
            />
          ))}
        </div>
      </div>

      {/* Visual Guide Teaser Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              How to Collect a Proper Soil Sample?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
              Follow our 5-spot zig-zag method at 6-inch depth to ensure your laboratory report reflects your entire field.
            </p>
          </div>
        </div>

        <AgriButton
          onClick={() => setGuideModalOpen(true)}
          variant="outline"
          className="font-bold text-xs shrink-0 rounded-xl border-emerald-600/40 hover:bg-emerald-600 hover:text-white"
        >
          <span>View Sampling Protocol</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </AgriButton>
      </div>

      {/* Modals */}
      <SoilSamplingGuideModal
        open={guideModalOpen}
        onOpenChange={setGuideModalOpen}
      />

      <SoilTestBookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        initialTestType={selectedTestType}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
};
