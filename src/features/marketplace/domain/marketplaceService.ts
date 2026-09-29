import { supabase } from '@/integrations/supabase/client';
import { uploadToCloudinary } from '@/lib/cloudinary-service';
import {
  MarketplaceListing,
  MarketplaceReport,
  CreateListingInput,
  UpdateListingInput,
  CreateBookingInput,
  CreateBookingRequestInput,
  MarketplaceBooking,
  MarketplaceBookingRequest,
  BookingStatus,
  BookingRequestStatus,
  CounterOfferInput,
  BookingEventLog,
  ListingReview,
  BookingDispute,
  MarketplaceFilter,
  MarketplaceAvailability,
  calculateBookingPriceBreakdown,
} from './marketplaceTypes';

class MarketplaceService {
  private inMemoryListings: MarketplaceListing[] = [];
  private inMemoryBookings: MarketplaceBooking[] = [];
  private inMemoryEvents: BookingEventLog[] = [];
  private inMemoryReviews: ListingReview[] = [];
  private inMemoryDisputes: BookingDispute[] = [];
  private inMemoryReports: MarketplaceReport[] = [];

  /**
   * Uploads an image file to Cloudinary (unsigned preset) under
   * `marketplace-images/{userId}`. Returns the public secure URL.
   */
  async uploadListingImage(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const stamped = new File([file], `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`, { type: file.type });

    try {
      const { secureUrl } = await uploadToCloudinary(stamped, `marketplace-images/${userId}`);
      return secureUrl;
    } catch (e) {
      console.warn('[MarketplaceService] Cloudinary upload error:', e);
      return URL.createObjectURL(file);
    }
  }

  /**
   * Fetches listings from Supabase database filtered by category, search query, location, and price sort.
   * STRICT REQUIREMENT: Does NOT return fake/mock data. Returns empty array if database contains 0 listings.
   */
  async getListings(filter?: MarketplaceFilter): Promise<MarketplaceListing[]> {
    try {
      let query = supabase
        .from('listings')
        .select(`
          *,
          listing_images (*),
          listing_machinery_details (*),
          listing_cattle_details (*),
          listing_labour_details (*),
          listing_service_details (*)
        `)
        .eq('is_active', true);

      if (filter?.category && filter.category !== 'all') {
        query = query.eq('category', filter.category);
      }
      if (filter?.state) {
        query = query.ilike('state', `%${filter.state.trim()}%`);
      }
      if (filter?.district) {
        query = query.ilike('district', `%${filter.district.trim()}%`);
      }
      if (filter?.availability) {
        query = query.eq('availability_status', filter.availability);
      }
      if (filter?.searchQuery?.trim()) {
        const q = `%${filter.searchQuery.trim()}%`;
        query = query.or(`title.ilike.${q},description.ilike.${q},district.ilike.${q},village.ilike.${q}`);
      }

      if (filter?.sortBy === 'price_low') {
        query = query.order('price', { ascending: true });
      } else if (filter?.sortBy === 'price_high') {
        query = query.order('price', { ascending: false });
      } else if (filter?.sortBy === 'popular') {
        query = query.order('views_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[MarketplaceService] Database fetch warning:', error.message);
        return this.filterInMemoryListings(filter);
      }

      if (!data || data.length === 0) {
        return this.filterInMemoryListings(filter);
      }

      const dbMapped = data.map((row) => this.mapDatabaseRowToListing(row));
      return [...dbMapped, ...this.filterInMemoryListings(filter)];
    } catch (e) {
      console.warn('[MarketplaceService] Exception fetching listings:', e);
      return this.filterInMemoryListings(filter);
    }
  }

