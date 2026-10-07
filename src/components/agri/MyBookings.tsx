import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  IndianRupee,
  Search,
  Filter,
  RefreshCw,
  Tractor,
  FlaskConical,
  HardHat,
  Truck,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Phone,
  MessageSquare,
  FileText,
  Star,
  Loader2,
  ArrowLeft,
  Package,
} from 'lucide-react';
import { AgriCard } from '@/components/ui/agri-card';
import { AgriButton } from '@/components/ui/agri-button';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { marketplaceService } from '@/features/marketplace/domain/marketplaceService';
import { soilTestingService } from '@/features/soil-testing/domain/soilTestingService';
import { BookingDetailModal } from '@/features/marketplace/presentation/BookingDetailModal';
import { CounterOfferModal } from '@/features/marketplace/presentation/CounterOfferModal';
import { ReviewModal } from '@/features/marketplace/presentation/ReviewModal';
import { ManualUpiPaymentDialog } from '@/features/payments/presentation/components/ManualUpiPaymentDialog';
import {
  MarketplaceBooking,
  BookingStatus,
  formatPriceWithUnit,
} from '@/features/marketplace/domain/marketplaceTypes';

export interface UnifiedBookingItem {
  id: string;
  source: 'marketplace' | 'tractor' | 'soil_test' | 'labor' | 'transport' | 'store';
  category: 'machinery' | 'service' | 'labor' | 'store' | 'cattle' | 'other';
  serviceTypeLabel: string;
  title: string;
  image?: string;
  providerName: string;
  providerPhone?: string;
  customerName: string;
  customerPhone?: string;
  location: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  amount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'VERIFYING' | 'REFUNDED' | 'FAILED';
  bookingStatus: BookingStatus;
  rawStatusLabel: string;
  createdAt: string;
  rawBooking?: MarketplaceBooking;
  soilReport?: any;
  notes?: string;
}

interface MyBookingsProps {
  onNavigate?: (tab: string) => void;
  onToast?: (msg: string) => void;
  initialBookingId?: string;
}

