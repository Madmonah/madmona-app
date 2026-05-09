-- ==========================================================================
-- Madmona — RLS Policies (IDEMPOTENT VERSION)
-- Run AFTER 20260430000002_functions_and_triggers.sql
-- ==========================================================================

-- ENABLE RLS (idempotent — no-op if already enabled)
ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_suppliers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_values          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability            ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_bookings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites               ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
CREATE POLICY "profiles_self_read"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all"
  ON profiles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- MARKETPLACE_SUPPLIERS
-- ============================================================================

DROP POLICY IF EXISTS "marketplace_suppliers_public_read_approved" ON marketplace_suppliers;
CREATE POLICY "marketplace_suppliers_public_read_approved"
  ON marketplace_suppliers FOR SELECT
  USING (kyc_status = 'approved');

DROP POLICY IF EXISTS "marketplace_suppliers_owner_read" ON marketplace_suppliers;
CREATE POLICY "marketplace_suppliers_owner_read"
  ON marketplace_suppliers FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "marketplace_suppliers_self_apply" ON marketplace_suppliers;
CREATE POLICY "marketplace_suppliers_self_apply"
  ON marketplace_suppliers FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND kyc_status = 'pending');

DROP POLICY IF EXISTS "marketplace_suppliers_owner_update" ON marketplace_suppliers;
CREATE POLICY "marketplace_suppliers_owner_update"
  ON marketplace_suppliers FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "marketplace_suppliers_admin_all" ON marketplace_suppliers;
CREATE POLICY "marketplace_suppliers_admin_all"
  ON marketplace_suppliers FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- CATEGORIES & ATTRIBUTES
-- ============================================================================

DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read"
  ON categories FOR SELECT
  USING (is_active = TRUE OR is_admin());

DROP POLICY IF EXISTS "categories_admin_write" ON categories;
CREATE POLICY "categories_admin_write"
  ON categories FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "attributes_public_read" ON attributes;
CREATE POLICY "attributes_public_read"
  ON attributes FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "attributes_admin_write" ON attributes;
CREATE POLICY "attributes_admin_write"
  ON attributes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- LISTINGS
-- ============================================================================

DROP POLICY IF EXISTS "listings_public_read_published" ON listings;
CREATE POLICY "listings_public_read_published"
  ON listings FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "listings_owner_read" ON listings;
CREATE POLICY "listings_owner_read"
  ON listings FOR SELECT
  USING (owns_supplier(supplier_id));

DROP POLICY IF EXISTS "listings_owner_insert" ON listings;
CREATE POLICY "listings_owner_insert"
  ON listings FOR INSERT
  WITH CHECK (
    owns_supplier(supplier_id)
    AND (
      status = 'draft'
      OR EXISTS (SELECT 1 FROM marketplace_suppliers WHERE id = supplier_id AND kyc_status = 'approved')
    )
  );

DROP POLICY IF EXISTS "listings_owner_update" ON listings;
CREATE POLICY "listings_owner_update"
  ON listings FOR UPDATE
  USING (owns_supplier(supplier_id))
  WITH CHECK (owns_supplier(supplier_id));

DROP POLICY IF EXISTS "listings_owner_delete" ON listings;
CREATE POLICY "listings_owner_delete"
  ON listings FOR DELETE
  USING (owns_supplier(supplier_id));

DROP POLICY IF EXISTS "listings_admin_all" ON listings;
CREATE POLICY "listings_admin_all"
  ON listings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- LISTING PHOTOS
-- ============================================================================

DROP POLICY IF EXISTS "listing_photos_public_read" ON listing_photos;
CREATE POLICY "listing_photos_public_read"
  ON listing_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status = 'published'));

DROP POLICY IF EXISTS "listing_photos_owner_all" ON listing_photos;
CREATE POLICY "listing_photos_owner_all"
  ON listing_photos FOR ALL
  USING (owns_listing(listing_id))
  WITH CHECK (owns_listing(listing_id));

DROP POLICY IF EXISTS "listing_photos_admin_all" ON listing_photos;
CREATE POLICY "listing_photos_admin_all"
  ON listing_photos FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- LISTING VALUES
-- ============================================================================

DROP POLICY IF EXISTS "listing_values_public_read" ON listing_values;
CREATE POLICY "listing_values_public_read"
  ON listing_values FOR SELECT
  USING (EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status = 'published'));

DROP POLICY IF EXISTS "listing_values_owner_all" ON listing_values;
CREATE POLICY "listing_values_owner_all"
  ON listing_values FOR ALL
  USING (owns_listing(listing_id))
  WITH CHECK (owns_listing(listing_id));

DROP POLICY IF EXISTS "listing_values_admin_all" ON listing_values;
CREATE POLICY "listing_values_admin_all"
  ON listing_values FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- PRICING RULES
-- ============================================================================

