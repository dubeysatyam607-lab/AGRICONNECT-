import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  SlidersHorizontal,
  Tractor,
  Layers,
  Wheat,
  RefreshCw,
  Sprout,
  Users,
  Package,
  Wrench,
  Store,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Filter,
  X,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  MarketplaceListing,
  MarketplaceBookingRequest,
  MarketplaceCategory,
  MARKETPLACE_CATEGORIES,
  BookingRequestStatus,
  formatPriceWithUnit,
} from '../domain/marketplaceTypes';
import { marketplaceService } from '../domain/marketplaceService';
import { ListingCard } from './ListingCard';
import { CreateEditListingModal } from './CreateEditListingModal';
import { ListingDetailModal } from './ListingDetailModal';
import { BookingRequestModal } from './BookingRequestModal';
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
  const [activeTab, setActiveTab] = useState<'browse' | 'my_listings' | 'my_bookings'>('browse');

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [bookings, setBookings] = useState<MarketplaceBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<MarketplaceListing | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [listingToBook, setListingToBook] = useState<MarketplaceListing | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [listingToReport, setListingToReport] = useState<MarketplaceListing | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allListings, userListings, userBookings] = await Promise.all([
        marketplaceService.getListings({
          category: activeCategory,
          searchQuery,
          state: selectedState || undefined,
          district: selectedDistrict || undefined,
          sortBy: priceSort,
        }),
        user ? marketplaceService.getUserListings(user.id) : Promise.resolve([]),
        user ? marketplaceService.getUserBookingRequests(user.id) : Promise.resolve([]),
      ]);
      setListings(allListings);
      setMyListings(userListings);
      setBookings(userBookings);
    } catch (e: any) {
      console.error('Failed to load marketplace listings:', e);
      onToast?.('Failed to refresh marketplace listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCategory, searchQuery, selectedState, selectedDistrict, priceSort, user]);

  const handleListingCreatedOrUpdated = (savedListing: MarketplaceListing) => {
    loadData();
  };

  const handleDeleteListing = async (listing: MarketplaceListing) => {
    if (!window.confirm(`Are you sure you want to delete "${listing.title}"?`)) return;
    try {
      const userId = user?.id || 'guest-farmer-01';
      await marketplaceService.deleteListing(listing.id, userId);
      onToast?.('Listing deleted successfully');
      loadData();
    } catch (e: any) {
      onToast?.(e.message || 'Failed to delete listing');
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: BookingRequestStatus,
    reason?: string
  ) => {
    try {
      const userId = user?.id || 'guest-farmer-01';
      await marketplaceService.updateBookingStatus(bookingId, status, userId, reason);
      onToast?.(`Booking request marked as ${status}`);
      loadData();
    } catch (e: any) {
      onToast?.(e.message || 'Failed to update booking status');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted text-xs font-semibold text-primary">
            <span>100% Direct farmer marketplace · No middleman</span>
          </div>

          <h1 className="type-h1 text-foreground">
            AgriConnect Marketplace
          </h1>

          <p className="type-small text-muted-foreground leading-relaxed">
            Rent machinery, hire skilled farm labour, trade certified cattle, and buy/sell organic farm produce directly without any middleman commission.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setListingToEdit(null);
                setCreateModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-lg font-semibold type-meta bg-primary text-white hover:bg-primary/90 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>List Item / Offer Service</span>
            </button>

            <button
              onClick={() => setActiveTab('my_bookings')}
              className="px-4 py-2.5 rounded-lg font-semibold type-meta bg-muted hover:bg-muted/70 text-foreground flex items-center gap-1.5 transition-colors"
            >
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span>My Booking Requests ({bookings.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-2 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
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
            Booking Requests ({bookings.length})
          </button>
        </div>

        <button
          onClick={() => {
            setListingToEdit(null);
            setCreateModalOpen(true);
          }}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Listing</span>
        </button>
      </div>

      {/* TAB 1: BROWSE MARKETPLACE */}
      {activeTab === 'browse' && (
        <div className="space-y-5">
          {/* 9 Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:border-emerald-500/40 hover:text-foreground'
              }`}
            >
              All Categories
            </button>
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-card border border-border text-muted-foreground hover:border-emerald-500/40 hover:text-foreground'
                }`}
              >
                <span>{cat.nameEn}</span>
              </button>
            ))}
          </div>

          {/* Search & Sort Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tractors, rotavators, cattle, labour teams, or organic produce..."
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
                className="px-3 py-2.5 text-xs bg-card border border-border rounded-xl text-foreground font-semibold"
              >
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="popular">Most Viewed</option>
              </select>
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <div className="text-xs font-bold text-muted-foreground">Loading verified listings…</div>
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-border bg-card/50 p-6 space-y-3">
              <Package className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No listings found in this category</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Be the first farmer to list machinery, cattle, or produce in this category.
              </p>
              <button
                onClick={() => {
                  setListingToEdit(null);
                  setCreateModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Listing</span>
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
            <h2 className="text-sm font-semibold text-foreground">
              Your Published Listings ({myListings.length})
            </h2>
            <button
              onClick={() => {
                setListingToEdit(null);
                setCreateModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Listing</span>
            </button>
          </div>

          {myListings.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-border bg-card/50 p-6 space-y-3">
              <Tractor className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold text-foreground">You have not published any listings yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                List your idle tractor, rotavator, cattle, or produce to start receiving direct booking requests.
              </p>
              <button
                onClick={() => {
                  setListingToEdit(null);
                  setCreateModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publish Your First Listing</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map((listing) => (
                <ListingCard
                  key={listing.id}
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY BOOKINGS & REQUESTS */}
      {activeTab === 'my_bookings' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Booking & Service Requests ({bookings.length})
          </h2>

          {bookings.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-border bg-card/50 p-6 space-y-3">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No booking requests yet</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Explore machinery and services in the marketplace to send direct booking requests to owners.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const isOwner = booking.owner_id === user?.id;
                return (
                  <div
                    key={booking.id}
                    className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {booking.listing_title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            booking.status === 'accepted'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : booking.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              : booking.status === 'cancelled'
                              ? 'bg-muted text-muted-foreground'
                              : booking.status === 'completed'
                              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                        <span>
                          {isOwner ? `Requester: ${booking.requester_name}` : `Provider: ${booking.owner_name}`}
                        </span>
                        <span>·</span>
                        <span>Start: {booking.start_date}</span>
                        <span>·</span>
                        <span className="font-bold text-foreground">₹{booking.offered_amount.toLocaleString('en-IN')}</span>
                      </div>

                      {booking.location_address && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>{booking.location_address}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for Bookings */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {booking.status === 'pending' && isOwner && (
                        <>
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, 'accepted')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleUpdateBookingStatus(booking.id, 'rejected')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {booking.status === 'pending' && !isOwner && (
                        <button
                          onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:bg-muted"
                        >
                          Cancel Request
                        </button>
                      )}

                      {booking.status === 'accepted' && (
                        <button
                          onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateEditListingModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        listingToEdit={listingToEdit}
        onSuccess={handleListingCreatedOrUpdated}
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
