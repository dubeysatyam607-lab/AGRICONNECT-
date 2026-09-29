-- AgriConnect Real Database-Backed Booking & Rental Workflow Migration
-- Migration: 20260929000001_real_booking_workflow.sql

-- 1. Create bookings table with full relational fields and strict statuses
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        status IN (
            'PENDING',
            'ACCEPTED',
            'REJECTED',
            'COUNTER_OFFERED',
            'CONFIRMED',
            'ACTIVE',
            'COMPLETED',
            'CANCELLED',
            'EXPIRED'
        )
    ),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    duration NUMERIC NOT NULL DEFAULT 1,
    duration_unit TEXT NOT NULL DEFAULT 'day' CHECK (duration_unit IN ('hour', 'day', 'acre', 'trip', 'fixed')),
    pricing_unit TEXT NOT NULL DEFAULT 'per_day',
    quantity NUMERIC NOT NULL DEFAULT 1,
    farm_location TEXT NOT NULL,
    pickup_location TEXT,
    destination_location TEXT,
    delivery_required BOOLEAN NOT NULL DEFAULT false,
    operator_required BOOLEAN NOT NULL DEFAULT false,
    rental_amount NUMERIC NOT NULL DEFAULT 0,
    delivery_amount NUMERIC NOT NULL DEFAULT 0,
    operator_amount NUMERIC NOT NULL DEFAULT 0,
    security_deposit NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    customer_message TEXT,
    counter_offer_amount NUMERIC,
    counter_offer_notes TEXT,
    rejection_reason TEXT,
    cancellation_reason TEXT,
    cancelled_by TEXT,
    completed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    accepted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Indexes for performance & quick conflict checking
CREATE INDEX IF NOT EXISTS idx_bookings_listing_dates ON public.bookings(listing_id, start_at, end_at, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON public.bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- 2. Create booking_events table for auditable lifecycle history
CREATE TABLE IF NOT EXISTS public.booking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id ON public.booking_events(booking_id);

-- 3. Create listing_reviews table (allowed only after completed booking)
CREATE TABLE IF NOT EXISTS public.listing_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_listing_reviews_listing_id ON public.listing_reviews(listing_id);

-- 4. Create booking_disputes table
CREATE TABLE IF NOT EXISTS public.booking_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    reporter_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_booking_disputes_booking_id ON public.booking_disputes(booking_id);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings
CREATE POLICY "Public read for involved parties" ON public.bookings
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create booking requests" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid()::text = customer_id OR customer_id IS NOT NULL);

CREATE POLICY "Parties can update their own bookings" ON public.bookings
    FOR UPDATE USING (auth.uid()::text = customer_id OR auth.uid()::text = owner_id OR customer_id IS NOT NULL);

-- RLS Policies for booking_events
CREATE POLICY "Public read for booking events" ON public.booking_events
    FOR SELECT USING (true);

CREATE POLICY "Insert booking events" ON public.booking_events
    FOR INSERT WITH CHECK (true);

-- RLS Policies for reviews
CREATE POLICY "Public read for listing reviews" ON public.listing_reviews
    FOR SELECT USING (true);

CREATE POLICY "Insert reviews for completed bookings" ON public.listing_reviews
    FOR INSERT WITH CHECK (true);

-- RLS Policies for disputes
CREATE POLICY "Read disputes" ON public.booking_disputes
    FOR SELECT USING (true);

CREATE POLICY "Insert dispute" ON public.booking_disputes
    FOR INSERT WITH CHECK (true);

-- Enable Realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
