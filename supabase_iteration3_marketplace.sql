-- ============================================================
-- ITERATION 3: MARKETPLACE FOUNDATION
-- Transforms Madmona from a single-venue site into a multi-supplier
-- workspace marketplace.
-- Run this in Supabase Studio → SQL Editor
-- ============================================================

-- ============================================================
-- 1. CATEGORIES TABLE
-- Dynamic, admin-managed list of unit categories.
-- ============================================================

CREATE TABLE IF NOT EXISTS unit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- e.g. 'workstation', 'meeting_room'
  name_ar TEXT NOT NULL,               -- 'مكاتب فردية'
  name_en TEXT NOT NULL,               -- 'Workstations'
  description_ar TEXT,
  icon TEXT,                           -- lucide-react icon name
  display_order SMALLINT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed the 5 categories from the legacy app
INSERT INTO unit_categories (slug, name_ar, name_en, description_ar, icon, display_order)
VALUES
  ('workstation', 'مكاتب فردية', 'Workstations', 'مكتب واحد مخصص لشخص واحد', 'Monitor', 1),
  ('meeting_room', 'غرف اجتماعات', 'Meeting Rooms', 'غرف مغلقة لاجتماعات وجلسات', 'Users', 2),
  ('office', 'مكاتب خاصة', 'Private Offices', 'مكاتب خاصة كاملة لفرق صغيرة', 'Building', 3),
  ('amenity', 'وسائل راحة', 'Amenities', 'كافيتيريا، طباعة، موقف سيارات', 'Coffee', 4),
  ('equipment', 'معدات', 'Equipment', 'شاشات، بروجكترات، كاميرات', 'Camera', 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. SUPPLIERS TABLE
-- Each supplier owns one venue. They register, get approved by
-- admin, and then can list units.
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT UNIQUE NOT NULL,

  -- Auth (we use Supabase Auth UUID once they verify their email)
  auth_user_id UUID UNIQUE,            -- nullable until they verify
  password_hash TEXT,                  -- temporary direct-auth fallback

  -- Venue details
  logo_url TEXT,
  address TEXT,
  city TEXT,
  district TEXT,                       -- 'مصر الجديدة', 'الزمالك', etc.
  description_ar TEXT,

  -- Business
  commission_rate NUMERIC(5,2) DEFAULT 20.00 NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  payout_method TEXT,                  -- 'bank_transfer', 'instapay', 'cash'
  payout_details TEXT,                 -- account number / instapay handle / etc.

  -- Lifecycle
  status TEXT DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(contact_email);
CREATE INDEX IF NOT EXISTS idx_suppliers_district ON suppliers(district);

-- Seed Madmona itself as the first supplier (auto-approved)
INSERT INTO suppliers (
  business_name, contact_name, contact_phone, contact_email,
  address, city, district, description_ar,
  commission_rate, status, approved_at
)
VALUES (
  'مضمونة',
  'Mohamed (Madmona Owner)',
  '+201002229982',
  'Madmona.admin@gmail.com',
  '٧ شارع سليمان، متفرع من عبد الحميد بدوي، بجوار Modern School',
  'القاهرة',
  'مصر الجديدة',
  'مساحة عمل بوتيك في مصر الجديدة',
  0.00,                                -- Madmona keeps 100% of its own bookings
  'approved',
  NOW()
)
ON CONFLICT (contact_email) DO NOTHING;

-- ============================================================
-- 3. SPACE_UNITS TABLE
-- The actual bookable inventory. One row per physical workstation,
-- meeting room, office, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS space_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES unit_categories(slug),

  -- Display
  name_ar TEXT NOT NULL,               -- 'مكتب رقم 1', 'غرفة الفجر', etc.
  description_ar TEXT,
  photo_urls TEXT[] DEFAULT '{}',      -- array of full URLs

  -- Capacity
  capacity SMALLINT DEFAULT 1 NOT NULL CHECK (capacity > 0),

  -- Pricing — supports multiple plans per unit (NULL = plan not offered)
  price_hourly NUMERIC(10,2),
  price_daily NUMERIC(10,2),
  price_package_10 NUMERIC(10,2),      -- 10-day package
  price_monthly NUMERIC(10,2),

  -- Operating hours (only used by hourly plan)
  operating_start_hour SMALLINT DEFAULT 9 CHECK (operating_start_hour >= 0 AND operating_start_hour < 24),
  operating_end_hour SMALLINT DEFAULT 23 CHECK (operating_end_hour > 0 AND operating_end_hour <= 24),

  -- Lifecycle
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_space_units_supplier ON space_units(supplier_id);
CREATE INDEX IF NOT EXISTS idx_space_units_category ON space_units(category_slug);
CREATE INDEX IF NOT EXISTS idx_space_units_active ON space_units(is_active) WHERE is_active = true;

-- ============================================================
-- 4. UNIT_BOOKINGS TABLE
-- New bookings table that references units by ID (not slug).
-- This is the table that makes "no double booking the same desk" work.
-- ============================================================

CREATE TABLE IF NOT EXISTS unit_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT UNIQUE NOT NULL,

  -- What's booked
  unit_id UUID NOT NULL REFERENCES space_units(id),
  pricing_plan TEXT NOT NULL CHECK (pricing_plan IN ('hourly', 'daily', 'package_10', 'monthly')),

  -- When
  booking_date DATE NOT NULL,
  start_hour SMALLINT NOT NULL,
  end_hour SMALLINT NOT NULL,

  -- Customer
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  notes TEXT,

  -- Money: customer pays full, we track commission split
  total_price_egp NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,    -- 20% of total
  supplier_payout NUMERIC(10,2) NOT NULL,      -- 80% of total

  -- Payment
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash_on_arrival', 'instapay')),
  payment_proof_url TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'verified', 'rejected', 'refunded')),

  -- Booking lifecycle
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),

  -- Payout tracking (settles when admin marks the supplier paid)
  payout_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payout_status IN ('unpaid', 'paid')),
  payout_paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT valid_booking_hours CHECK (
    start_hour >= 0 AND start_hour < 24 AND
    end_hour > start_hour AND end_hour <= 24
  )
);

