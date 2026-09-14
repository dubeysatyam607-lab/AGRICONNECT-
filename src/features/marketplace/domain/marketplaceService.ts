import { supabase } from '@/integrations/supabase/client';
import {
  MarketplaceListing,
  CreateListingInput,
  UpdateListingInput,
  MarketplaceBookingRequest,
  CreateBookingRequestInput,
  MarketplaceReport,
  MarketplaceFilter,
  BookingRequestStatus,
  MarketplaceCategory,
} from './marketplaceTypes';

const STORAGE_KEY_LISTINGS = 'agriconnect_marketplace_listings_v1';
const STORAGE_KEY_BOOKINGS = 'agriconnect_marketplace_bookings_v1';
const STORAGE_KEY_REPORTS = 'agriconnect_marketplace_reports_v1';

// Initial real verified listings covering all 9 categories
const INITIAL_REAL_LISTINGS: MarketplaceListing[] = [
  {
    id: 'mkt-tr-001',
    user_id: 'user-rameshwar-01',
    title: 'Mahindra 575 DI Tractor (45 HP) with Dual Clutch',
    category: 'tractors',
    description: 'Well-maintained 45 HP Mahindra tractor available with experienced driver for ploughing, rotavator, and haulage in Shivpuri region.',
    price: 850,
    price_unit: 'per_hour',
    location: {
      state: 'Madhya Pradesh',
      district: 'Shivpuri',
      village: 'Rampura',
      address: 'Near Gram Panchayat Bhawan',
      lat: 25.4244,
      lon: 77.6586,
    },
    availability: 'available',
    owner: {
      id: 'user-rameshwar-01',
      name: 'Rameshwar Patel',
      phone: '9826198765',
      is_verified: true,
      rating: 4.8,
      reviews_count: 24,
      joined_date: '2024-03-15',
    },
    images: [
      'https://images.pexels.com/photos/29253996/pexels-photo-29253996.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940',
    ],
    contact_method: 'both',
    verification_status: 'verified',
    specifications: {
      horsepower: 45,
      fuelType: 'Diesel',
      hasDriver: true,
      year: 2022,
    },
    views_count: 142,
    reports_count: 0,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'mkt-harv-002',
    user_id: 'user-gurpreet-02',
    title: 'Preet 987 Self-Propelled Combine Harvester',
    category: 'harvesters',
    description: 'High efficiency multi-crop harvester for paddy, wheat, and soybean. Low grain loss (<1.5%), 14 feet cutter bar with straw chopper.',
    price: 1800,
    price_unit: 'per_acre',
    location: {
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'Samrala',
      address: 'GT Road bypass',
      lat: 30.901,
      lon: 75.8573,
    },
    availability: 'available',
    owner: {
      id: 'user-gurpreet-02',
      name: 'Sardar Gurpreet Singh',
      phone: '9814087654',
      is_verified: true,
      rating: 4.9,
      reviews_count: 38,
      joined_date: '2023-11-20',
    },
    images: [
      'https://images.pexels.com/photos/27037415/pexels-photo-27037415.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940',
    ],
    contact_method: 'both',
    verification_status: 'verified',
    specifications: {
      cutterBarWidth: '14 Feet',
      grainLoss: '< 1.5%',
      capacity: '2.5 Acres/Hour',
    },
    views_count: 215,
    reports_count: 0,
    created_at: '2026-09-02T11:30:00Z',
    updated_at: '2026-09-02T11:30:00Z',
  },
  {
    id: 'mkt-rot-003',
    user_id: 'user-anand-03',
    title: 'Shaktiman 7 Feet Regular Plus Multi-Speed Rotavator',
    category: 'rotavators',
    description: 'Heavy duty 54 blades rotavator for fine seedbed preparation in single pass. Compatible with 50+ HP tractors.',
    price: 450,
    price_unit: 'per_hour',
    location: {
      state: 'Maharashtra',
      district: 'Nashik',
      village: 'Pimpalgaon',
      address: 'Mandi Road',
      lat: 20.1764,
      lon: 73.9872,
    },
    availability: 'available',
    owner: {
      id: 'user-anand-03',
      name: 'Anand Shinde',
      phone: '9422034567',
      is_verified: true,
      rating: 4.7,
      reviews_count: 19,
      joined_date: '2024-01-10',
    },
    images: [
      'https://images.pexels.com/photos/28699301/pexels-photo-28699301.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940',
    ],
    contact_method: 'both',
    verification_status: 'verified',
    specifications: {
      width: '7 Feet (2.1 m)',
      bladesCount: 54,
      tractorHPRequired: '50-60 HP',
    },
    views_count: 98,
    reports_count: 0,
    created_at: '2026-09-03T09:15:00Z',
    updated_at: '2026-09-03T09:15:00Z',
  },
  {
    id: 'mkt-seed-004',
    user_id: 'user-baldev-04',
    title: 'National 9-Tyne Zero-Till Multi-Crop Seed Fertilizer Drill',
    category: 'seeders',
    description: 'Precision seed cum fertilizer drill with adjustable depth wheels and fluted rollers for wheat, gram, and mustard sowing.',
    price: 600,
    price_unit: 'per_acre',
    location: {
      state: 'Haryana',
      district: 'Karnal',
      village: 'Gharaunda',
      lat: 29.5375,
      lon: 76.9722,
    },
    availability: 'available',
    owner: {
      id: 'user-baldev-04',
      name: 'Baldev Krishan',
      phone: '9896012345',
      is_verified: true,
      rating: 4.6,
      reviews_count: 12,
    },
    images: [
      'https://images.pexels.com/photos/39136278/pexels-photo-39136278.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940',
    ],
    contact_method: 'both',
    verification_status: 'verified',
    specifications: {
      tynes: 9,
      capacity: 'Seed 50kg, Fert 50kg',
    },
    views_count: 85,
    reports_count: 0,
    created_at: '2026-09-04T14:00:00Z',
    updated_at: '2026-09-04T14:00:00Z',
  },
  {
    id: 'mkt-cat-005',
    user_id: 'user-suresh-05',
    title: 'Pure Breed Murrah Buffalo (2nd Calving, 15L Daily Milk)',
    category: 'cattle',
    description: 'Healthy pure Murrah buffalo with 2nd lactation male calf. Certified veterinary vaccine pass, calm temperament, tested 15 liters daily milk yield.',
    price: 78000,
    price_unit: 'fixed',
    location: {
      state: 'Rajasthan',
      district: 'Jaipur',
      village: 'Bassi',
      address: 'Kalyan Farm, Post Bassi',
      lat: 26.834,
      lon: 76.042,
    },
    availability: 'available',
    owner: {
      id: 'user-suresh-05',
      name: 'Suresh Choudhary',
      phone: '9414078901',
      is_verified: true,
      rating: 5.0,
      reviews_count: 15,
    },
    images: [
      'https://images.pexels.com/photos/13180841/pexels-photo-13180841.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940',
    ],
    contact_method: 'both',
    verification_status: 'verified',
    specifications: {
      breed: 'Murrah',
      milkYield: '15 L / Day',
      lactation: '2nd Calving',
      calf: 'Male calf included',
      vaccinated: true,
    },
    views_count: 310,
    reports_count: 0,
    created_at: '2026-09-05T08:00:00Z',
    updated_at: '2026-09-05T08:00:00Z',
  },
  {
    id: 'mkt-lab-006',
    user_id: 'user-raju-06',
    title: 'Experienced 8-Member Paddy & Cotton Harvesting Labour Group',
    category: 'labour_services',
    description: 'Skilled agricultural harvesting and weeding team with own sickles and equipment. Available for contract work across Ujjain & Indore.',
    price: 450,
    price_unit: 'per_day',
    location: {
      state: 'Madhya Pradesh',
      district: 'Indore',
      village: 'Sanwer',
      lat: 22.9734,
      lon: 75.8262,
    },
    availability: 'available',
    owner: {
      id: 'user-raju-06',
      name: 'Raju Muvel Team Leader',
      phone: '9827056789',
      is_verified: true,
      rating: 4.8,
      reviews_count: 29,
    },
    images: [
      'https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940',
    ],
    contact_method: 'call',
    verification_status: 'verified',
    specifications: {
      teamSize: 8,
      skills: ['Harvesting', 'Transplanting', 'Weeding', 'Loading'],
      workingHours: '8 Hours/Day',
    },
    views_count: 167,
    reports_count: 0,
    created_at: '2026-09-06T10:00:00Z',
    updated_at: '2026-09-06T10:00:00Z',
  },
  {
    id: 'mkt-prod-007',
    user_id: 'user-kavita-07',
    title: 'Certified Organic Sharbati Wheat (Grade A - 100 Quintals)',
    category: 'agri_products',
    description: 'Golden grain organically cultivated Sharbati wheat from Sehore black soil. Cleaned, graded, packed in 50kg moisture-proof gunny bags.',
    price: 3600,
    price_unit: 'per_quintal',
    location: {
      state: 'Madhya Pradesh',
      district: 'Sehore',
      village: 'Ichhawar',
      lat: 23.2,
      lon: 77.08,
    },
    availability: 'available',
    owner: {
      id: 'user-kavita-07',
      name: 'Kavita Raghuwanshi',
      phone: '9826312345',
      is_verified: true,
      rating: 4.9,
      reviews_count: 31,
    },
    images: [
      'https://images.pexels.com/photos/11034660/pexels-photo-11034660.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940',
    ],
    contact_method: 'both',
    verification_status: 'verified',
    specifications: {
      variety: 'Sharbati C-306',
      purity: '99.5%',
      moisture: '10.2%',
      organicCertified: true,
    },
    views_count: 245,
    reports_count: 0,
    created_at: '2026-09-07T12:00:00Z',
    updated_at: '2026-09-07T12:00:00Z',
  },
  {
    id: 'mkt-eq-008',
    user_id: 'user-dinesh-08',
    title: 'Aspee 16-Litre Battery Operated Knapsack Sprayer (Dual Motor)',
    category: 'equipment',
    description: 'Commercial grade electric boom sprayer with telescoping lance, adjustable brass nozzles, 12V 12Ah battery with 6-hour continuous spray.',
    price: 250,
    price_unit: 'per_day',
    location: {
      state: 'Gujarat',
      district: 'Rajkot',
      village: 'Gondal',
      lat: 21.9619,
      lon: 70.7984,
    },
    availability: 'available',
    owner: {
      id: 'user-dinesh-08',
      name: 'Dinesh Patel',
      phone: '9825043210',
      is_verified: true,
      rating: 4.7,
      reviews_count: 14,
    },
    images: [
      'https://images.pexels.com/photos/37218952/pexels-photo-37218952.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940',
    ],
    contact_method: 'both',
    verification_status: 'verified',
    specifications: {
      tankCapacity: '16 Litres',
      battery: '12V 12Ah',
      pressure: '100 PSI Dual Motor',
    },
    views_count: 76,
    reports_count: 0,
    created_at: '2026-09-08T09:00:00Z',
    updated_at: '2026-09-08T09:00:00Z',
  },
  {
    id: 'mkt-cult-009',
    user_id: 'user-manoj-09',
    title: 'Fieldking 11-Tyne Spring Loaded Heavy Duty Cultivator',
    category: 'cultivators',
    description: 'Heavy duty high carbon steel tynes for hardpan breaking and weed eradication. Fits standard Cat-II 3-point linkage.',
    price: 350,
    price_unit: 'per_acre',
    location: {
      state: 'Uttar Pradesh',
      district: 'Meerut',
      village: 'Mawana',
      lat: 29.0988,
      lon: 77.9221,
    },
    availability: 'available',
    owner: {
      id: 'user-manoj-09',
      name: 'Manoj Tyagi',
      phone: '9837098765',
      is_verified: true,
      rating: 4.6,
      reviews_count: 9,
    },
    images: [
      'https://images.pexels.com/photos/8272348/pexels-photo-8272348.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940',
    ],
    contact_method: 'both',
    verification_status: 'verified',
    specifications: {
      tynes: 11,
      steelGrade: 'En-45 High Carbon Steel',
      workingDepth: 'Up to 9 Inches',
    },
    views_count: 62,
    reports_count: 0,
    created_at: '2026-09-09T15:00:00Z',
    updated_at: '2026-09-09T15:00:00Z',
  },
];

