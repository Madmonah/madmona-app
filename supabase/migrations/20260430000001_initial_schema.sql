-- ==========================================================================
-- Madmona Universal Rental Marketplace — Initial Schema
-- Phase 0: Foundation (IDEMPOTENT VERSION)
-- ==========================================================================
-- Safe to run multiple times. All CREATE TYPE wrapped in DO blocks that
-- skip if the type already exists. All CREATE TABLE uses IF NOT EXISTS.
-- ==========================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. ENUMS  (idempotent — skip if exists)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'supplier', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_kyc_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('draft', 'pending_review', 'published', 'paused', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mp_booking_status AS ENUM (
    'pending_payment', 'confirmed', 'active', 'completed', 'cancelled', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mp_payment_status AS ENUM (
    'pending', 'authorized', 'captured', 'failed', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attribute_type AS ENUM (
    'text', 'number', 'boolean', 'select', 'multi_select', 'date', 'file'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pricing_period AS ENUM ('hourly', 'daily', 'weekly', 'monthly', 'per_event');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE availability_status AS ENUM ('available', 'booked', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 3. PROFILES (extends auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  preferred_language TEXT NOT NULL DEFAULT 'ar',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================================
-- 4. MARKETPLACE_SUPPLIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_name_en TEXT,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  national_id TEXT,
  commercial_registration TEXT,
  tax_id TEXT,
  kyc_status supplier_kyc_status NOT NULL DEFAULT 'pending',
  kyc_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  kyc_reviewed_by UUID REFERENCES profiles(id),
  kyc_reviewed_at TIMESTAMPTZ,
  kyc_rejection_reason TEXT,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  rating DECIMAL(3, 2) CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER NOT NULL DEFAULT 0,
  listings_count INTEGER NOT NULL DEFAULT 0,
  bookings_count INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_suppliers_kyc_status ON marketplace_suppliers(kyc_status);

-- ============================================================================
-- 5. CATEGORIES (hierarchical)
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ============================================================================
-- 6. ATTRIBUTES (dynamic fields per category)
-- ============================================================================

CREATE TABLE IF NOT EXISTS attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  field_key TEXT NOT NULL,
  field_type attribute_type NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit TEXT,
  placeholder TEXT,
  help_text TEXT,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_filterable BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_attributes_category ON attributes(category_id);

-- ============================================================================
-- 7. LISTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES marketplace_suppliers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  status listing_status NOT NULL DEFAULT 'draft',
  rejection_reason TEXT,
  country TEXT NOT NULL DEFAULT 'EG',
  city TEXT,
  district TEXT,
  address TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  min_booking_hours INTEGER,
  max_booking_hours INTEGER,
  advance_booking_days INTEGER NOT NULL DEFAULT 90,
  cancellation_hours INTEGER NOT NULL DEFAULT 24,
  auto_accept_bookings BOOLEAN NOT NULL DEFAULT FALSE,
  requires_security_deposit BOOLEAN NOT NULL DEFAULT FALSE,
  security_deposit_amount DECIMAL(12, 2),
  rating DECIMAL(3, 2) CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER NOT NULL DEFAULT 0,
  bookings_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listings_supplier ON listings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(latitude, longitude) WHERE status = 'published';

-- ============================================================================
-- 8. LISTING PHOTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS listing_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_photos_listing ON listing_photos(listing_id);

-- ============================================================================
-- 9. LISTING VALUES (EAV)
-- ============================================================================

CREATE TABLE IF NOT EXISTS listing_values (
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  PRIMARY KEY (listing_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_values_attribute ON listing_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_listing_values_value_gin ON listing_values USING GIN (value);

-- ============================================================================
-- 10. PRICING RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  period_type pricing_period NOT NULL,
  period_count INTEGER NOT NULL DEFAULT 1 CHECK (period_count > 0),
  price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'EGP',
  min_periods INTEGER CHECK (min_periods IS NULL OR min_periods > 0),
  max_periods INTEGER CHECK (max_periods IS NULL OR max_periods > 0),
  label_ar TEXT,
  label_en TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_listing ON pricing_rules(listing_id) WHERE is_active = TRUE;

-- ============================================================================
-- 11. AVAILABILITY
-- ============================================================================

CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status availability_status NOT NULL DEFAULT 'available',
  booking_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_availability_listing_time ON availability(listing_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_availability_booking ON availability(booking_id) WHERE booking_id IS NOT NULL;

-- ============================================================================
-- 12. MARKETPLACE_BOOKINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_code TEXT UNIQUE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  supplier_id UUID NOT NULL REFERENCES marketplace_suppliers(id),
  pricing_rule_id UUID REFERENCES pricing_rules(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  base_amount DECIMAL(12, 2) NOT NULL CHECK (base_amount >= 0),
  commission_rate DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL CHECK (commission_amount >= 0),
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
  supplier_payout DECIMAL(12, 2) NOT NULL CHECK (supplier_payout >= 0),
  currency TEXT NOT NULL DEFAULT 'EGP',
  status mp_booking_status NOT NULL DEFAULT 'pending_payment',
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMPTZ,
  customer_notes TEXT,
  supplier_notes TEXT,
  admin_notes TEXT,
  confirmed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_mp_bookings_customer ON marketplace_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_mp_bookings_supplier ON marketplace_bookings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_mp_bookings_listing ON marketplace_bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_mp_bookings_status ON marketplace_bookings(status);
CREATE INDEX IF NOT EXISTS idx_mp_bookings_time ON marketplace_bookings(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_mp_bookings_reference ON marketplace_bookings(reference_code);

-- Add the deferred FK from availability to marketplace_bookings (idempotent)
DO $$ BEGIN
  ALTER TABLE availability
    ADD CONSTRAINT fk_availability_booking
    FOREIGN KEY (booking_id) REFERENCES marketplace_bookings(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 13. MARKETPLACE_PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketplace_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES marketplace_bookings(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EGP',
  status mp_payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  provider TEXT,
  provider_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_payments_booking ON marketplace_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_mp_payments_status ON marketplace_payments(status);
CREATE INDEX IF NOT EXISTS idx_mp_payments_provider_ref ON marketplace_payments(provider_reference);

-- ============================================================================
-- 14. REVIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES marketplace_bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  supplier_id UUID NOT NULL REFERENCES marketplace_suppliers(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  supplier_response TEXT,
  supplier_responded_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_supplier ON reviews(supplier_id) WHERE is_published = TRUE;

-- ============================================================================
-- 15. FAVORITES
-- ============================================================================

CREATE TABLE IF NOT EXISTS favorites (
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (customer_id, listing_id)
);

-- ============================================================================
-- VERIFICATION (returns table count — should be 13)
-- ============================================================================

SELECT COUNT(*) AS marketplace_tables_created
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'marketplace_suppliers', 'categories', 'attributes',
    'listings', 'listing_photos', 'listing_values', 'pricing_rules',
    'availability', 'marketplace_bookings', 'marketplace_payments',
    'reviews', 'favorites'
  );