CREATE INDEX IF NOT EXISTS idx_unit_bookings_unit ON unit_bookings(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_bookings_date ON unit_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_unit_bookings_unit_date ON unit_bookings(unit_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_unit_bookings_phone ON unit_bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_unit_bookings_status ON unit_bookings(status);
CREATE INDEX IF NOT EXISTS idx_unit_bookings_payout_status ON unit_bookings(payout_status);

-- ============================================================
-- 5. UNIT_BLOCKS TABLE
-- Same idea as space_blocks (Iteration 2) but per unit, so suppliers
-- can block their own units (prayer, maintenance, off days).
-- ============================================================

CREATE TABLE IF NOT EXISTS unit_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES space_units(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_hour SMALLINT NOT NULL,
  end_hour SMALLINT NOT NULL,
  reason TEXT,
  created_by_supplier_id UUID REFERENCES suppliers(id),
  created_by_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT valid_block_hours CHECK (
    start_hour >= 0 AND start_hour < 24 AND
    end_hour > start_hour AND end_hour <= 24
  )
);

CREATE INDEX IF NOT EXISTS idx_unit_blocks_unit_date ON unit_blocks(unit_id, block_date);

-- ============================================================
-- TRIGGERS — auto-update updated_at on all tables
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS space_units_updated_at ON space_units;
CREATE TRIGGER space_units_updated_at BEFORE UPDATE ON space_units
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS unit_bookings_updated_at ON unit_bookings;
CREATE TRIGGER unit_bookings_updated_at BEFORE UPDATE ON unit_bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE unit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_blocks ENABLE ROW LEVEL SECURITY;

-- Service role: full access on everything (used by server-side API routes)
DROP POLICY IF EXISTS "service_all_categories" ON unit_categories;
CREATE POLICY "service_all_categories" ON unit_categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_suppliers" ON suppliers;
CREATE POLICY "service_all_suppliers" ON suppliers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_units" ON space_units;
CREATE POLICY "service_all_units" ON space_units
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_bookings" ON unit_bookings;
CREATE POLICY "service_all_bookings" ON unit_bookings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_all_blocks" ON unit_blocks;
CREATE POLICY "service_all_blocks" ON unit_blocks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public reads for browsing (anon can list active units of approved suppliers)
DROP POLICY IF EXISTS "public_read_categories" ON unit_categories;
CREATE POLICY "public_read_categories" ON unit_categories
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
