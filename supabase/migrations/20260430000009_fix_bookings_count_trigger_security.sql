-- ==========================================================================
-- Madmona — Fix booking insert RLS for customers
-- 
-- Issue: customers couldn't book any listing. INSERT into marketplace_bookings
-- succeeded under RLS, but the AFTER INSERT trigger refresh_listing_bookings_count
-- ran an UPDATE on the `listings` table. That UPDATE was evaluated under the
-- customer's RLS — and customers don't have UPDATE permission on listings they
-- don't own — so the trigger failed with:
-- 
--   "new row violates row-level security policy for table listings"
-- 
-- Admins didn't hit this because of `listings_admin_all` (FOR ALL).
-- 
-- Fix: add SECURITY DEFINER to the trigger functions that touch other tables
-- on behalf of the user. They become callable from any user's transaction
-- without inheriting the user's RLS, but only do exactly what the trigger
-- needs (refresh denormalized counters). Also pin search_path for safety.
-- 
-- This applies to:
--   * refresh_listing_bookings_count   (AFTER booking → UPDATE listings)
--   * refresh_supplier_listings_count  (AFTER listing → UPDATE marketplace_suppliers)
--   * refresh_review_aggregates        (AFTER review → UPDATE listings + suppliers)
--   * enforce_single_primary_photo     (AFTER photo → UPDATE other photos)
-- ==========================================================================

-- 1) The actual bug fix: bookings → listings count refresh
CREATE OR REPLACE FUNCTION public.refresh_listing_bookings_count()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE listings SET bookings_count = (
    SELECT COUNT(*) FROM marketplace_bookings
    WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id)
      AND status IN ('confirmed', 'active', 'completed')
  ) WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2) Same hardening for related trigger functions that update sibling tables.
--    Even if not blocking today, they would break the moment we let other
--    user roles touch listings/reviews.

CREATE OR REPLACE FUNCTION public.refresh_supplier_listings_count()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.refresh_review_aggregates()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.enforce_single_primary_photo()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
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

SELECT 'Trigger functions hardened with SECURITY DEFINER' AS status;
