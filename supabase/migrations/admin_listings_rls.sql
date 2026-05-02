-- ============================================================================
-- Admin Full Control Over Listings
-- ============================================================================
-- This migration ensures admin role has full CRUD permissions on listings
-- regardless of supplier ownership.
--
-- Run this once in Supabase SQL Editor.
-- ============================================================================

-- 1. Drop any conflicting old policies (idempotent)
DROP POLICY IF EXISTS "admins_full_listings" ON listings;
DROP POLICY IF EXISTS "admins_delete_listings" ON listings;
DROP POLICY IF EXISTS "admins_update_listings" ON listings;
DROP POLICY IF EXISTS "admins_view_all_listings" ON listings;

-- 2. Admin can view ALL listings (any status, any supplier)
CREATE POLICY "admins_view_all_listings"
  ON listings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 3. Admin can UPDATE any listing (force-publish, change status, etc.)
CREATE POLICY "admins_update_listings"
  ON listings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 4. Admin can DELETE any listing
CREATE POLICY "admins_delete_listings"
  ON listings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 5. Same for listing_photos (cascade should handle it, but explicit is better)
DROP POLICY IF EXISTS "admins_full_listing_photos" ON listing_photos;
CREATE POLICY "admins_full_listing_photos"
  ON listing_photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 6. Same for pricing_rules
DROP POLICY IF EXISTS "admins_full_pricing_rules" ON pricing_rules;
CREATE POLICY "admins_full_pricing_rules"
  ON pricing_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 7. Same for listing_values (attributes)
DROP POLICY IF EXISTS "admins_full_listing_values" ON listing_values;
CREATE POLICY "admins_full_listing_values"
  ON listing_values
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 8. Allow admin to manage marketplace_suppliers (in case needed)
DROP POLICY IF EXISTS "admins_manage_suppliers" ON marketplace_suppliers;
CREATE POLICY "admins_manage_suppliers"
  ON marketplace_suppliers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Verification queries (run these to confirm policies are in place):
-- ============================================================================
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('listings', 'listing_photos', 'pricing_rules', 'listing_values', 'marketplace_suppliers')
--   AND policyname LIKE 'admins_%'
-- ORDER BY tablename, cmd;
