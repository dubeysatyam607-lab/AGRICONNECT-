import { describe, it, expect, beforeEach } from 'vitest';
import {
  MARKETPLACE_CATEGORIES,
  MarketplaceCategory,
  validateImageFile,
  formatPriceWithUnit,
  CreateListingInput,
  calculateBookingPriceBreakdown,
  CreateBookingInput,
} from './domain/marketplaceTypes';
import { marketplaceService } from './domain/marketplaceService';

describe('Phase 12: AgriConnect Farmer Marketplace & Real Booking Workflow Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── 1. Category Definitions (All 9 Required Categories) ──────────────────
  describe('Marketplace Categories Specification', () => {
    it('should include all 9 required categories with valid metadata', () => {
      const requiredCategories: MarketplaceCategory[] = [
        'equipment',
        'tractors',
        'harvesters',
        'cultivators',
        'rotavators',
        'seeders',
        'cattle',
        'labour_services',
        'agri_products',
      ];

      expect(MARKETPLACE_CATEGORIES.length).toBe(9);

      for (const catId of requiredCategories) {
        const found = MARKETPLACE_CATEGORIES.find((c) => c.id === catId);
        expect(found, `Category ${catId} must exist`).toBeDefined();
        expect(found?.nameEn.length).toBeGreaterThan(0);
        expect(found?.nameHi.length).toBeGreaterThan(0);
        expect(found?.descriptionEn.length).toBeGreaterThan(0);
        expect(found?.defaultPriceUnit).toBeDefined();
      }
    });
  });

  // ── 2. Image Validation Helper ───────────────────────────────────────────
  describe('Image Upload Validation', () => {
    it('should accept valid JPG, PNG, and WEBP image files within 5MB', () => {
      const validJpg = { name: 'tractor.jpg', size: 1024 * 500, type: 'image/jpeg' };
      const validPng = { name: 'harvester.png', size: 1024 * 1024, type: 'image/png' };
      const validWebp = { name: 'cow.webp', size: 1024 * 200, type: 'image/webp' };

      expect(validateImageFile(validJpg as any).valid).toBe(true);
      expect(validateImageFile(validPng as any).valid).toBe(true);
      expect(validateImageFile(validWebp as any).valid).toBe(true);
    });

    it('should reject files exceeding 5MB', () => {
      const oversized = { name: 'huge_pic.jpg', size: 6 * 1024 * 1024, type: 'image/jpeg' };
      const res = validateImageFile(oversized as any);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds maximum allowed limit of 5 MB');
    });

    it('should reject corrupted or empty files (<1KB)', () => {
      const tiny = { name: 'empty.jpg', size: 500, type: 'image/jpeg' };
      const res = validateImageFile(tiny as any);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('too small or corrupted');
    });

    it('should reject unsupported formats like PDF or GIF', () => {
      const pdf = { name: 'doc.pdf', size: 50000, type: 'application/pdf' };
      const res = validateImageFile(pdf as any);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Unsupported image format');
    });
  });

  // ── 3. Price Formatting Helper ───────────────────────────────────────────
  describe('Price Formatting with Units', () => {
    it('should format hourly, daily, acre, quintal, and fixed prices accurately', () => {
      expect(formatPriceWithUnit(850, 'per_hour')).toBe('₹850/hour');
      expect(formatPriceWithUnit(4500, 'per_day')).toBe('₹4,500/day');
      expect(formatPriceWithUnit(1800, 'per_acre')).toBe('₹1,800/acre');
      expect(formatPriceWithUnit(3600, 'per_quintal')).toBe('₹3,600/quintal');
      expect(formatPriceWithUnit(78000, 'fixed')).toBe('₹78,000');
    });

    it('should accurately calculate booking price breakdown with delivery & operator charges', () => {
      const mockListing: any = {
        price: 1000,
        price_unit: 'per_day',
        security_deposit: 2000,
        machinery_details: {
          delivery_charges: 500,
          operator_charges: 300,
        },
      };

      const breakdown = calculateBookingPriceBreakdown(mockListing, 3, 1, true, true);
      // Rental = 1000 * 3 = 3000
      // Delivery = 500
      // Operator = 300 * 3 = 900
      // Security = 2000
      // Total = 3000 + 500 + 900 + 2000 = 6400
      expect(breakdown.rental_amount).toBe(3000);
      expect(breakdown.delivery_amount).toBe(500);
      expect(breakdown.operator_amount).toBe(900);
      expect(breakdown.security_deposit).toBe(2000);
      expect(breakdown.total_amount).toBe(6400);
    });
  });

  // ── 4. Create, Update, and Delete Listings ────────────────────────────────
  describe('Listing Lifecycle (Create, Update, Delete)', () => {
    it('should allow a farmer to create a new verified listing', async () => {
      const input: CreateListingInput = {
        listing_type: 'machinery',
        title: 'New Holland 3630 Super 55 HP Tractor',
        category: 'tractors',
        description: 'Excellent condition with 4WD and hydraulic trolley hook.',
        price: 950,
        price_unit: 'per_hour',
        location: {
          state: 'Rajasthan',
          district: 'Kota',
          village: 'Sangod',
        },
        images: ['https://example.com/tractor.jpg'],
        contact_method: 'both',
      };

      const created = await marketplaceService.createListing(input, 'farmer-mukesh-01', {
        name: 'Mukesh Sharma',
        phone: '9829012345',
        is_verified: true,
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('New Holland 3630 Super 55 HP Tractor');
      expect(created.owner.name).toBe('Mukesh Sharma');
      expect(created.availability).toBe('available');
    });

    it('should validate mandatory fields when creating a listing', async () => {
      const invalidInput: CreateListingInput = {
        listing_type: 'machinery',
        title: '',
        category: 'equipment',
        description: '',
        price: 0,
        price_unit: 'per_day',
        location: { state: '', district: '' },
        images: [],
        contact_method: 'both',
      };

      await expect(
        marketplaceService.createListing(invalidInput, 'user-1', { name: 'Test', phone: '123' })
      ).rejects.toThrow();
    });

    it('should allow the owner to update their listing', async () => {
      const created = await marketplaceService.createListing(
        {
          listing_type: 'machinery',
          title: 'Mahindra 575 DI Tractor',
          category: 'tractors',
          description: 'Used for plowing',
          price: 800,
          price_unit: 'per_hour',
          location: { state: 'Punjab', district: 'Patiala' },
          images: [],
          contact_method: 'both',
        },
        'owner-user-1',
        { name: 'Pritam Singh', phone: '9812345678' }
      );

      const updated = await marketplaceService.updateListing(
        created.id,
        { price: 900, availability: 'rented' },
        'owner-user-1'
      );

      expect(updated.price).toBe(900);
      expect(updated.availability).toBe('rented');
    });

    it('should prevent unauthorized users from editing other farmers listings', async () => {
      const created = await marketplaceService.createListing(
        {
          listing_type: 'machinery',
          title: 'Kubota Harvester',
          category: 'harvesters',
          description: 'Paddy harvesting machine',
          price: 1500,
          price_unit: 'per_hour',
          location: { state: 'Haryana', district: 'Karnal' },
          images: [],
          contact_method: 'both',
        },
        'legit-owner-1',
        { name: 'Karan Singh', phone: '9876543210' }
      );

      await expect(
        marketplaceService.updateListing(created.id, { price: 50 }, 'imposter-user-999')
      ).rejects.toThrow('Unauthorized');
    });

    it('should allow the owner or admin to delete a listing', async () => {
      const created = await marketplaceService.createListing(
        {
          listing_type: 'machinery',
          title: 'Sonalika Rotavator',
          category: 'rotavators',
          description: '6 feet rotavator',
          price: 400,
          price_unit: 'per_hour',
          location: { state: 'MP', district: 'Indore' },
          images: [],
          contact_method: 'both',
        },
        'rotavator-owner-1',
        { name: 'Rajesh Kumar', phone: '9988776655' }
      );

      const deleted = await marketplaceService.deleteListing(created.id, 'rotavator-owner-1');
      expect(deleted).toBe(true);

      const after = await marketplaceService.getListingById(created.id);
      expect(after).toBeNull();
    });
  });

  // ── 5. Real Database Booking Workflow & Conflict Detection ────────────────
  describe('Real Database Booking Workflow & Conflict Prevention', () => {
    it('should create a pending booking and prevent self-booking', async () => {
      const listing = await marketplaceService.createListing(
        {
          listing_type: 'machinery',
          title: 'John Deere 5050D Tractor',
          category: 'tractors',
          description: 'Reliable 50HP tractor for hire',
          price: 900,
          price_unit: 'per_day',
          location: { state: 'UP', district: 'Meerut' },
          images: [],
          contact_method: 'both',
        },
        'tractor-owner-88',
        { name: 'Virendra Singh', phone: '9876000000' }
      );

      // Attempt self booking
      await expect(
        marketplaceService.createBooking(
          {
            listing_id: listing.id,
            start_date: '2026-10-10',
            duration: 2,
            duration_unit: 'day',
            farm_location: 'My own farm',
          },
          { id: 'tractor-owner-88', name: 'Virendra Singh', phone: '9876000000' }
        )
      ).rejects.toThrow('You cannot book your own listing');

      // Create valid booking from another customer
      const booking = await marketplaceService.createBooking(
        {
          listing_id: listing.id,
          start_date: '2026-10-10',
          duration: 3,
          duration_unit: 'day',
          farm_location: 'Village Rampura Farm No. 4',
        },
        { id: 'buyer-farmer-42', name: 'Balram Yadav', phone: '9827011223' }
      );

      expect(booking.id).toBeDefined();
      expect(booking.status).toBe('PENDING');
      expect(booking.customer_name).toBe('Balram Yadav');
      expect(booking.total_amount).toBe(2700); // 900 * 3 days
    });

    it('should detect server-side booking conflict and block overlapping rental requests', async () => {
      const listing = await marketplaceService.createListing(
        {
          listing_type: 'machinery',
          title: 'Preet 9049 4WD Harvester',
          category: 'harvesters',
          description: 'Heavy duty harvester for paddy',
          price: 2000,
          price_unit: 'per_day',
          location: { state: 'Punjab', district: 'Bathinda' },
          images: [],
          contact_method: 'both',
        },
        'harvester-owner-1',
        { name: 'Harpreet Singh', phone: '9814000000' }
      );

      // Booking 1: 10 Oct to 12 Oct
      await marketplaceService.createBooking(
        {
          listing_id: listing.id,
          start_date: '2026-10-10',
          end_date: '2026-10-12',
          duration: 2,
          duration_unit: 'day',
          farm_location: 'Plot 10',
        },
        { id: 'farmer-a', name: 'Farmer A', phone: '9800000001' }
      );

      // Booking 2 overlapping: 11 Oct to 13 Oct -> MUST BE BLOCKED
      await expect(
        marketplaceService.createBooking(
          {
            listing_id: listing.id,
            start_date: '2026-10-11',
            end_date: '2026-10-13',
            duration: 2,
            duration_unit: 'day',
            farm_location: 'Plot 12',
          },
          { id: 'farmer-b', name: 'Farmer B', phone: '9800000002' }
        )
      ).rejects.toThrow('This equipment is already booked for part of your selected period.');
    });

    it('should support complete booking status transitions (PENDING -> ACCEPTED -> CONFIRMED -> ACTIVE -> COMPLETED)', async () => {
      const listing = await marketplaceService.createListing(
        {
          listing_type: 'cattle',
          title: 'Pure Gir Dairy Cow 14L/day',
          category: 'cattle',
          description: 'Healthy lactating cow',
          price: 60000,
          price_unit: 'fixed',
          location: { state: 'Gujarat', district: 'Anand' },
          images: [],
          contact_method: 'both',
        },
        'dairy-owner-1',
        { name: 'Patel Dairy', phone: '9898000000' }
      );

      const booking = await marketplaceService.createBooking(
        {
          listing_id: listing.id,
          start_date: '2026-10-01',
          duration: 1,
          duration_unit: 'fixed',
          farm_location: 'Anand Village',
        },
        { id: 'buyer-farmer-99', name: 'Ramesh Patel', phone: '9876543210' }
      );

      expect(booking.status).toBe('PENDING');

      // Owner accepts
      const accepted = await marketplaceService.updateBookingStatus(booking.id, 'ACCEPTED', 'dairy-owner-1');
      expect(accepted.status).toBe('ACCEPTED');

      // Confirmation
      const confirmed = await marketplaceService.updateBookingStatus(booking.id, 'CONFIRMED', 'buyer-farmer-99');
      expect(confirmed.status).toBe('CONFIRMED');

      // Rental starts
      const active = await marketplaceService.updateBookingStatus(booking.id, 'ACTIVE', 'dairy-owner-1');
      expect(active.status).toBe('ACTIVE');

      // Completion
      const completed = await marketplaceService.updateBookingStatus(booking.id, 'COMPLETED', 'dairy-owner-1');
      expect(completed.status).toBe('COMPLETED');
    });

    it('should support counter offer workflow (PENDING -> COUNTER_OFFERED -> ACCEPTED)', async () => {
      const listing = await marketplaceService.createListing(
        {
          listing_type: 'labour',
          title: 'Tractor Operator & Plowing Crew',
          category: 'labour_services',
          description: 'Team of 3 skilled operators',
          price: 1500,
          price_unit: 'per_day',
          location: { state: 'UP', district: 'Kanpur' },
          images: [],
          contact_method: 'both',
        },
        'crew-owner-1',
        { name: 'Vijay Labour Service', phone: '9839000000' }
      );

      const booking = await marketplaceService.createBooking(
        {
          listing_id: listing.id,
          start_date: '2026-10-15',
          duration: 4,
          duration_unit: 'day',
          farm_location: 'Kanpur Dehat',
        },
        { id: 'farmer-client', name: 'Sohan Singh', phone: '9812000000' }
      );

      // Owner proposes counter offer of ₹5500 instead of ₹6000
      const counter = await marketplaceService.createCounterOffer(
        {
          booking_id: booking.id,
          counter_offer_amount: 5500,
          counter_offer_notes: 'Special discount for 4 continuous days',
        },
        'crew-owner-1'
      );

      expect(counter.status).toBe('COUNTER_OFFERED');
      expect(counter.counter_offer_amount).toBe(5500);

      // Customer accepts counter offer
      const acceptedCounter = await marketplaceService.updateBookingStatus(
        booking.id,
        'ACCEPTED',
        'farmer-client',
        'Accepted revised counter offer'
      );
      expect(acceptedCounter.status).toBe('ACCEPTED');
    });

    it('should restrict posting reviews until booking is COMPLETED', async () => {
      const listing = await marketplaceService.createListing(
        {
          listing_type: 'service',
          title: 'Drone Crop Spraying Service',
          category: 'agri_products',
          description: '10 acres drone spraying',
          price: 450,
          price_unit: 'per_acre',
          location: { state: 'Telangana', district: 'Warangal' },
          images: [],
          contact_method: 'both',
        },
        'drone-agency-1',
        { name: 'AgriFly Drones', phone: '9848000000' }
      );

      const booking = await marketplaceService.createBooking(
        {
          listing_id: listing.id,
          start_date: '2026-10-20',
          duration: 10,
          duration_unit: 'acre',
          farm_location: 'Warangal Fields',
        },
        { id: 'farmer-drone-client', name: 'Venkat Rao', phone: '9849000000' }
      );

      // Attempting review while PENDING -> MUST THROW
      await expect(
        marketplaceService.submitListingReview(booking.id, 'farmer-drone-client', 5, 'Great spraying!')
      ).rejects.toThrow('Reviews can only be submitted after the rental or service is completed.');

      // Mark COMPLETED
      await marketplaceService.updateBookingStatus(booking.id, 'COMPLETED', 'drone-agency-1');

      // Now review should succeed
      const review = await marketplaceService.submitListingReview(
        booking.id,
        'farmer-drone-client',
        5,
        'Punctual and very efficient drone spraying!'
      );
      expect(review.id).toBeDefined();
      expect(review.rating).toBe(5);
    });
  });

  // ── 6. Moderation & Community Reporting ──────────────────────────────────
  describe('Community Moderation & Reporting', () => {
    it('should record a report for a listing', async () => {
      const listing = await marketplaceService.createListing(
        {
          listing_type: 'equipment',
          title: 'Power Tiller 12HP',
          category: 'equipment',
          description: 'Heavy duty tiller',
          price: 500,
          price_unit: 'per_hour',
          location: { state: 'WB', district: 'Hooghly' },
          images: [],
          contact_method: 'both',
        },
        'tiller-owner-1',
        { name: 'Arup Biswas', phone: '9830000000' }
      );

      const report = await marketplaceService.reportListing(
        listing.id,
        'vigilant-farmer-01',
        'wrong_price',
        'Demanded 1200 per hour instead of listed 500'
      );

      expect(report.id).toBeDefined();
      expect(report.reason).toBe('wrong_price');
      expect(report.status).toBe('pending');
    });
  });
});
