-- ============================================================================
-- Madmona Migration: ID Verification System
-- Date: 2026-05-06
-- 
-- IMPORTANT: Run this SQL in Supabase SQL Editor BEFORE deploying the new code.
-- The booking page and marketplace browse page reference these new columns.
--
-- Adds:
--   1. listings.requires_id_verification (per-listing flag)
--   2. profiles.national_id (optional ID stored on user profile)
--   3. marketplace_suppliers.account_type (individual / business)
--   4. marketplace_bookings.id_verification_status (booking approval flow)
--   5. marketplace_bookings.customer_national_id (snapshot of ID at booking time)
-- ============================================================================

-- 1. Add requires_id_verification to listings
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS requires_id_verification BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN listings.requires_id_verification IS
  'If TRUE, customer must provide national_id and supplier must approve booking before it confirms';

-- 2. Add national_id to profiles (for both customers and suppliers)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS national_id TEXT;

COMMENT ON COLUMN profiles.national_id IS
  'Optional 14-digit Egyptian national ID. Speeds up booking for ID-verified listings.';

-- 3. Add account_type to marketplace_suppliers
ALTER TABLE marketplace_suppliers
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'business'
  CHECK (account_type IN ('individual', 'business'));

COMMENT ON COLUMN marketplace_suppliers.account_type IS
  'individual = registered as a person; business = registered as a company';

-- 4. Add id_verification_status to marketplace_bookings
ALTER TABLE marketplace_bookings
  ADD COLUMN IF NOT EXISTS id_verification_status TEXT
  DEFAULT 'not_required'
  CHECK (id_verification_status IN ('not_required', 'pending', 'approved', 'rejected'));

COMMENT ON COLUMN marketplace_bookings.id_verification_status IS
  'Tracks ID verification step. not_required = listing did not need ID; pending/approved/rejected for listings that did.';

-- 5. Snapshot customer national_id at booking time
ALTER TABLE marketplace_bookings
  ADD COLUMN IF NOT EXISTS customer_national_id TEXT;

COMMENT ON COLUMN marketplace_bookings.customer_national_id IS
  'Snapshot of customer national_id at the moment of booking. Visible to supplier for verification.';

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_requires_id_verification
  ON listings(requires_id_verification)
  WHERE requires_id_verification = TRUE;

CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_id_verification_status
  ON marketplace_bookings(id_verification_status)
  WHERE id_verification_status = 'pending';

-- ============================================================================
-- VERIFICATION QUERIES (run after migration to confirm)
-- ============================================================================

SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE
  (table_name = 'listings' AND column_name = 'requires_id_verification')
  OR (table_name = 'profiles' AND column_name = 'national_id')
  OR (table_name = 'marketplace_suppliers' AND column_name = 'account_type')
  OR (table_name = 'marketplace_bookings' AND column_name IN ('id_verification_status', 'customer_national_id'))
ORDER BY table_name, column_name;
