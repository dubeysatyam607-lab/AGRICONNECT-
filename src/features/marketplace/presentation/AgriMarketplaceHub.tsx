import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Tractor,
  Calendar,
  CheckCircle2,
  XCircle,
  X,
  Package,
  ShieldAlert,
  Loader2,
  MapPin,
  ShieldCheck,
  RotateCcw,
  Star,
  PlayCircle,
  FileText,
} from 'lucide-react';
import {
  MarketplaceListing,
  MarketplaceBooking,
  MarketplaceCategory,
  MARKETPLACE_CATEGORIES,
  BookingStatus,
  MarketplaceAvailability,
  MarketplaceReport,
  formatPriceWithUnit,
} from '../domain/marketplaceTypes';
import { marketplaceService } from '../domain/marketplaceService';
import { ListingCard } from './ListingCard';
import { CreateEditListingModal } from './CreateEditListingModal';
import { ListingDetailModal } from './ListingDetailModal';
import { BookingRequestModal } from './BookingRequestModal';
import { BookingDetailModal } from './BookingDetailModal';
import { CounterOfferModal } from './CounterOfferModal';
import { ReviewModal } from './ReviewModal';
import { ReportListingModal } from './ReportListingModal';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

interface AgriMarketplaceHubProps {
  onNavigate?: (tab: string) => void;
  onToast?: (msg: string) => void;
}

