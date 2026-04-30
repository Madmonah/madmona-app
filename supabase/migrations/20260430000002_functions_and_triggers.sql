-- ==========================================================================
-- Madmona — Functions & Triggers (IDEMPOTENT VERSION)
-- Run AFTER 20260430000001_initial_schema.sql
-- Safe to run multiple times.
-- ==========================================================================

-- ============================================================================
-- 1. updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_marketplace_suppliers_updated_at ON marketplace_suppliers;
CREATE TRIGGER trg_marketplace_suppliers_updated_at BEFORE UPDATE ON marketplace_suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_marketplace_bookings_updated_at ON marketplace_bookings;
CREATE TRIGGER trg_marketplace_bookings_updated_at BEFORE UPDATE ON marketplace_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_marketplace_payments_updated_at ON marketplace_payments;
CREATE TRIGGER trg_marketplace_payments_updated_at BEFORE UPDATE ON marketplace_payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews;
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 2. Auto-create profile when auth.users row is inserted
-- ============================================================================
-- Inserts into profiles AND legacy users table (if exists, to keep app working).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- New profiles table
  INSERT INTO public.profiles (id, phone, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Legacy users table (if exists)
  BEGIN
    INSERT INTO public.users (id, phone_number, email, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
      NEW.email,
      NEW.raw_user_meta_data->>'full_name'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 3. RLS helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_supplier(supplier_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_suppliers
    WHERE id = supplier_uuid AND profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_listing(listing_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings l
    JOIN public.marketplace_suppliers s ON s.id = l.supplier_id
    WHERE l.id = listing_uuid AND s.profile_id = auth.uid()
  );
$$;

-- ============================================================================
-- 4. Booking reference code generator
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  candidate TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.reference_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    candidate := 'MM-' || (
      SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                               (random() * 31)::int + 1, 1), '')
      FROM generate_series(1, 6)
    );

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM marketplace_bookings WHERE reference_code = candidate
    );

    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique booking reference';
    END IF;
  END LOOP;

  NEW.reference_code := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_bookings_reference ON marketplace_bookings;
CREATE TRIGGER trg_marketplace_bookings_reference
  BEFORE INSERT ON marketplace_bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_reference();

-- ============================================================================
-- 5. Prevent double-booking
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_booking_conflict()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'active', 'pending_payment') THEN
    IF EXISTS (
      SELECT 1 FROM marketplace_bookings
      WHERE listing_id = NEW.listing_id
        AND id != NEW.id
        AND status IN ('confirmed', 'active', 'pending_payment')
        AND tstzrange(start_at, end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)')
    ) THEN
      RAISE EXCEPTION 'Booking conflict: this time slot is already booked'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_bookings_conflict_check ON marketplace_bookings;
CREATE TRIGGER trg_marketplace_bookings_conflict_check
  BEFORE INSERT OR UPDATE OF start_at, end_at, status ON marketplace_bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_conflict();

-- ============================================================================
-- 6. Auto-update denormalized stats
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_supplier_listings_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE marketplace_suppliers SET listings_count = (
      SELECT COUNT(*) FROM listings
      WHERE supplier_id = OLD.supplier_id AND status = 'published'
    ) WHERE id = OLD.supplier_id;
    RETURN OLD;
  ELSE
    UPDATE marketplace_suppliers SET listings_count = (
      SELECT COUNT(*) FROM listings
      WHERE supplier_id = NEW.supplier_id AND status = 'published'
    ) WHERE id = NEW.supplier_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_supplier_count ON listings;
CREATE TRIGGER trg_listings_supplier_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON listings
  FOR EACH ROW EXECUTE FUNCTION refresh_supplier_listings_count();

CREATE OR REPLACE FUNCTION public.refresh_listing_bookings_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE listings SET bookings_count = (
    SELECT COUNT(*) FROM marketplace_bookings
    WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id)
      AND status IN ('confirmed', 'active', 'completed')
  ) WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_bookings_listing_count ON marketplace_bookings;
CREATE TRIGGER trg_marketplace_bookings_listing_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON marketplace_bookings
  FOR EACH ROW EXECUTE FUNCTION refresh_listing_bookings_count();

CREATE OR REPLACE FUNCTION public.refresh_review_aggregates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_listing UUID := COALESCE(NEW.listing_id, OLD.listing_id);
  target_supplier UUID := COALESCE(NEW.supplier_id, OLD.supplier_id);
BEGIN
  UPDATE listings SET
    rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews
              WHERE listing_id = target_listing AND is_published = TRUE),
    reviews_count = (SELECT COUNT(*) FROM reviews
                     WHERE listing_id = target_listing AND is_published = TRUE)
  WHERE id = target_listing;

  UPDATE marketplace_suppliers SET
    rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews
              WHERE supplier_id = target_supplier AND is_published = TRUE),
    reviews_count = (SELECT COUNT(*) FROM reviews
                     WHERE supplier_id = target_supplier AND is_published = TRUE)
  WHERE id = target_supplier;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_aggregates ON reviews;
CREATE TRIGGER trg_reviews_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_review_aggregates();

-- ============================================================================
-- 7. Single primary photo per listing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_single_primary_photo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE listing_photos
    SET is_primary = FALSE
    WHERE listing_id = NEW.listing_id
      AND id != NEW.id
      AND is_primary = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_photos_primary ON listing_photos;
CREATE TRIGGER trg_listing_photos_primary
  AFTER INSERT OR UPDATE OF is_primary ON listing_photos
  FOR EACH ROW WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION enforce_single_primary_photo();

-- ============================================================================
-- DONE. Next: 20260430000003_rls_policies.sql
-- ============================================================================

SELECT 'Functions & triggers created' AS status;
