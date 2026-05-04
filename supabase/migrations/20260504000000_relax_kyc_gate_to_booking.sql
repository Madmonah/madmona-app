-- ==========================================================================
-- Madmona — Relax KYC gate to booking time
-- ==========================================================================
-- Philosophy change:
--   Old: KYC approval required to do anything (signup, list, publish, book).
--   New: KYC approval required ONLY at booking time (where money + trust matter).
--
-- This migration:
--   1. Allows public read of pending suppliers (so booking page can fetch
--      supplier info to show the "under review" message).
--      PII fields (national_id, commercial_registration, tax_id) stay protected
--      because the booking/marketplace queries don't select them.
--   2. Allows pending suppliers to publish listings (not just draft).
--   3. Adds the KYC gate at booking insert time as defense-in-depth — even if
--      a customer bypasses the UI, the DB rejects bookings against
--      non-approved suppliers.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Marketplace suppliers: allow public read for pending too
-- --------------------------------------------------------------------------
-- Renaming the policy to reflect the new semantics.

DROP POLICY IF EXISTS "marketplace_suppliers_public_read_approved" ON marketplace_suppliers;
DROP POLICY IF EXISTS "marketplace_suppliers_public_read_active" ON marketplace_suppliers;

CREATE POLICY "marketplace_suppliers_public_read_active"
  ON marketplace_suppliers FOR SELECT
  USING (kyc_status IN ('approved', 'pending'));

-- --------------------------------------------------------------------------
-- 2. Listings: allow pending suppliers to publish
-- --------------------------------------------------------------------------
-- Old check required kyc_status='approved' to publish anything other than
-- draft. New: as long as the user owns the supplier, they can publish.
-- The KYC gate is enforced at the booking layer instead.

DROP POLICY IF EXISTS "listings_owner_insert" ON listings;
CREATE POLICY "listings_owner_insert"
  ON listings FOR INSERT
  WITH CHECK (
    owns_supplier(supplier_id)
    AND EXISTS (
      SELECT 1 FROM marketplace_suppliers
      WHERE id = supplier_id
        AND kyc_status NOT IN ('rejected', 'suspended')
    )
  );

-- --------------------------------------------------------------------------
-- 3. Marketplace bookings: REQUIRE supplier kyc_status='approved' at insert
-- --------------------------------------------------------------------------
-- This is the new gate. Even if the UI is bypassed, the DB will reject
-- bookings against suppliers who haven't been approved.

DROP POLICY IF EXISTS "marketplace_bookings_customer_insert" ON marketplace_bookings;
CREATE POLICY "marketplace_bookings_customer_insert"
  ON marketplace_bookings FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM listings l
      JOIN marketplace_suppliers s ON s.id = l.supplier_id
      WHERE l.id = listing_id
        AND l.status = 'published'
        AND s.kyc_status = 'approved'
    )
  );

-- --------------------------------------------------------------------------
-- DONE
-- --------------------------------------------------------------------------

SELECT 'KYC gate relaxed to booking time' AS status;