export const AgriMarketplaceHub: React.FC<AgriMarketplaceHubProps> = ({
  onNavigate,
  onToast,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeCategory, setActiveCategory] = useState<MarketplaceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [priceSort, setPriceSort] = useState<'newest' | 'price_low' | 'price_high' | 'popular'>('newest');
  const [activeTab, setActiveTab] = useState<'browse' | 'my_listings' | 'my_bookings' | 'my_rentals' | 'admin'>('browse');

  // Customer sub-tab for My Bookings
  const [bookingFilterTab, setBookingFilterTab] = useState<'upcoming' | 'active' | 'completed' | 'cancelled'>('upcoming');

  // Owner sub-tab for My Rentals
  const [rentalFilterTab, setRentalFilterTab] = useState<'pending' | 'active' | 'history'>('pending');

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [customerBookings, setCustomerBookings] = useState<MarketplaceBooking[]>([]);
  const [ownerRentals, setOwnerRentals] = useState<MarketplaceBooking[]>([]);
  const [reports, setReports] = useState<MarketplaceReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<MarketplaceListing | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [listingToBook, setListingToBook] = useState<MarketplaceListing | null>(null);

  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<MarketplaceBooking | null>(null);

  const [counterOfferOpen, setCounterOfferOpen] = useState(false);
  const [bookingForCounter, setBookingForCounter] = useState<MarketplaceBooking | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [bookingForReview, setBookingForReview] = useState<MarketplaceBooking | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [listingToReport, setListingToReport] = useState<MarketplaceListing | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allListings, userListings, custBookings, ownBookings] = await Promise.all([
        marketplaceService.getListings({
          category: activeCategory,
          searchQuery,
          state: selectedState || undefined,
          district: selectedDistrict || undefined,
          sortBy: priceSort,
        }),
        user ? marketplaceService.getUserListings(user.id) : Promise.resolve([]),
        user ? marketplaceService.getUserBookings(user.id, 'customer') : Promise.resolve([]),
        user ? marketplaceService.getUserBookings(user.id, 'owner') : Promise.resolve([]),
      ]);

      setListings(allListings);
      setMyListings(userListings);
      setCustomerBookings(custBookings);
      setOwnerRentals(ownBookings);

      if (user && activeTab === 'admin') {
        const adminReports = await marketplaceService.getReportedListings();
        setReports(adminReports);
      }
    } catch (e: any) {
      console.error('Failed to load marketplace listings:', e);
      onToast?.('Failed to refresh marketplace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCategory, searchQuery, selectedState, selectedDistrict, priceSort, user, activeTab]);

  // Realtime DB subscriptions
  useEffect(() => {
    const listChannel = marketplaceService.subscribeToListings(() => loadData());
    const userId = user?.id || 'guest';
    const bookChannel = marketplaceService.subscribeToBookings(userId, () => loadData());

    return () => {
      marketplaceService.unsubscribeFromListings(listChannel);
      marketplaceService.unsubscribeFromListings(bookChannel);
    };
  }, [user]);

  const handleDeleteListing = async (listing: MarketplaceListing) => {
    if (!window.confirm(`Are you sure you want to delete listing "${listing.title}"?`)) return;
    try {
      const userId = user?.id || 'guest-farmer-01';
      await marketplaceService.deleteListing(listing.id, userId);
      onToast?.('Listing deleted successfully');
      loadData();
    } catch (e: any) {
      onToast?.(e.message || 'Failed to delete listing');
    }
  };

  const handleUpdateAvailability = async (
    listing: MarketplaceListing,
    newStatus: MarketplaceAvailability
  ) => {
    try {
      const userId = user?.id || 'guest-farmer-01';
      await marketplaceService.updateListingAvailability(listing.id, userId, newStatus);
      onToast?.(`Status updated to "${newStatus.replace('_', ' ')}"`);
      loadData();
    } catch (e: any) {
      onToast?.(e.message || 'Failed to update status');
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: BookingStatus,
    reason?: string
  ) => {
    try {
      const userId = user?.id || 'guest-farmer-01';
      await marketplaceService.updateBookingStatus(bookingId, status, userId, reason);
      onToast?.(`Booking status updated to ${status}`);
      loadData();
    } catch (e: any) {
      onToast?.(e.message || 'Failed to update booking status');
    }
  };

  // Filtered customer bookings
  const filteredCustomerBookings = customerBookings.filter((b) => {
    if (bookingFilterTab === 'upcoming') return ['PENDING', 'ACCEPTED', 'CONFIRMED'].includes(b.status);
    if (bookingFilterTab === 'active') return b.status === 'ACTIVE';
    if (bookingFilterTab === 'completed') return b.status === 'COMPLETED';
    if (bookingFilterTab === 'cancelled') return ['CANCELLED', 'REJECTED', 'EXPIRED'].includes(b.status);
    return true;
  });

  // Filtered owner rentals
  const filteredOwnerRentals = ownerRentals.filter((b) => {
    if (rentalFilterTab === 'pending') return ['PENDING', 'COUNTER_OFFERED'].includes(b.status);
    if (rentalFilterTab === 'active') return ['ACCEPTED', 'CONFIRMED', 'ACTIVE'].includes(b.status);
    if (rentalFilterTab === 'history') return ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(b.status);
    return true;
  });

  return (
    <div className="space-y-6 pb-12 text-foreground">
      {/* Header Banner */}
      <div className="relative rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Real Database-Backed Agricultural Marketplace & Rental Engine</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            AgriConnect Marketplace & Rental Hub
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Direct farmer-to-farmer asset sharing. List real machinery, cattle, farm workers, or agricultural services with server-side conflict checking & complete rental lifecycle management.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setListingToEdit(null);
                setCreateModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ List Your Asset / Service</span>
            </button>

            <button
              onClick={() => setActiveTab('my_bookings')}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-muted hover:bg-muted/70 text-foreground flex items-center gap-2 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>My Bookings ({customerBookings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('my_rentals')}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-muted hover:bg-muted/70 text-foreground flex items-center gap-2 transition-colors"
            >
              <Tractor className="w-4 h-4" />
              <span>My Rental Requests ({ownerRentals.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center justify-between border-b border-border pb-2 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'browse'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Explore Marketplace ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab('my_listings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'my_listings'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            My Listings ({myListings.length})
          </button>
          <button
            onClick={() => setActiveTab('my_bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'my_bookings'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            My Bookings ({customerBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('my_rentals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'my_rentals'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            My Rentals ({ownerRentals.length})
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Moderation</span>
          </button>
        </div>

        <button
          onClick={() => {
            setListingToEdit(null);
            setCreateModalOpen(true);
          }}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ List Your Asset</span>
        </button>
      </div>

      {/* TAB 1: BROWSE MARKETPLACE */}
      {activeTab === 'browse' && (
        <div className="space-y-5">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:border-emerald-500/40 hover:text-foreground'
              }`}
            >
              All Listings
            </button>
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-card border border-border text-muted-foreground hover:border-emerald-500/40 hover:text-foreground'
                }`}
              >
                <span>{cat.nameEn}</span>
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tractors, harvesters, cattle breeds, farm labour, or services..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-card border border-border rounded-xl focus:ring-2 focus:ring-emerald-500 text-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as any)}
                className="px-3 py-2.5 text-xs bg-card border border-border rounded-xl text-foreground font-bold"
              >
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <div className="text-xs font-bold text-muted-foreground">Fetching listings from database…</div>
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/50 p-6 space-y-3">
              <Package className="w-12 h-12 text-muted-foreground/60 mx-auto" />
              <h3 className="text-base font-bold text-foreground">No listings available yet.</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Be the first registered AgriConnect farmer to list real machinery, cattle, or farm services.
              </p>
              <button
                onClick={() => {
                  setListingToEdit(null);
                  setCreateModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ List Your Asset / Service</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onSelect={(l) => {
                    setSelectedListing(l);
                    setDetailModalOpen(true);
                  }}
                  onBook={(l) => {
                    setListingToBook(l);
                    setBookingModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY LISTINGS */}
      {activeTab === 'my_listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">
                My Listings ({myListings.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage availability status, edit details, or remove your published listings.
              </p>
            </div>

            <button
              onClick={() => {
                setListingToEdit(null);
                setCreateModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ List Your Asset</span>
            </button>
          </div>

          {myListings.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/50 p-6 space-y-3">
              <Tractor className="w-12 h-12 text-muted-foreground/60 mx-auto" />
              <h3 className="text-base font-bold text-foreground">No listings available yet.</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                You haven't listed any machinery, cattle, labour, or agricultural services under your account.
              </p>
              <button
                onClick={() => {
                  setListingToEdit(null);
                  setCreateModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ List Your Asset / Service</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map((listing) => (
                <div key={listing.id} className="space-y-2">
                  <ListingCard
                    listing={listing}
                    isOwner={true}
                    onSelect={(l) => {
                      setSelectedListing(l);
                      setDetailModalOpen(true);
                    }}
                    onEdit={(l) => {
                      setListingToEdit(l);
                      setCreateModalOpen(true);
                    }}
                    onDelete={handleDeleteListing}
                  />

                  {/* Owner Status Toolbar */}
                  <div className="p-2.5 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-1.5 text-xs">
                    <span className="font-bold text-muted-foreground">Quick Status:</span>
                    <div className="flex flex-wrap gap-1">
                      {listing.availability !== 'available' && (
                        <button
                          onClick={() => handleUpdateAvailability(listing, 'available')}
                          className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-500/20"
                        >
                          Available
                        </button>
                      )}
                      {listing.availability !== 'rented' && (
                        <button
                          onClick={() => handleUpdateAvailability(listing, 'rented')}
                          className="px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-500/20"
                        >
                          Mark Rented
                        </button>
                      )}
                      {listing.availability !== 'unavailable' && (
                        <button
                          onClick={() => handleUpdateAvailability(listing, 'unavailable')}
                          className="px-2 py-1 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold hover:bg-rose-500/20"
                        >
                          Mark Unavailable
                        </button>
                      )}
                      {listing.availability !== 'paused' && (
                        <button
                          onClick={() => handleUpdateAvailability(listing, 'paused')}
                          className="px-2 py-1 rounded bg-slate-500/10 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-500/20"
                        >
                          Pause
                        </button>
                      )}
                      {listing.availability !== 'sold' && (
                        <button
                          onClick={() => handleUpdateAvailability(listing, 'sold')}
                          className="px-2 py-1 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-500/20"
                        >
                          Mark Sold
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTOMER "MY BOOKINGS" */}
      {activeTab === 'my_bookings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                My Bookings ({customerBookings.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Track your rental requests, active work, and booking history.
              </p>
            </div>

            {/* Sub-tabs for Customer */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
              <button
                onClick={() => setBookingFilterTab('upcoming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bookingFilterTab === 'upcoming'
                    ? 'bg-card text-emerald-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setBookingFilterTab('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bookingFilterTab === 'active'
                    ? 'bg-card text-blue-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setBookingFilterTab('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bookingFilterTab === 'completed'
                    ? 'bg-card text-indigo-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setBookingFilterTab('cancelled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  bookingFilterTab === 'cancelled'
                    ? 'bg-card text-rose-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Cancelled
              </button>
            </div>
          </div>

          {filteredCustomerBookings.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/50 p-6 space-y-3">
              <Calendar className="w-12 h-12 text-muted-foreground/60 mx-auto" />
              <h3 className="text-base font-bold text-foreground">No bookings found in this category</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Explore listings in the marketplace to send direct booking requests to equipment & service owners.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCustomerBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBooking(b);
                    setBookingDetailOpen(true);
                  }}
                  className="p-4 rounded-2xl border border-border bg-card hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-foreground line-clamp-1">
                      {b.listing_title}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      {b.status}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div><strong>Owner:</strong> {b.owner_name} ({b.owner_phone})</div>
                    <div><strong>Date & Duration:</strong> {new Date(b.start_at).toLocaleDateString('en-IN')} · {b.duration} {b.duration_unit}(s)</div>
                    <div><strong>Location:</strong> {b.farm_location}</div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                      Total: ₹{b.total_amount.toLocaleString('en-IN')}
                    </span>
                    <button className="px-3 py-1.5 rounded-xl bg-muted text-foreground font-bold hover:bg-muted/80">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: OWNER "MY RENTALS & REQUESTS" */}
      {activeTab === 'my_rentals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                My Rental Requests & Active Jobs ({ownerRentals.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Review incoming requests from farmers, propose counter offers, and update job progress.
              </p>
            </div>

            {/* Sub-tabs for Owner */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
              <button
                onClick={() => setRentalFilterTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rentalFilterTab === 'pending'
                    ? 'bg-card text-amber-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pending Requests
              </button>
              <button
                onClick={() => setRentalFilterTab('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rentalFilterTab === 'active'
                    ? 'bg-card text-blue-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active Rentals
              </button>
              <button
                onClick={() => setRentalFilterTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rentalFilterTab === 'history'
                    ? 'bg-card text-indigo-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                History
              </button>
            </div>
          </div>

          {filteredOwnerRentals.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/50 p-6 space-y-3">
              <Tractor className="w-12 h-12 text-muted-foreground/60 mx-auto" />
              <h3 className="text-base font-bold text-foreground">No rental requests in this tab</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                When farmers request your machinery or farm services, direct requests will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOwnerRentals.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBooking(b);
                    setBookingDetailOpen(true);
                  }}
                  className="p-4 rounded-2xl border border-border bg-card hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-foreground">
                        {b.listing_title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        {b.status}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                      <span><strong>Customer:</strong> {b.customer_name} ({b.customer_phone})</span>
                      <span>·</span>
                      <span><strong>Start:</strong> {new Date(b.start_at).toLocaleDateString('en-IN')}</span>
                      <span>·</span>
                      <span className="font-extrabold text-foreground">₹{b.total_amount.toLocaleString('en-IN')}</span>
                    </div>

                    {b.farm_location && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{b.farm_location}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {b.status === 'PENDING' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateBookingStatus(b.id, 'ACCEPTED');
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBookingForCounter(b);
                            setCounterOfferOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Counter</span>
                        </button>
                      </>
                    )}

                    {b.status === 'CONFIRMED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateBookingStatus(b.id, 'ACTIVE');
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-sm"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Start Rental</span>
                      </button>
                    )}

                    {b.status === 'ACTIVE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateBookingStatus(b.id, 'COMPLETED');
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ADMIN MODERATION */}
      {activeTab === 'admin' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span>Admin Marketplace Moderation Hub</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Review user reports, take action on fraudulent listings, and maintain community safety.
            </p>
          </div>

          {reports.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/50 p-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-foreground">No reports requiring moderation</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                All community listings are currently clean and clear.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-amber-500/30 bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        Listing ID: {r.listing_id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 uppercase">
                        Reason: {r.reason}
                      </span>
                    </div>

                    <p className="text-muted-foreground">
                      <strong>Reporter:</strong> {r.reporter_id} · <strong>Submitted:</strong> {new Date(r.created_at).toLocaleString()}
                    </p>

                    <p className="italic bg-muted/60 p-2 rounded-lg text-foreground">
                      "{r.details}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateEditListingModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        listingToEdit={listingToEdit}
        onSuccess={loadData}
        onToast={onToast}
      />

      <ListingDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        listing={selectedListing}
        onBook={(listing) => {
          setListingToBook(listing);
          setBookingModalOpen(true);
        }}
        onReport={(listing) => {
          setListingToReport(listing);
          setReportModalOpen(true);
        }}
        onToast={onToast}
      />

      <BookingRequestModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        listing={listingToBook}
        onSuccess={loadData}
        onToast={onToast}
      />

      <BookingDetailModal
        open={bookingDetailOpen}
        onOpenChange={setBookingDetailOpen}
        booking={selectedBooking}
        onSuccess={loadData}
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

      <CounterOfferModal
        open={counterOfferOpen}
        onOpenChange={setCounterOfferOpen}
        booking={bookingForCounter}
        onSuccess={loadData}
        onToast={onToast}
      />

      <ReviewModal
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        booking={bookingForReview}
        onSuccess={loadData}
        onToast={onToast}
      />

      <ReportListingModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        listing={listingToReport}
        onSuccess={loadData}
        onToast={onToast}
      />
    </div>
  );
};