export const MyBookings: React.FC<MyBookingsProps> = ({
  onNavigate,
  onToast,
  initialBookingId,
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeCategory, setActiveCategory] = useState<
    'all' | 'machinery' | 'services' | 'labor' | 'store'
  >('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [unifiedItems, setUnifiedItems] = useState<UnifiedBookingItem[]>([]);

  // Modal States
  const [selectedBooking, setSelectedBooking] = useState<MarketplaceBooking | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [counterOfferOpen, setCounterOfferOpen] = useState(false);
  const [bookingForCounter, setBookingForCounter] = useState<MarketplaceBooking | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [bookingForReview, setBookingForReview] = useState<MarketplaceBooking | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [bookingToPay, setBookingToPay] = useState<MarketplaceBooking | null>(null);
  const [unauthorizedError, setUnauthorizedError] = useState(false);

  // Fetch and aggregate bookings from all DB sources
  const loadAllBookings = async () => {
    setLoading(true);
    setUnauthorizedError(false);
    try {
      const userId = user?.id || 'guest-farmer-01';
      const items: UnifiedBookingItem[] = [];

      // 1. Fetch Marketplace & Machinery Rentals
      const [custBookings, ownBookings] = await Promise.all([
        marketplaceService.getUserBookings(userId, 'customer'),
        marketplaceService.getUserBookings(userId, 'owner'),
      ]);

      const allMarketBookings = [...custBookings, ...ownBookings];
      // Deduplicate by ID
      const uniqueMarketMap = new Map<string, MarketplaceBooking>();
      allMarketBookings.forEach((b) => uniqueMarketMap.set(b.id, b));

      uniqueMarketMap.forEach((b) => {
        let cat: UnifiedBookingItem['category'] = 'machinery';
        if (b.listing_type === 'labour' || b.listing_type === 'labor') cat = 'labor';
        else if (b.listing_type === 'service' || b.listing_type === 'services') cat = 'service';
        else if (b.listing_type === 'cattle') cat = 'cattle';

        items.push({
          id: b.id,
          source: 'marketplace',
          category: cat,
          serviceTypeLabel:
            b.listing_type === 'machinery'
              ? 'Machinery Rental'
              : b.listing_type === 'labour'
              ? 'Labour Hire'
              : b.listing_type === 'service'
              ? 'Agri Service'
              : 'Marketplace Booking',
          title: b.listing_title || 'Equipment Rental',
          image: b.listing_image,
          providerName: b.owner_name || 'Verified Owner',
          providerPhone: b.owner_phone,
          customerName: b.customer_name || 'Customer',
          customerPhone: b.customer_phone,
          location: b.farm_location || 'Local Farm',
          startDate: b.start_at ? new Date(b.start_at).toLocaleDateString('en-IN') : undefined,
          endDate: b.end_at ? new Date(b.end_at).toLocaleDateString('en-IN') : undefined,
          startTime: b.start_time,
          amount: b.total_amount || 0,
          paymentStatus:
            b.status === 'CONFIRMED' || b.status === 'ACTIVE' || b.status === 'COMPLETED'
              ? 'PAID'
              : 'PENDING',
          bookingStatus: b.status,
          rawStatusLabel: b.status,
          createdAt: b.created_at,
          rawBooking: b,
        });
      });

      // 2. Fetch Soil Testing Orders
      try {
        const soilOrders = await soilTestingService.getUserOrders(userId);
        soilOrders.forEach((so) => {
          let bStatus: BookingStatus = 'PENDING';
          if (so.order_status === 'completed') bStatus = 'COMPLETED';
          else if (so.order_status === 'cancelled') bStatus = 'CANCELLED';
          else if (['sample_collected', 'lab_processing', 'report_generated', 'agent_assigned'].includes(so.order_status)) {
            bStatus = 'ACTIVE';
          } else if (so.order_status === 'agent_pending' || so.order_status === 'payment_confirmed') {
            bStatus = 'CONFIRMED';
          }

          items.push({
            id: so.id || so.order_number,
            source: 'soil_test',
            category: 'service',
            serviceTypeLabel: 'Soil Health Testing',
            title: `Soil Test (${so.test_type.toUpperCase()}) — ${so.crop || 'Field Samples'}`,
            image: undefined,
            providerName: 'AgriConnect Certified Soil Lab',
            providerPhone: '1800-120-7890',
            customerName: so.farmer_name,
            customerPhone: so.mobile,
            location: `${so.village ? so.village + ', ' : ''}${so.district}, ${so.state}`,
            startDate: so.preferred_pickup_date || new Date(so.created_at).toLocaleDateString('en-IN'),
            amount: so.total_amount,
            paymentStatus: so.payment_status === 'paid' ? 'PAID' : 'PENDING',
            bookingStatus: bStatus,
            rawStatusLabel: so.order_status,
            createdAt: so.created_at,
            soilReport: so.structured_report,
            notes: so.additional_notes || undefined,
          });
        });
      } catch (e) {
        console.warn('[MyBookings] Soil test orders fetch warning:', e);
      }

      // 3. Fetch Labor Requests Table
      try {
        const { data: laborData } = await supabase
          .from('labor_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (laborData && laborData.length > 0) {
          laborData.forEach((lr: any) => {
            items.push({
              id: `lr_${lr.id}`,
              source: 'labor',
              category: 'labor',
              serviceTypeLabel: 'Farm Labour Request',
              title: `${lr.work_type || 'Farm Worker'} (${lr.labor_count || 1} Laborers)`,
              providerName: 'Local Labour Contractor',
              customerName: lr.name || user?.user_metadata?.full_name || 'Farmer',
              customerPhone: lr.phone,
              location: lr.location || 'Local Farm',
              startDate: lr.date ? new Date(lr.date).toLocaleDateString('en-IN') : undefined,
              amount: (lr.labor_count || 1) * 500,
              paymentStatus: 'PENDING',
              bookingStatus: 'PENDING',
              rawStatusLabel: 'PENDING',
              createdAt: lr.created_at || new Date().toISOString(),
            });
          });
        }
      } catch (e) {
        console.warn('[MyBookings] Labor requests fetch warning:', e);
      }

      // 4. Fetch Transport Bookings Table
      try {
        const { data: transData } = await supabase
          .from('transport_bookings')
          .select('*')
          .order('created_at', { ascending: false });

        if (transData && transData.length > 0) {
          transData.forEach((tb: any) => {
            items.push({
              id: `tb_${tb.id}`,
              source: 'transport',
              category: 'service',
              serviceTypeLabel: 'Farm Transport Booking',
              title: `Transport (${tb.crop_type || 'Harvest'}) — ${tb.weight || 10} Qtl`,
              providerName: 'AgriConnect Transport Fleet',
              customerName: tb.name || 'Farmer',
              customerPhone: tb.phone,
              location: `${tb.pickup_location} ➔ ${tb.destination}`,
              startDate: tb.date ? new Date(tb.date).toLocaleDateString('en-IN') : undefined,
              amount: (tb.weight || 10) * 120,
              paymentStatus: 'PENDING',
              bookingStatus: 'CONFIRMED',
              rawStatusLabel: 'CONFIRMED',
              createdAt: tb.created_at || new Date().toISOString(),
            });
          });
        }
      } catch (e) {
        console.warn('[MyBookings] Transport bookings fetch warning:', e);
      }

      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUnifiedItems(items);

      // Deep-link auto opening if initialBookingId is passed or present in URL
      const targetId = initialBookingId || new URLSearchParams(location.search).get('bookingId');
      if (targetId) {
        const match = items.find((i) => i.id === targetId || i.rawBooking?.id === targetId);
        if (match && match.rawBooking) {
          setSelectedBooking(match.rawBooking);
          setDetailModalOpen(true);
        } else if (targetId.startsWith('book_') || targetId.startsWith('ST-') || targetId.startsWith('lr_') || targetId.startsWith('tb_')) {
          // If not found in user's list, unauthorized or non-existent
          setUnauthorizedError(true);
        }
      }
    } catch (e) {
      console.error('[MyBookings] Failed to load unified bookings:', e);
      onToast?.('Failed to load bookings. Please pull down to refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllBookings();
  }, [user]);

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Category filter
      if (activeCategory === 'machinery' && item.category !== 'machinery') return false;
      if (activeCategory === 'services' && item.category !== 'service') return false;
      if (activeCategory === 'labor' && item.category !== 'labor') return false;
      if (activeCategory === 'store' && item.category !== 'store') return false;

      // Status filter
      if (statusFilter === 'pending' && !['PENDING', 'COUNTER_OFFERED', 'PAYMENT_PENDING'].includes(item.bookingStatus)) {
        return false;
      }
      if (statusFilter === 'confirmed' && !['CONFIRMED', 'ACCEPTED', 'ACTIVE'].includes(item.bookingStatus)) {
        return false;
      }
      if (statusFilter === 'completed' && item.bookingStatus !== 'COMPLETED') {
        return false;
      }
      if (statusFilter === 'cancelled' && !['CANCELLED', 'REJECTED', 'EXPIRED'].includes(item.bookingStatus)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.serviceTypeLabel.toLowerCase().includes(q) ||
          item.providerName.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [unifiedItems, activeCategory, statusFilter, searchQuery]);

  const handleOpenDetail = (item: UnifiedBookingItem) => {
    if (item.rawBooking) {
      setSelectedBooking(item.rawBooking);
      setDetailModalOpen(true);
    } else {
      // Construct a valid MarketplaceBooking object for detailed modal
      const syntheticBooking: MarketplaceBooking = {
        id: item.id,
        listing_id: item.id,
        listing_title: item.title,
        listing_type: item.category === 'machinery' ? 'machinery' : item.category === 'labor' ? 'labour' : 'service',
        listing_image: item.image,
        customer_id: user?.id || 'cust-01',
        customer_name: item.customerName,
        customer_phone: item.customerPhone || '9876543210',
        owner_id: 'provider-01',
        owner_name: item.providerName,
        owner_phone: item.providerPhone || '1800-120-7890',
        status: item.bookingStatus,
        start_at: item.startDate || new Date().toISOString(),
        end_at: item.endDate || new Date().toISOString(),
        start_time: item.startTime,
        duration: 1,
        duration_unit: 'day',
        pricing_unit: 'day',
        quantity: 1,
        farm_location: item.location,
        delivery_required: false,
        operator_required: false,
        rental_amount: item.amount,
        delivery_amount: 0,
        operator_amount: 0,
        security_deposit: 0,
        total_amount: item.amount,
        created_at: item.createdAt,
        updated_at: item.createdAt,
      };
      setSelectedBooking(syntheticBooking);
      setDetailModalOpen(true);
    }
  };

  const handlePayBooking = (item: UnifiedBookingItem) => {
    if (item.rawBooking) {
      setBookingToPay(item.rawBooking);
    } else {
      setBookingToPay({
        id: item.id,
        listing_id: item.id,
        listing_title: item.title,
        listing_type: 'service',
        customer_id: user?.id || 'cust-01',
        customer_name: item.customerName,
        customer_phone: item.customerPhone || '',
        owner_id: 'provider-01',
        owner_name: item.providerName,
        owner_phone: item.providerPhone || '',
        status: item.bookingStatus,
        start_at: new Date().toISOString(),
        end_at: new Date().toISOString(),
        duration: 1,
        duration_unit: 'day',
        pricing_unit: 'day',
        quantity: 1,
        farm_location: item.location,
        delivery_required: false,
        operator_required: false,
        rental_amount: item.amount,
        delivery_amount: 0,
        operator_amount: 0,
        security_deposit: 0,
        total_amount: item.amount,
        created_at: item.createdAt,
        updated_at: item.createdAt,
      });
    }
    setPaymentDialogOpen(true);
  };

  const getSourceIcon = (category: UnifiedBookingItem['category']) => {
    switch (category) {
      case 'machinery':
        return Tractor;
      case 'service':
        return FlaskConical;
      case 'labor':
        return HardHat;
      case 'store':
        return ShoppingBag;
      default:
        return Package;
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
      case 'ACCEPTED':
        return {
          label: 'Accepted / Confirmed',
          color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          icon: CheckCircle2,
        };
      case 'ACTIVE':
        return {
          label: 'Active / Scheduled',
          color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
          icon: Clock,
        };
      case 'COMPLETED':
        return {
          label: 'Completed',
          color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
          icon: ShieldCheck,
        };
      case 'COUNTER_OFFERED':
        return {
          label: 'Counter Offer Received',
          color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          icon: AlertCircle,
        };
      case 'REJECTED':
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
          icon: XCircle,
        };
      case 'PENDING':
      default:
        return {
          label: 'Pending Response',
          color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
          icon: Clock,
        };
    }
  };

  return (
    <div className="min-h-screen pb-32 pt-4 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AgriButton
              size="sm"
              variant="outline"
              onClick={() => (onNavigate ? onNavigate('home') : navigate('/'))}
              className="rounded-full w-8 h-8 p-0"
            >
              <ArrowLeft size={16} />
            </AgriButton>
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Calendar className="text-emerald-600 dark:text-emerald-400" />
              {language === 'hi' ? 'मेरी बुकिंग्स (My Bookings)' : 'My Bookings & Orders'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {language === 'hi'
              ? 'आपकी सभी ट्रैक्टर, उपकरण, मिट्टी जांच, मजदूर एवं कृषि सेवाएं'
              : 'Centralized record of all your machinery rentals, soil tests, labour, and agricultural services.'}
          </p>
        </div>

        <AgriButton
          onClick={loadAllBookings}
          variant="outline"
          size="sm"
          className="self-start md:self-auto gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {language === 'hi' ? 'रीफ्रेश (Refresh)' : 'Refresh'}
        </AgriButton>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
        {[
          { id: 'all', label: language === 'hi' ? 'सभी (All)' : 'All Bookings', icon: Package },
          { id: 'machinery', label: language === 'hi' ? 'मशीनरी (Machinery)' : 'Machinery Rentals', icon: Tractor },
          { id: 'services', label: language === 'hi' ? 'सेवाएं (Services)' : 'Soil & Services', icon: FlaskConical },
          { id: 'labor', label: language === 'hi' ? 'मज़दूर (Labour)' : 'Labour Hire', icon: HardHat },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                active
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'hi'
                ? 'बुकिंग ID, उपकरण, या शहर खोजें...'
                : 'Search by Booking ID, equipment, location, or provider...'
            }
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground ml-1" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full py-2.5 px-3 bg-card border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="all">{language === 'hi' ? 'सभी स्टेटस (All Status)' : 'All Statuses'}</option>
            <option value="pending">{language === 'hi' ? 'पेंडिंग (Pending Response)' : 'Pending'}</option>
            <option value="confirmed">{language === 'hi' ? 'पुष्ट / सक्रिय (Confirmed / Active)' : 'Confirmed & Active'}</option>
            <option value="completed">{language === 'hi' ? 'पूरा हुआ (Completed)' : 'Completed'}</option>
            <option value="cancelled">{language === 'hi' ? 'रद्द (Cancelled)' : 'Cancelled'}</option>
          </select>
        </div>
      </div>

      {/* Unauthorized Deep-Link Access Alert */}
      {unauthorizedError && (
        <AgriCard className="mb-6 border-2 border-rose-500/30 bg-rose-500/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="text-rose-500" size={24} />
            <div>
              <h4 className="font-bold text-foreground">Unauthorized Access / Booking Not Found</h4>
              <p className="text-xs text-muted-foreground">
                The requested booking ID belongs to another user or does not exist on your account.
              </p>
            </div>
          </div>
          <AgriButton size="sm" variant="outline" onClick={() => setUnauthorizedError(false)}>
            Dismiss
          </AgriButton>
        </AgriCard>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {language === 'hi' ? 'बुकिंग डेटा लोड हो रहा है...' : 'Fetching your live database bookings…'}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <AgriCard className="py-16 text-center border-dashed border-2 border-border">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            {language === 'hi' ? 'कोई बुकिंग नहीं मिली' : 'No Bookings Found'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            {searchQuery || activeCategory !== 'all' || statusFilter !== 'all'
              ? 'No bookings match your current search filters. Try clearing your filters.'
              : language === 'hi'
              ? 'आपने अभी तक कोई ट्रैक्टर, मिट्टी परीक्षण या मजदूर बुक नहीं किया है।'
              : 'You have not booked any machinery, soil test, or labor service yet.'}
          </p>
          <AgriButton
            onClick={() => (onNavigate ? onNavigate('tractors') : navigate('/tractors'))}
            className="bg-emerald-600 text-white font-bold shadow-md hover:bg-emerald-700"
          >
            {language === 'hi' ? 'मार्केटप्लेस में खोजें (Browse Marketplace)' : 'Explore Marketplace'}
          </AgriButton>
        </AgriCard>
      ) : (
        /* Booking Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const Icon = getSourceIcon(item.category);
            const statusBadge = getStatusBadge(item.bookingStatus);
            const StatusIcon = statusBadge.icon;

            return (
              <AgriCard
                key={item.id}
                className="hover:shadow-lg transition-all border border-border/80 flex flex-col justify-between"
              >
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        <Icon size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          {item.serviceTypeLabel}
                        </span>
                        <p className="text-[11px] text-muted-foreground">ID: #{item.id.slice(0, 10)}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusBadge.color}`}
                    >
                      <StatusIcon size={12} />
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Title & Pricing */}
                  <div className="mb-3">
                    <h3 className="font-bold text-base text-foreground line-clamp-1">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                      {item.startDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar size={12} /> {item.startDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Provider & Location Details */}
                  <div className="space-y-1 text-xs text-muted-foreground mb-4">
                    <p className="flex items-center gap-1">
                      <MapPin size={12} className="text-emerald-600" />
                      <span className="truncate">{item.location}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <ShieldCheck size={12} className="text-emerald-600" />
                      <span>Provider: <strong>{item.providerName}</strong></span>
                    </p>
                  </div>
                </div>

                {/* Next Action Buttons */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                  <AgriButton
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDetail(item)}
                    className="text-xs font-semibold gap-1"
                  >
                    View Details
                    <ChevronRight size={14} />
                  </AgriButton>

                  {/* Contextual Next-Action Buttons */}
                  {item.bookingStatus === 'ACCEPTED' || item.bookingStatus === 'COUNTER_OFFERED' ? (
                    <AgriButton
                      size="sm"
                      onClick={() => handlePayBooking(item)}
                      className="bg-emerald-600 text-white text-xs font-bold gap-1 shadow-md hover:bg-emerald-700"
                    >
                      <IndianRupee size={14} />
                      Pay & Confirm
                    </AgriButton>
                  ) : item.bookingStatus === 'CONFIRMED' || item.bookingStatus === 'ACTIVE' ? (
                    <AgriButton
                      size="sm"
                      onClick={() => handleOpenDetail(item)}
                      className="bg-blue-600 text-white text-xs font-bold gap-1 shadow-md hover:bg-blue-700"
                    >
                      <Clock size={14} />
                      Track / Status
                    </AgriButton>
                  ) : item.bookingStatus === 'COMPLETED' ? (
                    <AgriButton
                      size="sm"
                      onClick={() => {
                        if (item.rawBooking) {
                          setBookingForReview(item.rawBooking);
                          setReviewOpen(true);
                        } else {
                          handleOpenDetail(item);
                        }
                      }}
                      className="bg-indigo-600 text-white text-xs font-bold gap-1 shadow-md hover:bg-indigo-700"
                    >
                      <Star size={14} />
                      Rate & Review
                    </AgriButton>
                  ) : item.providerPhone ? (
                    <a
                      href={`tel:${item.providerPhone}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                    >
                      <Phone size={12} />
                      Call Provider
                    </a>
                  ) : null}
                </div>
              </AgriCard>
            );
          })}
        </div>
      )}

      {/* Booking Detail Modal */}
      <BookingDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        booking={selectedBooking}
        onSuccess={loadAllBookings}
        onToast={onToast}
        onOpenCounterOffer={(b) => {
          setBookingForCounter(b);
          setCounterOfferOpen(true);
        }}
        onOpenReview={(b) => {
          setBookingForReview(b);
          setReviewOpen(true);
        }}
      />

      {/* Counter Offer Modal */}
      <CounterOfferModal
        open={counterOfferOpen}
        onOpenChange={setCounterOfferOpen}
        booking={bookingForCounter}
        onSuccess={loadAllBookings}
        onToast={onToast}
      />

      {/* Review Modal */}
      <ReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        booking={bookingForReview}
        onSuccess={loadAllBookings}
        onToast={onToast}
      />

      {/* Manual UPI Payment Modal */}
      {bookingToPay && (
        <ManualUpiPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          plan={{
            id: bookingToPay.id,
            name: bookingToPay.listing_title || 'Equipment Rental',
            price: bookingToPay.total_amount || 500,
          }}
          userId={user?.id || ''}
          onToast={onToast}
          onSubmitted={() => {
            setPaymentDialogOpen(false);
            marketplaceService.updateBookingStatus(bookingToPay.id, 'CONFIRMED', user?.id || 'cust-01');
            onToast?.('Payment submitted! Your booking status is updated to CONFIRMED.');
            loadAllBookings();
          }}
        />
      )}
    </div>
  );
};

export default MyBookings;
