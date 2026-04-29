-- ============================================================
-- Iteration 2: Multi-space booking + manual time blocks
-- Run this in Supabase Studio → SQL Editor
-- ============================================================

-- ============================================================
-- Table: space_blocks
-- Lets the admin block time ranges for any reason — prayer breaks,
-- maintenance, external bookings, holidays, etc. Treated by the
-- availability API the same as a regular booking: any time inside
-- a block is unavailable.
-- ============================================================

CREATE TABLE IF NOT EXISTS space_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_slug TEXT NOT NULL,
  block_date DATE NOT NULL,
  start_hour SMALLINT NOT NULL,
  end_hour SMALLINT NOT NULL,
  reason TEXT,                          -- e.g. 'صلاة', 'صيانة', 'حجز خارجي'
  created_by TEXT,                      -- admin handle (free-text for now)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT valid_block_hours CHECK (
    start_hour >= 0 AND start_hour < 24 AND
    end_hour > start_hour AND end_hour <= 24
  )
);

CREATE INDEX IF NOT EXISTS idx_space_blocks_date_space
  ON space_blocks(block_date, space_slug);

ALTER TABLE space_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access blocks" ON space_blocks;
CREATE POLICY "Service role full access blocks" ON space_blocks
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- Update room_bookings to support all spaces
-- (capacity_option becomes nullable; pricing_plan tracks plan type)
-- ============================================================

ALTER TABLE room_bookings
  ADD COLUMN IF NOT EXISTS pricing_plan TEXT;
-- pricing_plan values: 'hourly', 'daily', 'package_10', 'monthly'

CREATE INDEX IF NOT EXISTS idx_room_bookings_plan
  ON room_bookings(pricing_plan);
