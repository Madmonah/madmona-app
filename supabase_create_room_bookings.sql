-- ============================================================
-- Iteration 1: Real hourly bookings (cash on arrival + InstaPay)
-- Run this entire file in Supabase Studio → SQL Editor
-- ============================================================

-- ============================================================
-- Table: room_bookings
-- Holds hourly room reservations. Guest checkout — no user account
-- needed. Supports overlap-checking by querying start_hour/end_hour.
-- ============================================================

CREATE TABLE IF NOT EXISTS room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT UNIQUE NOT NULL,

  -- What's being booked
  space_slug TEXT NOT NULL,
  capacity_option TEXT,  -- '4-people' or '8-people' for meeting room; NULL otherwise

  -- When (date + integer hours, 24-hour clock)
  booking_date DATE NOT NULL,
  start_hour SMALLINT NOT NULL,
  end_hour SMALLINT NOT NULL,

  -- Customer (guest checkout)
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notes TEXT,

  -- Pricing
  total_price_egp NUMERIC(10, 2) NOT NULL,

  -- Payment
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash_on_arrival', 'instapay')),
  payment_proof_url TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'verified', 'rejected', 'refunded')),

  -- Booking lifecycle
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT valid_hours CHECK (
    start_hour >= 0 AND start_hour < 24 AND
    end_hour > start_hour AND end_hour <= 24
  )
);

-- Fast availability lookups
CREATE INDEX IF NOT EXISTS idx_room_bookings_date_space
  ON room_bookings(booking_date, space_slug);
CREATE INDEX IF NOT EXISTS idx_room_bookings_phone
  ON room_bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_room_bookings_status
  ON room_bookings(status);

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_room_bookings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS room_bookings_updated_at ON room_bookings;
CREATE TRIGGER room_bookings_updated_at
  BEFORE UPDATE ON room_bookings
  FOR EACH ROW EXECUTE FUNCTION update_room_bookings_timestamp();

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;

-- Anonymous (public) clients can INSERT bookings (guest checkout flow).
-- Reading is locked down — only the service-role key (used by API routes
-- on the server) can SELECT/UPDATE rows.
DROP POLICY IF EXISTS "Anon can create bookings" ON room_bookings;
CREATE POLICY "Anon can create bookings" ON room_bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON room_bookings;
CREATE POLICY "Service role full access" ON room_bookings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- Storage bucket: payment-proofs
-- Holds InstaPay screenshot uploads. Public bucket (anyone with the
-- URL can view) so the admin dashboard can render images directly.
-- Filenames are UUID-based so URLs are unguessable.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anon can upload payment proofs" ON storage.objects;
CREATE POLICY "Anon can upload payment proofs" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Anon can read payment proofs" ON storage.objects;
CREATE POLICY "Anon can read payment proofs" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'payment-proofs');
