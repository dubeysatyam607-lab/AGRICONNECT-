import { describe, it, expect, beforeEach, vi } from 'vitest';
import { marketplaceService } from './domain/marketplaceService';
import { supabase } from '@/integrations/supabase/client';

describe('Booking & Payment Proof Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createBooking initializes payment_status as PAYMENT_PENDING and derives customer ID', async () => {
    const mockListing = {
      id: 'l_test_1',
      title: 'Mahindra 575 DI Tractor',
      listing_type: 'machinery',
      availability: 'available',
      price: 800,
      price_unit: 'per_day',
      user_id: 'owner_99',
      owner: { id: 'owner_99', name: 'Ramesh Farmer', phone: '9876543210' },
      images: ['/images/tractor.jpg'],
      cover_image: '/images/tractor.jpg',
    };

    vi.spyOn(marketplaceService, 'getListingById').mockResolvedValue(mockListing as any);
    vi.spyOn(marketplaceService, 'checkBookingConflict').mockResolvedValue({ conflict: false });

    const booking = await marketplaceService.createBooking(
      {
        listing_id: 'l_test_1',
        start_date: '2026-10-10',
        duration: 2,
        duration_unit: 'day',
        farm_location: 'Punjab Farm',
      },
      { id: 'cust_real_100', name: 'Farmer Surjeet', phone: '9123456789' }
    );

    expect(booking).toBeDefined();
    expect(booking.listing_id).toBe('l_test_1');
    expect(booking.status).toBe('PENDING');
    expect(booking.payment_status).toBe('PAYMENT_PENDING');
    expect(booking.total_amount).toBeGreaterThan(0);
  });

  it('submitPaymentProofForBooking updates status to PAYMENT_PROOF_SUBMITTED and records UTR + proof path', async () => {
    const bookingId = `book_test_${Date.now()}`;
    const proof = await marketplaceService.submitPaymentProofForBooking({
      bookingId,
      utr: '415974832196',
      proofPath: 'payment-proofs/user_100/folder/proof.png',
      amount: 1600,
      note: 'UPI Payment via PhonePe',
    });

    expect(proof).toBeDefined();
    expect(proof.id).toBe(bookingId);
    expect(proof.payment_status).toBe('PAYMENT_PROOF_SUBMITTED');
    expect(proof.utr).toBe('415974832196');
    expect(proof.proof_storage_path).toBe('payment-proofs/user_100/folder/proof.png');
    // Booking status remains PENDING until verified
    expect(proof.status).toBe('PENDING');
  });
});
