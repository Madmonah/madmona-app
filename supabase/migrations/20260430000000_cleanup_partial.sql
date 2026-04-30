-- ==========================================================================
-- Madmona — CLEANUP from previous (failed) migration attempt
-- ==========================================================================
-- Only run this if you previously tried to run the broken migrations
-- and got a conflict error (e.g. "type booking_status already exists").
--
-- This script drops ONLY the marketplace items that may have been partially
-- created. It does NOT touch your existing tables (users, spaces, bookings,
-- pricing_plans, suppliers, space_units, unit_bookings, etc.) — those are
-- protected by the new naming scheme.
--
-- Safe to run multiple times.
-- ==========================================================================

-- Drop triggers on auth.users (added by my version)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop my functions (will only drop if they exist)
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.owns_supplier(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.owns_listing(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.generate_booking_reference() CASCADE;
DROP FUNCTION IF EXISTS public.check_booking_conflict() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_supplier_listings_count() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_listing_bookings_count() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_review_aggregates() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_single_primary_photo() CASCADE;

-- Drop my tables (CASCADE handles dependencies)
-- Order: leaves first, then up the dependency tree
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS marketplace_payments CASCADE;
DROP TABLE IF EXISTS marketplace_bookings CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;
DROP TABLE IF EXISTS listing_values CASCADE;
DROP TABLE IF EXISTS listing_photos CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS attributes CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS marketplace_suppliers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop my ENUM types
-- (Won't touch the existing booking_status / payment_status — those are yours)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS supplier_kyc_status CASCADE;
DROP TYPE IF EXISTS listing_status CASCADE;
DROP TYPE IF EXISTS mp_booking_status CASCADE;
DROP TYPE IF EXISTS mp_payment_status CASCADE;
DROP TYPE IF EXISTS attribute_type CASCADE;
DROP TYPE IF EXISTS pricing_period CASCADE;
DROP TYPE IF EXISTS availability_status CASCADE;

-- ============================================================================
-- DONE. Now run the migrations in order:
--   1. 20260430000001_initial_schema.sql
--   2. 20260430000002_functions_and_triggers.sql
--   3. 20260430000003_rls_policies.sql
--   4. 20260430000004_seed_data.sql
-- ============================================================================

SELECT 'Cleanup complete. Now run 20260430000001_initial_schema.sql' AS status;