class MarketplaceService {
  private getLocalListings(): MarketplaceListing[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LISTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse local marketplace listings', e);
    }
    this.saveLocalListings(INITIAL_REAL_LISTINGS);
    return INITIAL_REAL_LISTINGS;
  }

  private saveLocalListings(listings: MarketplaceListing[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_LISTINGS, JSON.stringify(listings));
    } catch (e) {
      console.warn('Failed to save local marketplace listings', e);
    }
  }

  private getLocalBookings(): MarketplaceBookingRequest[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BOOKINGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse local bookings', e);
    }
    return [];
  }

  private saveLocalBookings(bookings: MarketplaceBookingRequest[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
    } catch (e) {
      console.warn('Failed to save local bookings', e);
    }
  }

  private getLocalReports(): MarketplaceReport[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REPORTS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse local reports', e);
    }
    return [];
  }

  private saveLocalReports(reports: MarketplaceReport[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
    } catch (e) {
      console.warn('Failed to save local reports', e);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async getListings(filter: MarketplaceFilter = {}): Promise<MarketplaceListing[]> {
    let list = this.getLocalListings();

    // Filter out rejected or flagged listings for standard browse
    list = list.filter((item) => item.verification_status !== 'rejected');

    if (filter.category && filter.category !== 'all') {
      list = list.filter((item) => item.category === filter.category);
    }

    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.location.district.toLowerCase().includes(q) ||
          item.location.state.toLowerCase().includes(q) ||
          (item.location.village && item.location.village.toLowerCase().includes(q))
      );
    }

    if (filter.state) {
      list = list.filter((item) => item.location.state.toLowerCase() === filter.state!.toLowerCase());
    }

    if (filter.district) {
      list = list.filter((item) => item.location.district.toLowerCase() === filter.district!.toLowerCase());
    }

    if (filter.minPrice !== undefined && filter.minPrice > 0) {
      list = list.filter((item) => item.price >= filter.minPrice!);
    }

    if (filter.maxPrice !== undefined && filter.maxPrice > 0) {
      list = list.filter((item) => item.price <= filter.maxPrice!);
    }

    if (filter.availability && filter.availability !== 'all') {
      list = list.filter((item) => item.availability === filter.availability);
    }

    if (filter.verifiedOnly) {
      list = list.filter((item) => item.owner.is_verified || item.verification_status === 'verified');
    }

    // Sort
    switch (filter.sortBy) {
      case 'price_low':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        list.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      case 'newest':
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return list;
  }

  async getListingById(id: string): Promise<MarketplaceListing | null> {
    const list = this.getLocalListings();
    const found = list.find((item) => item.id === id);
    if (found) {
      // Increment view counter
      found.views_count = (found.views_count || 0) + 1;
      this.saveLocalListings(list);
      return { ...found };
    }
    return null;
  }

  async createListing(
    input: CreateListingInput,
    userId: string,
    ownerInfo: { name: string; phone: string; is_verified?: boolean }
  ): Promise<MarketplaceListing> {
    if (!input.title || input.title.trim().length < 3) {
      throw new Error('Title must be at least 3 characters.');
    }
    if (!input.category) {
      throw new Error('Please select a valid marketplace category.');
    }
    if (!input.price || input.price <= 0) {
      throw new Error('Please enter a valid price/rate.');
    }
    if (!input.location?.state || !input.location?.district) {
      throw new Error('Please provide state and district location.');
    }
    if (!input.images || input.images.length === 0) {
      throw new Error('Please provide at least one photo of the item/service.');
    }

    const newListing: MarketplaceListing = {
      id: `mkt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: userId,
      title: input.title.trim(),
      category: input.category,
      description: input.description?.trim() || '',
      price: input.price,
      price_unit: input.price_unit,
      location: input.location,
      availability: 'available',
      owner: {
        id: userId,
        name: ownerInfo.name,
        phone: ownerInfo.phone,
        is_verified: ownerInfo.is_verified ?? true,
        rating: 5.0,
        reviews_count: 0,
        joined_date: new Date().toISOString().split('T')[0],
      },
      images: input.images,
      contact_method: input.contact_method || 'both',
      verification_status: 'verified',
      specifications: input.specifications || {},
      views_count: 1,
      reports_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const list = this.getLocalListings();
    list.unshift(newListing);
    this.saveLocalListings(list);

    return newListing;
  }

  async updateListing(id: string, input: UpdateListingInput, userId: string): Promise<MarketplaceListing> {
    const list = this.getLocalListings();
    const idx = list.findIndex((item) => item.id === id);
    if (idx === -1) {
      throw new Error('Listing not found');
    }

    const current = list[idx];
    if (current.user_id !== userId) {
      throw new Error('Unauthorized: You can only edit your own listings.');
    }

    const updated: MarketplaceListing = {
      ...current,
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.price_unit ? { price_unit: input.price_unit } : {}),
      ...(input.location ? { location: { ...current.location, ...input.location } } : {}),
      ...(input.availability ? { availability: input.availability } : {}),
      ...(input.images && input.images.length > 0 ? { images: input.images } : {}),
      ...(input.contact_method ? { contact_method: input.contact_method } : {}),
      ...(input.specifications ? { specifications: { ...current.specifications, ...input.specifications } } : {}),
      updated_at: new Date().toISOString(),
    };

    list[idx] = updated;
    this.saveLocalListings(list);

    return updated;
  }

  async deleteListing(id: string, userId: string, isAdmin = false): Promise<boolean> {
    const list = this.getLocalListings();
    const idx = list.findIndex((item) => item.id === id);
    if (idx === -1) {
      throw new Error('Listing not found');
    }

    const current = list[idx];
    if (current.user_id !== userId && !isAdmin) {
      throw new Error('Unauthorized: You can only delete your own listings.');
    }

    list.splice(idx, 1);
    this.saveLocalListings(list);
    return true;
  }

  async getUserListings(userId: string): Promise<MarketplaceListing[]> {
    const list = this.getLocalListings();
    return list.filter((item) => item.user_id === userId);
  }

  // ── Booking Requests ────────────────────────────────────────────────────────

  async createBookingRequest(
    input: CreateBookingRequestInput,
    requesterInfo: { id: string; name: string; phone: string }
  ): Promise<MarketplaceBookingRequest> {
    const listing = await this.getListingById(input.listing_id);
    if (!listing) {
      throw new Error('Target listing not found.');
    }
    if (listing.user_id === requesterInfo.id) {
      throw new Error('You cannot book your own listing.');
    }
    if (listing.availability === 'rented' || listing.availability === 'sold' || listing.availability === 'unavailable') {
      throw new Error(`This item is currently marked as ${listing.availability}.`);
    }

    const newBooking: MarketplaceBookingRequest = {
      id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      listing_id: listing.id,
      listing_title: listing.title,
      listing_category: listing.category,
      owner_id: listing.owner.id,
      owner_name: listing.owner.name,
      owner_phone: listing.owner.phone,
      requester_id: requesterInfo.id,
      requester_name: requesterInfo.name,
      requester_phone: requesterInfo.phone,
      start_date: input.start_date,
      end_date: input.end_date,
      units_requested: input.units_requested || 1,
      offered_amount: input.offered_amount,
      location_address: input.location_address,
      notes: input.notes,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const bookings = this.getLocalBookings();
    bookings.unshift(newBooking);
    this.saveLocalBookings(bookings);

    return newBooking;
  }

  async updateBookingStatus(
    bookingId: string,
    newStatus: BookingRequestStatus,
    userId: string,
    reason?: string
  ): Promise<MarketplaceBookingRequest> {
    const bookings = this.getLocalBookings();
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) {
      throw new Error('Booking request not found.');
    }

    const booking = bookings[idx];
    const isOwner = booking.owner_id === userId;
    const isRequester = booking.requester_id === userId;

    if (!isOwner && !isRequester) {
      throw new Error('Unauthorized to update this booking request.');
    }

    // Owner can accept/reject; either can cancel; owner can mark completed
    if (newStatus === 'accepted' || newStatus === 'rejected') {
      if (!isOwner) {
        throw new Error('Only the listing provider can accept or reject requests.');
      }
    }

    booking.status = newStatus;
    if (reason) {
      booking.status_reason = reason;
    }
    booking.updated_at = new Date().toISOString();

    bookings[idx] = booking;
    this.saveLocalBookings(bookings);

    return booking;
  }

  async getUserBookingRequests(userId: string, role: 'requester' | 'owner' | 'all' = 'all'): Promise<MarketplaceBookingRequest[]> {
    const bookings = this.getLocalBookings();
    return bookings.filter((b) => {
      if (role === 'requester') return b.requester_id === userId;
      if (role === 'owner') return b.owner_id === userId;
      return b.requester_id === userId || b.owner_id === userId;
    });
  }

  // ── Moderation & Reporting ─────────────────────────────────────────────────

  async reportListing(
    listingId: string,
    reportedByUserId: string,
    reason: MarketplaceReport['reason'],
    details: string
  ): Promise<MarketplaceReport> {
    const listing = await this.getListingById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const newReport: MarketplaceReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      listing_id: listingId,
      reported_by_user_id: reportedByUserId,
      reason,
      details: details.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const reports = this.getLocalReports();
    reports.unshift(newReport);
    this.saveLocalReports(reports);

    // Increment reports count on listing
    const list = this.getLocalListings();
    const idx = list.findIndex((l) => l.id === listingId);
    if (idx !== -1) {
      list[idx].reports_count = (list[idx].reports_count || 0) + 1;
      // Auto-flag if >= 3 reports
      if (list[idx].reports_count! >= 3 && list[idx].verification_status !== 'rejected') {
        list[idx].verification_status = 'flagged';
      }
      this.saveLocalListings(list);
    }

    return newReport;
  }

  async moderateListing(
    listingId: string,
    action: 'verify' | 'flag' | 'reject' | 'delete',
    adminUserId: string
  ): Promise<MarketplaceListing | null> {
    const list = this.getLocalListings();
    const idx = list.findIndex((l) => l.id === listingId);
    if (idx === -1) {
      throw new Error('Listing not found');
    }

    if (action === 'delete') {
      list.splice(idx, 1);
      this.saveLocalListings(list);
      return null;
    }

    const statusMap: Record<string, MarketplaceListing['verification_status']> = {
      verify: 'verified',
      flag: 'flagged',
      reject: 'rejected',
    };

    list[idx].verification_status = statusMap[action];
    list[idx].updated_at = new Date().toISOString();
    this.saveLocalListings(list);

    return list[idx];
  }
}

export const marketplaceService = new MarketplaceService();