DROP POLICY IF EXISTS "pricing_rules_public_read" ON pricing_rules;
CREATE POLICY "pricing_rules_public_read"
  ON pricing_rules FOR SELECT
  USING (
    is_active = TRUE
    AND EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status = 'published')
  );

DROP POLICY IF EXISTS "pricing_rules_owner_all" ON pricing_rules;
CREATE POLICY "pricing_rules_owner_all"
  ON pricing_rules FOR ALL
  USING (owns_listing(listing_id))
  WITH CHECK (owns_listing(listing_id));

DROP POLICY IF EXISTS "pricing_rules_admin_all" ON pricing_rules;
CREATE POLICY "pricing_rules_admin_all"
  ON pricing_rules FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- AVAILABILITY
-- ============================================================================

DROP POLICY IF EXISTS "availability_public_read" ON availability;
CREATE POLICY "availability_public_read"
  ON availability FOR SELECT
  USING (EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status = 'published'));

DROP POLICY IF EXISTS "availability_owner_all" ON availability;
CREATE POLICY "availability_owner_all"
  ON availability FOR ALL
  USING (owns_listing(listing_id))
  WITH CHECK (owns_listing(listing_id));

DROP POLICY IF EXISTS "availability_admin_all" ON availability;
CREATE POLICY "availability_admin_all"
  ON availability FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- MARKETPLACE_BOOKINGS
-- ============================================================================

DROP POLICY IF EXISTS "marketplace_bookings_customer_read" ON marketplace_bookings;
CREATE POLICY "marketplace_bookings_customer_read"
  ON marketplace_bookings FOR SELECT
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "marketplace_bookings_supplier_read" ON marketplace_bookings;
CREATE POLICY "marketplace_bookings_supplier_read"
  ON marketplace_bookings FOR SELECT
  USING (owns_supplier(supplier_id));

DROP POLICY IF EXISTS "marketplace_bookings_customer_insert" ON marketplace_bookings;
CREATE POLICY "marketplace_bookings_customer_insert"
  ON marketplace_bookings FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status = 'published')
  );

DROP POLICY IF EXISTS "marketplace_bookings_customer_update" ON marketplace_bookings;
CREATE POLICY "marketplace_bookings_customer_update"
  ON marketplace_bookings FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "marketplace_bookings_supplier_update" ON marketplace_bookings;
CREATE POLICY "marketplace_bookings_supplier_update"
  ON marketplace_bookings FOR UPDATE
  USING (owns_supplier(supplier_id))
  WITH CHECK (owns_supplier(supplier_id));

DROP POLICY IF EXISTS "marketplace_bookings_admin_all" ON marketplace_bookings;
CREATE POLICY "marketplace_bookings_admin_all"
  ON marketplace_bookings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- MARKETPLACE_PAYMENTS
-- ============================================================================

DROP POLICY IF EXISTS "marketplace_payments_customer_read" ON marketplace_payments;
CREATE POLICY "marketplace_payments_customer_read"
  ON marketplace_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketplace_bookings WHERE id = booking_id AND customer_id = auth.uid()
  ));

DROP POLICY IF EXISTS "marketplace_payments_supplier_read" ON marketplace_payments;
CREATE POLICY "marketplace_payments_supplier_read"
  ON marketplace_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketplace_bookings WHERE id = booking_id AND owns_supplier(supplier_id)
  ));

DROP POLICY IF EXISTS "marketplace_payments_admin_all" ON marketplace_payments;
CREATE POLICY "marketplace_payments_admin_all"
  ON marketplace_payments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- REVIEWS
-- ============================================================================

DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read"
  ON reviews FOR SELECT
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "reviews_customer_read_own" ON reviews;
CREATE POLICY "reviews_customer_read_own"
  ON reviews FOR SELECT
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "reviews_customer_insert" ON reviews;
CREATE POLICY "reviews_customer_insert"
  ON reviews FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM marketplace_bookings
      WHERE id = booking_id
        AND customer_id = auth.uid()
        AND status = 'completed'
    )
  );

DROP POLICY IF EXISTS "reviews_customer_update_own" ON reviews;
CREATE POLICY "reviews_customer_update_own"
  ON reviews FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "reviews_supplier_respond" ON reviews;
CREATE POLICY "reviews_supplier_respond"
  ON reviews FOR UPDATE
  USING (owns_supplier(supplier_id))
  WITH CHECK (owns_supplier(supplier_id));

DROP POLICY IF EXISTS "reviews_admin_all" ON reviews;
CREATE POLICY "reviews_admin_all"
  ON reviews FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- FAVORITES
-- ============================================================================

DROP POLICY IF EXISTS "favorites_self_all" ON favorites;
CREATE POLICY "favorites_self_all"
  ON favorites FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- ============================================================================
-- DONE. Next: 20260430000004_seed_data.sql
-- ============================================================================

SELECT 'RLS policies applied' AS status;