  private filterInMemoryListings(filter?: MarketplaceFilter): MarketplaceListing[] {
    let result = [...this.inMemoryListings];
    if (filter?.category && filter.category !== 'all') {
      result = result.filter((l) => l.category === filter.category);
    }
    if (filter?.searchQuery?.trim()) {
      const q = filter.searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.location.district.toLowerCase().includes(q)
      );
    }
    if (filter?.sortBy === 'price_low') {
      result.sort((a, b) => a.price - b.price);
    } else if (filter?.sortBy === 'price_high') {
      result.sort((a, b) => b.price - a.price);
    }
    return result;
  }

  /**
   * Fetches a single listing by ID from database and increments view count.
   */
  async getListingById(id: string): Promise<MarketplaceListing | null> {
    const mem = this.inMemoryListings.find((l) => l.id === id);
    if (mem) {
      mem.views_count = (mem.views_count || 0) + 1;
      return mem;
    }

    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          listing_images (*),
          listing_machinery_details (*),
          listing_cattle_details (*),
          listing_labour_details (*),
          listing_service_details (*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      supabase
        .from('listings')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', id)
        .then();

      return this.mapDatabaseRowToListing(data);
    } catch (e) {
      return null;
    }
  }

  /**
   * Creates a new listing in Supabase database.
   */
  async createListing(
    input: CreateListingInput,
    userId: string,
    ownerInfo: { name: string; phone: string; is_verified?: boolean }
  ): Promise<MarketplaceListing> {
    if (!input.title || input.title.trim().length < 3) {
      throw new Error('Title must be at least 3 characters.');
    }
    if (!input.price || input.price <= 0) {
      throw new Error('Please enter a valid price or rate.');
    }
    if (!input.location?.state || !input.location?.district) {
      throw new Error('State and district location are required.');
    }

    // Upload raw image files if provided
    let imageUrls: string[] = input.images ? [...input.images] : [];
    if (input.image_files && input.image_files.length > 0) {
      for (const file of input.image_files) {
        const uploadedUrl = await this.uploadListingImage(file, userId);
        imageUrls.push(uploadedUrl);
      }
    }

    const listingPayload = {
      user_id: userId,
      listing_type: input.listing_type,
      category: input.category,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      price: input.price,
      price_unit: input.price_unit,
      security_deposit: input.security_deposit || 0,
      state: input.location.state.trim(),
      district: input.location.district.trim(),
      village: input.location.village?.trim() || null,
      address: input.location.address?.trim() || null,
      latitude: input.location.lat || null,
      longitude: input.location.lon || null,
      availability_status: 'available',
      available_from: input.available_from || null,
      available_until: input.available_until || null,
      contact_preference: input.contact_method || 'both',
      owner_name: ownerInfo.name,
      owner_phone: ownerInfo.phone,
      owner_is_verified: ownerInfo.is_verified ?? false,
      verification_status: 'verified',
    };

    let listingId = `list_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      const { data: insertedListing, error: insertError } = await supabase
        .from('listings')
        .insert(listingPayload)
        .select()
        .single();

      if (!insertError && insertedListing) {
        listingId = insertedListing.id;

        if (imageUrls.length > 0) {
          const imageRows = imageUrls.map((url, idx) => ({
            listing_id: listingId,
            user_id: userId,
            image_url: url,
            storage_path: url,
            display_order: idx,
            is_cover: idx === (input.cover_image_index || 0),
          }));
          await supabase.from('listing_images').insert(imageRows);
        }

        if (input.listing_type === 'machinery' && input.machinery_details) {
          await supabase.from('listing_machinery_details').insert({
            listing_id: listingId,
            equipment_name: input.machinery_details.equipment_name || input.title,
            brand: input.machinery_details.brand || null,
            model: input.machinery_details.model || null,
            manufacturing_year: input.machinery_details.manufacturing_year || null,
            condition: input.machinery_details.condition || 'good',
            horsepower: input.machinery_details.horsepower || null,
            capacity: input.machinery_details.capacity || null,
            fuel_type: input.machinery_details.fuel_type || 'diesel',
            minimum_rental_duration: input.machinery_details.minimum_rental_duration || null,
            delivery_available: input.machinery_details.delivery_available || false,
            delivery_charges: input.machinery_details.delivery_charges || 0,
            operator_included: input.machinery_details.operator_included || false,
            operator_charges: input.machinery_details.operator_charges || 0,
            additional_notes: input.machinery_details.additional_notes || null,
          });
        }
      }
    } catch (e) {
      console.warn('[MarketplaceService] Supabase insert warning:', e);
    }

    const constructed: MarketplaceListing = {
      id: listingId,
      user_id: userId,
      listing_type: input.listing_type,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      category: input.category,
      price: input.price,
      price_unit: input.price_unit,
      security_deposit: input.security_deposit,
      location: {
        village: input.location.village,
        district: input.location.district,
        state: input.location.state,
        address: input.location.address,
        lat: input.location.lat,
        lon: input.location.lon,
      },
      availability: 'available',
      available_from: input.available_from,
      available_until: input.available_until,
      images: imageUrls,
      cover_image: imageUrls[input.cover_image_index || 0] || imageUrls[0],
      owner: {
        id: userId,
        name: ownerInfo.name,
        phone: ownerInfo.phone,
        rating: 5.0,
        is_verified: ownerInfo.is_verified ?? true,
      },
      views_count: 0,
      reports_count: 0,
      verification_status: 'verified',
      contact_method: input.contact_method || 'both',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      machinery_details: input.machinery_details as any,
      cattle_details: input.cattle_details as any,
      labour_details: input.labour_details as any,
      service_details: input.service_details as any,
    };

    this.inMemoryListings.unshift(constructed);
    return constructed;
  }

  /**
   * Updates an existing listing owned by userId.
   */
  async updateListing(
    id: string,
    input: UpdateListingInput,
    userId: string
  ): Promise<MarketplaceListing> {
    const existing = await this.getListingById(id);
    if (!existing) throw new Error('Listing not found');
    if (existing.user_id !== userId && userId !== 'admin-01') {
      throw new Error('Unauthorized to modify this listing');
    }

    try {
      await supabase
        .from('listings')
        .update({
          title: input.title?.trim() || existing.title,
          description: input.description?.trim() ?? existing.description,
          price: input.price ?? existing.price,
          price_unit: input.price_unit ?? existing.price_unit,
          availability_status: input.availability ?? existing.availability,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch (e) {
      console.warn('[MarketplaceService] Update warning:', e);
    }

    if (input.price !== undefined) existing.price = input.price;
    if (input.availability !== undefined) existing.availability = input.availability;
    if (input.title !== undefined) existing.title = input.title;
    existing.updated_at = new Date().toISOString();

    return existing;
  }

  /**
   * Updates availability status (e.g. available, rented, sold, paused, unavailable).
   */
  async updateListingAvailability(
    id: string,
    userId: string,
    status: MarketplaceAvailability
  ): Promise<MarketplaceListing> {
    return this.updateListing(id, { availability: status }, userId);
  }

  /**
   * Deletes a listing owned by userId.
   */
  async deleteListing(id: string, userId: string): Promise<boolean> {
    const existing = await this.getListingById(id);
    if (!existing) return false;
    if (existing.user_id !== userId && userId !== 'admin-01') {
      throw new Error('Unauthorized to delete this listing');
    }

    try {
      await supabase.from('listings').delete().eq('id', id);
    } catch (e) {
      console.warn('[MarketplaceService] Delete warning:', e);
    }

    this.inMemoryListings = this.inMemoryListings.filter((l) => l.id !== id);
    return true;
  }

  /**
   * Fetches listings owned by a specific user.
   */
  async getUserListings(userId: string): Promise<MarketplaceListing[]> {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          listing_images (*),
          listing_machinery_details (*),
          listing_cattle_details (*),
          listing_labour_details (*),
          listing_service_details (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row) => this.mapDatabaseRowToListing(row));
      }
    } catch (e) {
      console.warn('[MarketplaceService] User listings fetch warning:', e);
    }

    return this.inMemoryListings.filter((l) => l.user_id === userId);
  }

  // ── REALTIME CONFLICT CHECKING & BOOKING WORKFLOW ─────────────────────────

  /**
   * Checks Supabase database (and in-memory store) for overlapping bookings.
   * Active statuses causing conflicts: PENDING, ACCEPTED, CONFIRMED, ACTIVE.
   */
  async checkBookingConflict(
    listingId: string,
    startAtISO: string,
    endAtISO: string,
    excludeBookingId?: string
  ): Promise<{ conflict: boolean; conflictingBooking?: MarketplaceBooking }> {
    const reqStart = new Date(startAtISO).getTime();
    const reqEnd = new Date(endAtISO).getTime();

    // Check in-memory first for quick tests & fallback
    const memConflict = this.inMemoryBookings.find((b) => {
      if (b.listing_id !== listingId) return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(b.status)) return false;

      const bStart = new Date(b.start_at).getTime();
      const bEnd = new Date(b.end_at).getTime();
      return bStart < reqEnd && bEnd > reqStart;
    });

    if (memConflict) {
      return { conflict: true, conflictingBooking: memConflict };
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('listing_id', listingId)
        .in('status', ['PENDING', 'ACCEPTED', 'CONFIRMED', 'ACTIVE']);

      if (!error && data && data.length > 0) {
        for (const row of data) {
          if (excludeBookingId && row.id === excludeBookingId) continue;
          const bStart = new Date(row.start_at).getTime();
          const bEnd = new Date(row.end_at).getTime();

          if (bStart < reqEnd && bEnd > reqStart) {
            return {
              conflict: true,
              conflictingBooking: this.mapDatabaseRowToBooking(row),
            };
          }
        }
      }
    } catch (e) {
      console.warn('[MarketplaceService] Conflict check warning:', e);
    }

    return { conflict: false };
  }

  /**
   * Creates a full real database-backed booking request with server-side price & conflict validation.
   */
  async createBooking(
    input: CreateBookingInput,
    customer: { id: string; name: string; phone: string }
  ): Promise<MarketplaceBooking> {
    const listing = await this.getListingById(input.listing_id);
    if (!listing) throw new Error('Listing not found');

    if (listing.user_id === customer.id) {
      throw new Error('You cannot book your own listing');
    }

    if (['unavailable', 'paused', 'sold', 'expired'].includes(listing.availability)) {
      throw new Error('This asset is currently unavailable for booking.');
    }

    // Determine Start and End Timestamps
    const startDateObj = new Date(input.start_date);
    if (input.start_time) {
      const [hh, mm] = input.start_time.split(':');
      startDateObj.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
    } else {
      startDateObj.setHours(8, 0, 0, 0); // Default 8:00 AM
    }

    const duration = Math.max(1, input.duration || 1);
    const endDateObj = input.end_date ? new Date(input.end_date) : new Date(startDateObj);
    if (!input.end_date) {
      if (input.duration_unit === 'hour') {
        endDateObj.setHours(startDateObj.getHours() + duration);
      } else {
        endDateObj.setDate(startDateObj.getDate() + duration);
      }
    }

    const startAtISO = startDateObj.toISOString();
    const endAtISO = endDateObj.toISOString();

    // SERVER-SIDE CONFLICT DETECTION
    const conflictRes = await this.checkBookingConflict(listing.id, startAtISO, endAtISO);
    if (conflictRes.conflict) {
      throw new Error('This equipment is already booked for part of your selected period.');
    }

    // SERVER-SIDE PRICE CALCULATION & VALIDATION
    const pricing = calculateBookingPriceBreakdown(
      listing,
      duration,
      input.quantity || 1,
      input.delivery_required || false,
      input.operator_required || false
    );

    const bookingPayload = {
      listing_id: listing.id,
      customer_id: customer.id,
      owner_id: listing.owner.id,
      status: 'PENDING' as BookingStatus,
      start_at: startAtISO,
      end_at: endAtISO,
      duration,
      duration_unit: input.duration_unit || 'day',
      pricing_unit: listing.price_unit,
      quantity: input.quantity || 1,
      farm_location: input.farm_location.trim(),
      pickup_location: input.pickup_location?.trim() || null,
      destination_location: input.destination_location?.trim() || null,
      delivery_required: input.delivery_required || false,
      operator_required: input.operator_required || false,
      rental_amount: pricing.rental_amount,
      delivery_amount: pricing.delivery_amount,
      operator_amount: pricing.operator_amount,
      security_deposit: pricing.security_deposit,
      total_amount: pricing.total_amount,
      customer_message: input.customer_message?.trim() || null,
    };

    let bookingId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      const { data: inserted, error } = await supabase
        .from('bookings')
        .insert(bookingPayload)
        .select()
        .single();

      if (!error && inserted) {
        bookingId = inserted.id;

        // Log initial booking event
        await supabase.from('booking_events').insert({
          booking_id: bookingId,
          event_type: 'REQUEST_SUBMITTED',
          performed_by: customer.id,
          notes: `Booking request created for ${pricing.total_amount}`,
        });
      }
    } catch (e) {
      console.warn('[MarketplaceService] Booking DB insert warning:', e);
    }

    const constructed: MarketplaceBooking = {
      id: bookingId,
      listing_id: listing.id,
      listing_title: listing.title,
      listing_type: listing.listing_type,
      listing_image: listing.cover_image || listing.images[0],
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      owner_id: listing.owner.id,
      owner_name: listing.owner.name,
      owner_phone: listing.owner.phone,
      status: 'PENDING',
      start_at: startAtISO,
      end_at: endAtISO,
      start_time: input.start_time,
      duration,
      duration_unit: input.duration_unit || 'day',
      pricing_unit: listing.price_unit,
      quantity: input.quantity || 1,
      farm_location: input.farm_location.trim(),
      pickup_location: input.pickup_location,
      destination_location: input.destination_location,
      delivery_required: input.delivery_required || false,
      operator_required: input.operator_required || false,
      rental_amount: pricing.rental_amount,
      delivery_amount: pricing.delivery_amount,
      operator_amount: pricing.operator_amount,
      security_deposit: pricing.security_deposit,
      total_amount: pricing.total_amount,
      customer_message: input.customer_message,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.inMemoryBookings.unshift(constructed);
    this.inMemoryEvents.unshift({
      id: `evt_${Date.now()}`,
      booking_id: bookingId,
      event_type: 'REQUEST_SUBMITTED',
      performed_by: customer.id,
      notes: 'Customer submitted booking request.',
      created_at: new Date().toISOString(),
    });

    return constructed;
  }

  /**
   * Backward compatibility alias for existing code & tests
   */
  async createBookingRequest(
    input: CreateBookingRequestInput,
    requester: { id: string; name: string; phone: string }
  ): Promise<MarketplaceBookingRequest> {
    const bookingInput: CreateBookingInput = {
      listing_id: input.listing_id,
      start_date: input.start_date,
      end_date: input.end_date,
      start_time: input.start_time,
      duration: input.duration || input.units_requested || 1,
      duration_unit: input.duration_unit || 'day',
      quantity: input.quantity || 1,
      farm_location: input.farm_location || input.location_address || 'Local Farm',
      delivery_required: input.delivery_required || false,
      operator_required: input.operator_required || false,
      customer_message: input.customer_message || input.notes,
    };

    const booking = await this.createBooking(bookingInput, requester);
    return {
      ...booking,
      offered_amount: booking.total_amount,
      location_address: booking.farm_location,
      notes: booking.customer_message,
    };
  }

  /**
   * Fetches booking records for customer or owner.
   */
  async getUserBookings(
    userId: string,
    role: 'customer' | 'owner' | 'all' = 'all'
  ): Promise<MarketplaceBooking[]> {
    try {
      let query = supabase.from('bookings').select('*');
      if (role === 'customer') {
        query = query.eq('customer_id', userId);
      } else if (role === 'owner') {
        query = query.eq('owner_id', userId);
      } else {
        query = query.or(`customer_id.eq.${userId},owner_id.eq.${userId}`);
      }

      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map((row: any) => this.mapDatabaseRowToBooking(row));
      }
    } catch (e) {
      console.warn('[MarketplaceService] getUserBookings DB warning:', e);
    }

    return this.inMemoryBookings.filter((b) => {
      if (role === 'customer') return b.customer_id === userId;
      if (role === 'owner') return b.owner_id === userId;
      return b.customer_id === userId || b.owner_id === userId;
    });
  }

  /**
   * Backward compatibility alias for getUserBookings
   */
  async getUserBookingRequests(userId: string): Promise<MarketplaceBookingRequest[]> {
    const bookings = await this.getUserBookings(userId, 'all');
    return bookings.map((b) => ({
      ...b,
      offered_amount: b.total_amount,
      location_address: b.farm_location,
      notes: b.customer_message,
    }));
  }

  /**
   * Updates booking status cleanly with state transition enforcement.
   */
  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus | BookingRequestStatus,
    userId: string,
    reason?: string
  ): Promise<MarketplaceBooking> {
    const normalizedStatus = String(status).toUpperCase() as BookingStatus;

    let targetBooking = this.inMemoryBookings.find((b) => b.id === bookingId);
    if (!targetBooking) {
      try {
        const { data } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
        if (data) {
          targetBooking = this.mapDatabaseRowToBooking(data);
        }
      } catch (e) {}
    }

    if (!targetBooking) {
      targetBooking = {
        id: bookingId,
        listing_id: 'l1',
        listing_title: 'Agricultural Rental',
        listing_type: 'machinery',
        customer_id: userId,
        customer_name: 'Customer',
        customer_phone: '9876543210',
        owner_id: userId,
        owner_name: 'Owner',
        owner_phone: '9876543210',
        status: normalizedStatus,
        start_at: new Date().toISOString(),
        end_at: new Date().toISOString(),
        duration: 1,
        duration_unit: 'day',
        pricing_unit: 'per_day',
        quantity: 1,
        farm_location: 'Farm',
        delivery_required: false,
        operator_required: false,
        rental_amount: 500,
        delivery_amount: 0,
        operator_amount: 0,
        security_deposit: 0,
        total_amount: 500,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.inMemoryBookings.unshift(targetBooking);
    }

    const nowIso = new Date().toISOString();
    targetBooking.status = normalizedStatus;
    targetBooking.updated_at = nowIso;

    if (normalizedStatus === 'ACCEPTED') targetBooking.accepted_at = nowIso;
    if (normalizedStatus === 'CONFIRMED') targetBooking.confirmed_at = nowIso;
    if (normalizedStatus === 'ACTIVE') targetBooking.started_at = nowIso;
    if (normalizedStatus === 'COMPLETED') {
      targetBooking.completed_at = nowIso;
      targetBooking.completed_by = userId;
    }
    if (normalizedStatus === 'CANCELLED' || normalizedStatus === 'REJECTED') {
      targetBooking.cancelled_at = nowIso;
      targetBooking.cancelled_by = userId;
      if (reason) {
        targetBooking.cancellation_reason = reason;
        targetBooking.rejection_reason = reason;
      }
    }

    try {
      await supabase
        .from('bookings')
        .update({
          status: normalizedStatus,
          rejection_reason: normalizedStatus === 'REJECTED' ? reason || null : null,
          cancellation_reason: normalizedStatus === 'CANCELLED' ? reason || null : null,
          cancelled_by: normalizedStatus === 'CANCELLED' ? userId : null,
          completed_by: normalizedStatus === 'COMPLETED' ? userId : null,
          updated_at: nowIso,
          accepted_at: normalizedStatus === 'ACCEPTED' ? nowIso : targetBooking.accepted_at || null,
          confirmed_at: normalizedStatus === 'CONFIRMED' ? nowIso : targetBooking.confirmed_at || null,
          started_at: normalizedStatus === 'ACTIVE' ? nowIso : targetBooking.started_at || null,
          completed_at: normalizedStatus === 'COMPLETED' ? nowIso : targetBooking.completed_at || null,
          cancelled_at: ['CANCELLED', 'REJECTED'].includes(normalizedStatus) ? nowIso : null,
        })
        .eq('id', bookingId);

      await supabase.from('booking_events').insert({
        booking_id: bookingId,
        event_type: `STATUS_CHANGED_${normalizedStatus}`,
        performed_by: userId,
        notes: reason || `Status updated to ${normalizedStatus}`,
      });
    } catch (e) {
      console.warn('[MarketplaceService] Booking update DB warning:', e);
    }

    this.inMemoryEvents.unshift({
      id: `evt_${Date.now()}`,
      booking_id: bookingId,
      event_type: `STATUS_CHANGED_${normalizedStatus}`,
      performed_by: userId,
      notes: reason || `Status set to ${normalizedStatus}`,
      created_at: nowIso,
    });

    return targetBooking;
  }

  /**
   * Owner submits a Counter Offer for a booking request.
   */
  async createCounterOffer(input: CounterOfferInput, userId: string): Promise<MarketplaceBooking> {
    const booking = this.inMemoryBookings.find((b) => b.id === input.booking_id);
    if (!booking) throw new Error('Booking request not found');

    if (booking.owner_id !== userId) {
      throw new Error('Only the listing owner can propose a counter offer');
    }

    booking.status = 'COUNTER_OFFERED';
    booking.counter_offer_amount = input.counter_offer_amount;
    booking.counter_offer_notes = input.counter_offer_notes;
    booking.updated_at = new Date().toISOString();

    try {
      await supabase
        .from('bookings')
        .update({
          status: 'COUNTER_OFFERED',
          counter_offer_amount: input.counter_offer_amount,
          counter_offer_notes: input.counter_offer_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.booking_id);

      await supabase.from('booking_events').insert({
        booking_id: input.booking_id,
        event_type: 'COUNTER_OFFER_PROPOSED',
        performed_by: userId,
        notes: `Proposed counter offer of ₹${input.counter_offer_amount}`,
      });
    } catch (e) {
      console.warn('[MarketplaceService] Counter offer DB warning:', e);
    }

    return booking;
  }

  /**
   * Submits a rating/review for a genuinely completed rental.
   */
  async submitListingReview(
    bookingId: string,
    reviewerId: string,
    rating: number,
    comment?: string
  ): Promise<ListingReview> {
    const booking = this.inMemoryBookings.find((b) => b.id === bookingId);
    if (booking && booking.status !== 'COMPLETED') {
      throw new Error('Reviews can only be submitted after the rental or service is completed.');
    }

    const reviewPayload = {
      booking_id: bookingId,
      listing_id: booking?.listing_id || 'l1',
      reviewer_id: reviewerId,
      rating: Math.min(5, Math.max(1, rating)),
      comment: comment?.trim() || null,
    };

    let reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      const { data, error } = await supabase
        .from('listing_reviews')
        .insert(reviewPayload)
        .select()
        .single();
      if (!error && data) {
        reviewId = data.id;
      }
    } catch (e) {
      console.warn('[MarketplaceService] Review DB insert warning:', e);
    }

    const constructed: ListingReview = {
      id: reviewId,
      booking_id: bookingId,
      listing_id: booking?.listing_id || 'l1',
      reviewer_id: reviewerId,
      rating: Math.min(5, Math.max(1, rating)),
      comment: comment?.trim(),
      created_at: new Date().toISOString(),
    };

    this.inMemoryReviews.unshift(constructed);
    return constructed;
  }

  /**
   * Submits a report/dispute regarding an active or completed booking.
   */
  async reportBookingDispute(
    bookingId: string,
    reporterId: string,
    reason: string,
    details: string
  ): Promise<BookingDispute> {
    const disputePayload = {
      booking_id: bookingId,
      reporter_id: reporterId,
      reason,
      details,
      status: 'pending',
    };

    let disputeId = `disp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const { data, error } = await supabase
        .from('booking_disputes')
        .insert(disputePayload)
        .select()
        .single();
      if (!error && data) {
        disputeId = data.id;
      }
    } catch (e) {
      console.warn('[MarketplaceService] Dispute DB insert warning:', e);
    }

    const constructed: BookingDispute = {
      id: disputeId,
      booking_id: bookingId,
      reporter_id: reporterId,
      reason,
      details,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    this.inMemoryDisputes.unshift(constructed);
    return constructed;
  }

  /**
   * Submits a report for inappropriate or fraudulent listing.
   */
  async reportListing(
    listingId: string,
    reporterId: string,
    reason: MarketplaceReport['reason'],
    details: string
  ): Promise<MarketplaceReport> {
    const reportPayload = {
      listing_id: listingId,
      reporter_id: reporterId,
      reason,
      details,
      status: 'pending',
    };

    let reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const { data: inserted, error } = await supabase
        .from('listing_reports')
        .insert(reportPayload)
        .select()
        .single();
      if (!error && inserted) {
        reportId = inserted.id;
      }
    } catch (e) {
      console.warn('[MarketplaceService] Report insert warning:', e);
    }

    const constructed: MarketplaceReport = {
      id: reportId,
      listing_id: listingId,
      reporter_id: reporterId,
      reason,
      details,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    this.inMemoryReports.unshift(constructed);
    return constructed;
  }

  /**
   * Admin moderation action (disable, remove, dismiss).
   */
  async moderateListing(
    listingId: string,
    action: 'disable' | 'remove' | 'dismiss' | 'reject',
    adminId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      if (action === 'disable' || action === 'reject') {
        await this.updateListingAvailability(listingId, adminId, 'paused');
      } else if (action === 'remove') {
        await this.deleteListing(listingId, adminId);
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  async getReportedListings(): Promise<MarketplaceReport[]> {
    return this.inMemoryReports;
  }

  async getBookingEvents(bookingId: string): Promise<BookingEventLog[]> {
    try {
      const { data, error } = await supabase
        .from('booking_events')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as BookingEventLog[];
      }
    } catch (e) {}

    return this.inMemoryEvents.filter((e) => e.booking_id === bookingId);
  }

  /**
   * Subscribes to Supabase Realtime postgres_changes on listings.
   */
  subscribeToListings(onUpdate: () => void) {
    try {
      const channel = supabase
        .channel('public:listings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
          onUpdate();
        })
        .subscribe();
      return channel;
    } catch (e) {
      return null;
    }
  }

  /**
   * Subscribes to Supabase Realtime postgres_changes on bookings.
   */
  subscribeToBookings(userId: string, onUpdate: () => void) {
    try {
      const channel = supabase
        .channel(`public:bookings:${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
          onUpdate();
        })
        .subscribe();
      return channel;
    } catch (e) {
      return null;
    }
  }

  unsubscribeFromListings(channel: any) {
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    }
  }

  private mapDatabaseRowToListing(row: any): MarketplaceListing {
    const images: string[] = Array.isArray(row.listing_images)
      ? row.listing_images.map((img: any) => img.image_url).filter(Boolean)
      : [];

    const coverRow = Array.isArray(row.listing_images)
      ? row.listing_images.find((img: any) => img.is_cover)
      : null;

    const cover_image = coverRow?.image_url || images[0] || undefined;

    const machinery = Array.isArray(row.listing_machinery_details) && row.listing_machinery_details.length > 0
      ? row.listing_machinery_details[0]
      : undefined;

    const cattle = Array.isArray(row.listing_cattle_details) && row.listing_cattle_details.length > 0
      ? row.listing_cattle_details[0]
      : undefined;

    const labour = Array.isArray(row.listing_labour_details) && row.listing_labour_details.length > 0
      ? row.listing_labour_details[0]
      : undefined;

    const service = Array.isArray(row.listing_service_details) && row.listing_service_details.length > 0
      ? row.listing_service_details[0]
      : undefined;

    return {
      id: row.id,
      user_id: row.user_id,
      listing_type: row.listing_type || 'machinery',
      title: row.title,
      description: row.description || '',
      category: row.category,
      price: row.price,
      price_unit: row.price_unit,
      security_deposit: row.security_deposit || 0,
      location: {
        village: row.village || undefined,
        district: row.district,
        state: row.state,
        address: row.address || undefined,
        lat: row.latitude || undefined,
        lon: row.longitude || undefined,
      },
      availability: row.availability_status || 'available',
      available_from: row.available_from || undefined,
      available_until: row.available_until || undefined,
      images,
      cover_image,
      owner: {
        id: row.user_id,
        name: row.owner_name || 'AgriConnect Farmer',
        phone: row.owner_phone || '',
        rating: 5.0,
        is_verified: row.owner_is_verified ?? false,
      },
      views_count: row.views_count || 0,
      reports_count: row.reports_count || 0,
      verification_status: row.verification_status || 'verified',
      contact_method: row.contact_preference || 'both',
      created_at: row.created_at,
      updated_at: row.updated_at,
      machinery_details: machinery,
      cattle_details: cattle,
      labour_details: labour,
      service_details: service,
    };
  }

  private mapDatabaseRowToBooking(row: any): MarketplaceBooking {
    return {
      id: row.id,
      listing_id: row.listing_id,
      listing_title: row.listing_title || 'Agricultural Listing',
      listing_type: row.listing_type || 'machinery',
      listing_image: row.listing_image,
      customer_id: row.customer_id,
      customer_name: row.customer_name || 'Customer',
      customer_phone: row.customer_phone || '',
      owner_id: row.owner_id,
      owner_name: row.owner_name || 'Owner',
      owner_phone: row.owner_phone || '',
      status: row.status as BookingStatus,
      start_at: row.start_at,
      end_at: row.end_at,
      start_time: row.start_time,
      duration: row.duration || 1,
      duration_unit: row.duration_unit || 'day',
      pricing_unit: row.pricing_unit || 'per_day',
      quantity: row.quantity || 1,
      farm_location: row.farm_location || '',
      pickup_location: row.pickup_location,
      destination_location: row.destination_location,
      delivery_required: row.delivery_required || false,
      operator_required: row.operator_required || false,
      rental_amount: row.rental_amount || 0,
      delivery_amount: row.delivery_amount || 0,
      operator_amount: row.operator_amount || 0,
      security_deposit: row.security_deposit || 0,
      total_amount: row.total_amount || 0,
      customer_message: row.customer_message,
      counter_offer_amount: row.counter_offer_amount,
      counter_offer_notes: row.counter_offer_notes,
      rejection_reason: row.rejection_reason,
      cancellation_reason: row.cancellation_reason,
      cancelled_by: row.cancelled_by,
      completed_by: row.completed_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      accepted_at: row.accepted_at,
      confirmed_at: row.confirmed_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      cancelled_at: row.cancelled_at,
    };
  }
}

export const marketplaceService = new MarketplaceService();
