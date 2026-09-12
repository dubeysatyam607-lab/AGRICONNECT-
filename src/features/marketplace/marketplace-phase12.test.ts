import { describe, it, expect, beforeEach } from 'vitest';
import {
  MARKETPLACE_CATEGORIES,
  MarketplaceCategory,
  validateImageFile,
  formatPriceWithUnit,
  CreateListingInput,
} from './domain/marketplaceTypes';
import { marketplaceService } from './domain/marketplaceService';

describe('Phase 12: AgriConnect Farmer Marketplace Tests', () => {
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
  });

  // ── 4. Listings Query & Filtering ─────────────────────────────────────────
  describe('Marketplace Listings Queries & Filters', () => {
    it('should return initial real verified listings spanning categories', async () => {
      const listings = await marketplaceService.getListings();
      expect(listings.length).toBeGreaterThanOrEqual(9);

      const categories = new Set(listings.map((l) => l.category));
      expect(categories.has('tractors')).toBe(true);
      expect(categories.has('harvesters')).toBe(true);
      expect(categories.has('cattle')).toBe(true);
      expect(categories.has('agri_products')).toBe(true);
      expect(categories.has('labour_services')).toBe(true);
    });

    it('should filter listings accurately by category', async () => {
      const tractorListings = await marketplaceService.getListings({ category: 'tractors' });
      expect(tractorListings.length).toBeGreaterThan(0);
      tractorListings.forEach((l) => {
        expect(l.category).toBe('tractors');
      });

      const cattleListings = await marketplaceService.getListings({ category: 'cattle' });
      expect(cattleListings.length).toBeGreaterThan(0);
      cattleListings.forEach((l) => {
        expect(l.category).toBe('cattle');
      });
    });

    it('should search listings by keyword in title, location, or description', async () => {
      const results = await marketplaceService.getListings({ searchQuery: 'Mahindra' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Mahindra');

      const locationResults = await marketplaceService.getListings({ searchQuery: 'Ludhiana' });
      expect(locationResults.length).toBeGreaterThan(0);
      expect(locationResults[0].location.district).toBe('Ludhiana');
    });

    it('should sort listings by price low-to-high and high-to-low', async () => {
      const lowToHigh = await marketplaceService.getListings({ sortBy: 'price_low' });
      for (let i = 1; i < lowToHigh.length; i++) {
        expect(lowToHigh[i].price).toBeGreaterThanOrEqual(lowToHigh[i - 1].price);
      }

      const highToLow = await marketplaceService.getListings({ sortBy: 'price_high' });
      for (let i = 1; i < highToLow.length; i++) {
        expect(highToLow[i].price).toBeLessThanOrEqual(highToLow[i - 1].price);
      }
    });

    it('should fetch single listing by ID and track views count', async () => {
      const all = await marketplaceService.getListings();
      const first = all[0];
      const initialViews = first.views_count || 0;

      const fetched = await marketplaceService.getListingById(first.id);
      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(first.id);
      expect(fetched?.views_count).toBe(initialViews + 1);
    });
  });

  // ── 5. Create, Update, and Delete Listings ────────────────────────────────
  describe('Listing Lifecycle (Create, Update, Delete)', () => {
    it('should allow a farmer to create a new verified listing', async () => {
      const input: CreateListingInput = {
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
        specifications: {
          horsepower: 55,
          drive: '4WD',
        },
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
      expect(created.verification_status).toBe('verified');

      const userListings = await marketplaceService.getUserListings('farmer-mukesh-01');
      expect(userListings.some((l) => l.id === created.id)).toBe(true);
    });

    it('should validate mandatory fields when creating a listing', async () => {
      const invalidInput: CreateListingInput = {
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
      const listings = await marketplaceService.getListings();
      const target = listings[0];

      const updated = await marketplaceService.updateListing(
        target.id,
        { price: 900, availability: 'rented' },
        target.user_id
      );

      expect(updated.price).toBe(900);
      expect(updated.availability).toBe('rented');
    });

    it('should prevent unauthorized users from editing other farmers listings', async () => {
      const listings = await marketplaceService.getListings();
      const target = listings[0];

      await expect(
        marketplaceService.updateListing(target.id, { price: 50 }, 'imposter-user-999')
      ).rejects.toThrow('Unauthorized');
    });

    it('should allow the owner or admin to delete a listing', async () => {
      const listings = await marketplaceService.getListings();
      const target = listings[0];

      const deleted = await marketplaceService.deleteListing(target.id, target.user_id);
      expect(deleted).toBe(true);

      const after = await marketplaceService.getListingById(target.id);
      expect(after).toBeNull();
    });
  });

  // ── 6. Booking Requests Lifecycle ────────────────────────────────────────
  describe('Direct Booking Requests & Lifecycle Management', () => {
    it('should create a pending booking request for an available listing', async () => {
      const listings = await marketplaceService.getListings();
      const target = listings.find((l) => l.availability === 'available')!;

      const booking = await marketplaceService.createBookingRequest(
        {
          listing_id: target.id,
          start_date: '2026-09-20',
          units_requested: 5,
          offered_amount: target.price * 5,
          location_address: 'Village Rampura Farm No. 4',
          notes: 'Please arrive by 7:00 AM',
        },
        {
          id: 'buyer-farmer-42',
          name: 'Balram Yadav',
          phone: '9827011223',
        }
      );

      expect(booking.id).toBeDefined();
      expect(booking.status).toBe('pending');
      expect(booking.requester_name).toBe('Balram Yadav');
      expect(booking.owner_id).toBe(target.owner.id);
      expect(booking.offered_amount).toBe(target.price * 5);

      const userBookings = await marketplaceService.getUserBookingRequests('buyer-farmer-42');
      expect(userBookings.length).toBe(1);
    });

    it('should prevent a farmer from booking their own listing', async () => {
      const listings = await marketplaceService.getListings();
      const target = listings[0];

      await expect(
        marketplaceService.createBookingRequest(
          {
            listing_id: target.id,
            start_date: '2026-09-20',
            offered_amount: 1000,
            location_address: 'Field A',
          },
          {
            id: target.user_id, // Same as owner
            name: 'Same Owner',
            phone: '123',
          }
        )
      ).rejects.toThrow('You cannot book your own listing');
    });

    it('should support full booking status transitions (pending -> accepted -> completed)', async () => {
      const listings = await marketplaceService.getListings();
      const target = listings[0];

      const booking = await marketplaceService.createBookingRequest(
        {
          listing_id: target.id,
          start_date: '2026-09-25',
          offered_amount: 2000,
          location_address: 'Main Canal Road',
        },
        { id: 'requester-99', name: 'Kishan Lal', phone: '9893000000' }
      );

      // Owner accepts
      const accepted = await marketplaceService.updateBookingStatus(
        booking.id,
        'accepted',
        target.owner.id
      );
      expect(accepted.status).toBe('accepted');

      // Owner marks completed
      const completed = await marketplaceService.updateBookingStatus(
        booking.id,
        'completed',
        target.owner.id
      );
      expect(completed.status).toBe('completed');
    });

    it('should allow requester or owner to cancel/reject a booking', async () => {
      const listings = await marketplaceService.getListings();
      const target = listings[0];

      const booking = await marketplaceService.createBookingRequest(
        {
          listing_id: target.id,
          start_date: '2026-09-28',
          offered_amount: 1500,
          location_address: 'Plot 12',
        },
        { id: 'requester-101', name: 'Ramcharan', phone: '9826000000' }
      );

      // Requester cancels
      const cancelled = await marketplaceService.updateBookingStatus(
        booking.id,
        'cancelled',
        'requester-101',
        'Date changed due to weather'
      );
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.status_reason).toBe('Date changed due to weather');
    });
  });

  // ── 7. Moderation & Community Reporting ──────────────────────────────────
  describe('Community Moderation & Reporting', () => {
    it('should record a report and increment reports count on listing', async () => {
      const listings = await marketplaceService.getListings();
      const target = listings[0];

      const report = await marketplaceService.reportListing(
        target.id,
        'vigilant-farmer-01',
        'wrong_price',
        'Demanded 1200 per hour instead of listed 850'
      );

      expect(report.id).toBeDefined();
      expect(report.reason).toBe('wrong_price');
      expect(report.status).toBe('pending');

      const refreshed = await marketplaceService.getListingById(target.id);
      expect(refreshed?.reports_count).toBeGreaterThan(0);
    });

    it('should auto-flag listing if 3 or more reports are submitted', async () => {
      const listings = await marketplaceService.getListings();
      const target = listings[1];

      await marketplaceService.reportListing(target.id, 'user-a', 'scam', 'Fake number');
      await marketplaceService.reportListing(target.id, 'user-b', 'scam', 'No answer');
      await marketplaceService.reportListing(target.id, 'user-c', 'scam', 'Duplicate item');

      const flagged = await marketplaceService.getListingById(target.id);
      expect(flagged?.verification_status).toBe('flagged');
    });

    it('should allow admin to verify, reject, or delete listings during moderation', async () => {
      const listings = await marketplaceService.getListings();
      const target = listings[2];

      const rejected = await marketplaceService.moderateListing(target.id, 'reject', 'admin-01');
      expect(rejected?.verification_status).toBe('rejected');

      // Rejected listings are excluded from regular browse
      const browse = await marketplaceService.getListings();
      expect(browse.some((l) => l.id === target.id)).toBe(false);
    });
  });
});
